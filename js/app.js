
import { API } from './api.js';
import { ANIMALS } from './animals.js';
import { Storage, seededShuffle, stringToSeed, formatTime } from './utils.js';
import { Views } from './views.js';
import { CONFIG } from './config.js';

// Global App State
const State = {
    questions: [],
    // Player
    player: {
        sessionCode: null,
        teamId: null,
        teamToken: null,
        info: null, // { animalId, teamName... }
        questionsOrder: [], // shuffled indices
        currentQIndex: 0,
        currentAttempts: 0,
        hintsUsedForQ: 0,
        tempShuffleMatch: null // store shuffled indices for match question
    },
    // Admin
    admin: {
        session: null,
        teams: []
    }
};

const Root = document.getElementById('root');
let pollInterval = null;

// Dyslexia Toggle
document.getElementById('dyslexia-toggle').onclick = () => {
    document.body.classList.toggle('dyslexia-mode');
};

// Router
window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', init);

async function init() {
    // Render Footer
    const footer = document.getElementById('version-footer');
    if (footer) {
        const year = new Date().getFullYear();
        footer.textContent = `Copyright Bibliotheek Noordwest Veluwe ${year} - Versie ${CONFIG.APP_VERSION}`;
    }

    // Check for secret in URL
    const params = new URLSearchParams(window.location.search);
    const secret = params.get('secret');
    if (secret) {
        CONFIG.SECRET = secret;
    }

    // Load Questions
    try {
        const res = await fetch('content/questions.json');
        const data = await res.json();
        State.questions = data.questions;
    } catch (e) {
        console.error("Failed to load questions", e);
        Root.innerHTML = `<div class="screen"><div class="card"><h1>Fout</h1><p>Kon vragen niet laden. Controleer content/questions.json</p></div></div>`;
        return;
    }

    handleRoute();
}

function handleRoute() {
    // Clear polling
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = null;

    const hash = window.location.hash;
    if (hash === '#admin') {
        startAdmin();
    } else if (hash === '#player') {
        startPlayer();
    } else {
        // Default to player if clear, but show landing if strictly root
        if (hash === '') render(Views.landing());
        else startPlayer();
    }
}

function render(element) {
    Root.innerHTML = '';
    Root.appendChild(element);
}

// ==========================================
// PLAYER CONTROLLER
// ==========================================
async function startPlayer() {
    // Check LocalStorage for resume
    const saved = Storage.get('player_session');

    if (saved && saved.sessionCode && saved.teamId) {
        // Ask to resume
        let displayTeamName = saved.teamName || 'Je Team';
        if (saved.info && saved.info.animalId) {
            const anim = ANIMALS.find(a => a.id == saved.info.animalId);
            if (anim) displayTeamName = anim.teamName;
        }

        render(Views.playerRejoin(displayTeamName,
            () => {
                // Resume
                State.player = { ...State.player, ...saved };
                // Refresh state from API
                enterGameLoop();
            },
            () => {
                // Clear and new
                Storage.remove('player_session');
                startPlayerJoin();
            }
        ));
    } else {
        startPlayerJoin();
    }
}

function startPlayerJoin() {
    render(Views.playerJoin(null, async (code) => {
        // 1. Check if session exists (by fetching state)
        try {
            const session = await API.fetchSessionState(code);
            // Session is assumed running or waiting. 'ended' is deprecated.
            State.player.sessionCode = code;
            startAvatarSelection(code);
        } catch (e) {
            alert("Sessie niet gevonden of netwerkfout.");
        }
    }));
}

async function startAvatarSelection(code) {
    // Fetch taken animals? In API, maybe fetchSessionState returns teams?
    // We assume fetchSessionState returns 'teams' array in our mock/implementation
    let takenIds = [];
    try {
        const session = await API.fetchSessionState(code);
        if (session.teams) {
            takenIds = session.teams.map(t => parseInt(t.animalId));
        }
    } catch (e) { }

    // Render once - handle selection internally in View to avoid re-renders (fixes animation glitch)
    render(Views.playerAvatarSelection(takenIds));

    // Bind confirm
    const btn = document.getElementById('btn-confirm');
    if (btn) {
        btn.onclick = async () => {
            const selectedEl = document.querySelector('.animal-card.selected');
            if (!selectedEl) return;
            const selectedId = parseInt(selectedEl.dataset.id);

            try {
                btn.textContent = "Bezig...";
                btn.disabled = true;

                // Resolve animal details
                const anim = ANIMALS.find(a => a.id == selectedId);
                const tName = anim ? anim.teamName : ("Team " + selectedId);
                const tColor = anim ? anim.color : "#000";

                const team = await API.joinTeam(code, selectedId, {
                    teamName: tName,
                    teamColor: tColor
                });

                // Init Player State
                State.player.teamId = team.teamId;
                State.player.teamToken = team.teamToken;
                State.player.info = team; // color, name, animalId

                // Seeded Shuffle of Questions
                // Seed = sessionCode + teamId
                const seedStr = code + team.teamId;
                const qIndices = State.questions.map((_, i) => i);
                State.player.questionsOrder = seededShuffle(qIndices, stringToSeed(seedStr));
                State.player.currentQIndex = team.progress || 0; // resume progress

                // Save to Storage
                Storage.set('player_session', {
                    sessionCode: code,
                    teamId: team.teamId,
                    teamToken: team.teamToken,
                    teamName: team.teamName,
                    info: team,
                    questionsOrder: State.player.questionsOrder,
                    currentQIndex: State.player.currentQIndex
                });

                enterGameLoop();

            } catch (e) {
                alert("Kon team niet registreren: " + e.message);
                btn.disabled = false;
                renderAvatarScreen(); // refresh taken?
            }
        };
    }
};
renderAvatarScreen();
}

function enterGameLoop() {
    // Start Polling 
    pollInterval = setInterval(async () => {
        try {
            const s = await API.fetchSessionState(State.player.sessionCode);

            // Check paused (Deprecated, but ensuring cleanup)
            // if (s.status === 'paused') { ... } 
            // Removed.



        } catch (e) { }
    }, CONFIG.POLLING_INTERVAL);

    showCurrentQuestion();
}

function showCurrentQuestion(animOverride = null) {
    const p = State.player;
    if (p.currentQIndex >= 12) {
        showFinished();
        return;
    }

    const qIdx = p.questionsOrder[p.currentQIndex];
    const question = State.questions[qIdx]; // Get actual question object

    // Clone question to not mutate global
    const qView = JSON.parse(JSON.stringify(question));

    // Prepare View Data
    // For match: shuffle right side?
    if (qView.type === 'match') {
        // We render pairs as is, but we need to verify logic.
        // Actually, for "Match", users usually see shuffled lists.
        // Let's shuffle the right side for display
        const indices = qView.pairs.map((_, i) => i);
        // We need a stable shuffle for this view so it doesn't jump on re-render?
        // Just random for now
        const shuffled = indices.sort(() => Math.random() - 0.5);
        p.tempShuffleMatch = shuffled;

        // Remap right items
        const originalPairs = [...qView.pairs];
        qView.pairs = originalPairs.map((pair, i) => ({
            left: pair.left,
            right: originalPairs[shuffled[i]].right
        }));
    }

    if (qView.type === 'order') {
        // Shuffle items for display
        // qView.items should be shuffled
        // qView.correctOrder needs to be relative to the *original* items text?
        // Easier: The 'items' in JSON are in some order. The 'correctOrder' is the index order of the sorted list.
        // e.g. items: [B, A, C]. correctOrder: [1, 0, 2] -> A, B, C.
        // We display [B, A, C] initially? Or random?
        // Let's display random.
        const indices = qView.items.map((_, i) => i);
        const shuffled = indices.sort(() => Math.random() - 0.5);
        p.tempShuffleMatch = shuffled; // reuse
        qView.items = shuffled.map(i => question.items[i]);
    }

    const view = Views.playerGame(
        qView,
        `${p.currentQIndex + 1}/12`,
        p.currentAttempts,
        2,
        null, // onAnswer (unused)
        p.info.timePenaltySeconds,
        p.info, // Pass team data for header
        animOverride || (p.currentAttempts > 0 ? 'animate__headShake' : 'animate__fadeInRight') // Default Animation Logic
    );

    render(view);

    // Attach Events
    if (question.type === 'mcq') {
        let selectedIdx = null;
        const btns = view.querySelectorAll('.option-btn');
        const checkBtn = view.querySelector('#btn-submit-mcq');

        btns.forEach(btn => {
            btn.onclick = () => {
                btns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedIdx = parseInt(btn.dataset.idx);
                if (checkBtn) checkBtn.disabled = false;
            };
        });

        if (checkBtn) {
            checkBtn.onclick = () => {
                if (selectedIdx !== null) checkAnswer(selectedIdx, question);
            };
        }
    } else if (question.type === 'match') {
        let selectedLeft = null;
        let selectedRight = null;
        const lefts = view.querySelectorAll('[data-side="left"]');
        const rights = view.querySelectorAll('[data-side="right"]');

        const updateSelection = () => {
            lefts.forEach(el => el.classList.toggle('selected', el.dataset.idx == selectedLeft));
            rights.forEach(el => el.classList.toggle('selected', el.dataset.idx == selectedRight));

            if (selectedLeft !== null && selectedRight !== null) {
                // Check pair immediately or wait for button?
                // Requirement: "Matchen (4 koppels; drag/drop of selecteer links-rechts)"
                // Let's wait for check check button?
                // Actually matching usually implies connecting them.
                // Let's implement: Select Left, Select Right -> Mark as "Connected". 
                // Checks all at end.
            }
        };

        lefts.forEach(el => el.onclick = () => { selectedLeft = el.dataset.idx; updateSelection(); });
        rights.forEach(el => el.onclick = () => { selectedRight = el.dataset.idx; updateSelection(); });

        // Logic for "Check": we need to store the user's connections. 
        // For simplicity: The user must select 1 left and 1 right, then click "Connect"?
        // Or drag & drop.
        // Let's do: Tap Left, Tap Right -> They swap colors/vanish?
        // NO, simpler: The "Check" button verifies the current visual state.
        // But how do we link them?
        // Alternative: Select Left (1), Select Right (1) -> These are a pair.
        // Store in a map: attemptsMap { leftIdx: rightIdx }
        // For this prototype, let's implement: Select Left, Select Right -> Visual line or Color Code?
        // Too complex for no-build Vanilla in 1 file.
        // Simpler Match: "Select the match for [Left Item]" -> Right Item. One by one?
        // Requirement: "4 koppels".
        // Let's do: 4 dropdowns? No.
        // Let's do: The View shows Left column fixed. Right column is buttons. 
        // User clicks Left 1, then Right X. They become "Matched" (green border).
        // User matches all 4, then clicks Check.

        let matches = {}; // leftIdx -> rightDisplayIdx

        lefts.forEach(l => {
            l.onclick = () => {
                // If already matched, undo?
                if (l.classList.contains('matched')) return;
                selectedLeft = l.dataset.idx;
                // clear others
                lefts.forEach(x => x.classList.remove('selected'));
                l.classList.add('selected');
                tryMatch();
            }
        });
        rights.forEach(r => {
            r.onclick = () => {
                if (r.classList.contains('matched')) return;
                selectedRight = r.dataset.idx;
                rights.forEach(x => x.classList.remove('selected'));
                r.classList.add('selected');
                tryMatch();
            }
        });

        function tryMatch() {
            if (selectedLeft !== null && selectedRight !== null) {
                // Create link
                matches[selectedLeft] = selectedRight;
                // Visual feedback
                const l = view.querySelector(`[data-side="left"][data-idx="${selectedLeft}"]`);
                const r = view.querySelector(`[data-side="right"][data-idx="${selectedRight}"]`);
                l.classList.add('matched');
                r.classList.add('matched');
                l.classList.remove('selected');
                r.classList.remove('selected');

                // Reset selection
                selectedLeft = null;
                selectedRight = null;
            }
        }

        view.querySelector('#btn-submit-match').onclick = () => {
            if (Object.keys(matches).length < 4) {
                alert("Verbind alle items!");
                return;
            }
            // Verify
            // matches[leftIdx] = rightDisplayIdx.
            // RightDisplayIdx maps to RealRightIdx via p.tempShuffleMatch.
            // Correct is: leftIdx == RealRightIdx (since pairs are aligned in original JSON).
            // So: matches[i] should be an index k such that tempShuffleMatch[k] == i

            let allCorrect = true;
            for (let i = 0; i < 4; i++) {
                const rightDispIdx = matches[i];
                const realRightIdx = p.tempShuffleMatch[rightDispIdx];
                // Wait. JSON: pairs[0].left matches pairs[0].right.
                // View: Left 0 is pairs[0].left.
                // Right Display 0 is pairs[shuffled[0]].right.
                // If user matched Left 0 with Right Display k. 
                // Then Right Display k is pairs[shuffled[k]].right.
                // So we need pairs[shuffled[k]] to be pairs[0]. 
                // So shuffled[k] == 0.
                if (p.tempShuffleMatch[rightDispIdx] != i) allCorrect = false;
            }

            handleResult(allCorrect, question);
        };
    } else if (question.type === 'order') {
        const list = view.querySelector('#order-list');
        // Render items in current shuffled order (p.tempShuffleMatch = [2, 0, 1, 3])
        // We need to maintain a live list of indices.
        let currentOrder = [...p.tempShuffleMatch];

        const renderOrderParams = () => {
            list.innerHTML = '';
            currentOrder.forEach((originalIdx, i) => {
                const itemText = question.items[originalIdx];
                const el = document.createElement('div');
                el.className = 'draggable-item';
                el.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span>${itemText}</span>
                        <div>
                            <button class="btn-up">▲</button>
                            <button class="btn-down">▼</button>
                        </div>
                    </div>
                `;
                el.querySelector('.btn-up').onclick = () => move(i, -1);
                el.querySelector('.btn-down').onclick = () => move(i, 1);
                if (i === 0) el.querySelector('.btn-up').style.visibility = 'hidden';
                if (i === currentOrder.length - 1) el.querySelector('.btn-down').style.visibility = 'hidden';
                list.appendChild(el);
            });
        };

        const move = (idx, dir) => {
            const newIdx = idx + dir;
            // Swap
            const t = currentOrder[idx];
            currentOrder[idx] = currentOrder[newIdx];
            currentOrder[newIdx] = t;
            renderOrderParams();
        };
        renderOrderParams();

        view.querySelector('#btn-submit-order').onclick = () => {
            // Correct order is in question.correctOrder (array of indices e.g. [1, 0, 2, 3])
            // The user's currentOrder must match correctOrder exactly?
            // correctOrder says: The 1st item should be index 1.
            // currentOrder[0] is index 1?
            // Yes.
            const isCorrect = JSON.stringify(currentOrder) === JSON.stringify(question.correctOrder);
            handleResult(isCorrect, question);
        };
    }

    // Hint
    const btnHint = view.querySelector('#btn-hint');
    if (btnHint) {
        btnHint.onclick = () => {
            if (p.hintsUsedForQ < 3 && p.info.hintsUsed < 3) {
                alert("HINT: " + question.hint);
                p.hintsUsedForQ++;
                p.info.hintsUsed++;
                p.info.timePenaltySeconds += CONFIG.PENALTY_SECONDS;
                // Sync
                API.updateTeam({
                    teamId: p.teamId,
                    teamToken: p.teamToken,
                    sessionCode: p.sessionCode,
                    hintsUsed: p.info.hintsUsed,
                    timePenaltySeconds: p.info.timePenaltySeconds
                });
                // Re-render to update hint count
                showCurrentQuestion('animate__pulse');
            }
        };
    }
}

function checkAnswer(selectedIndex, question) {
    // For MCQ
    const isCorrect = selectedIndex === question.correctIndex;
    handleResult(isCorrect, question);
}

function handleResult(isCorrect, question) {
    const feedback = document.getElementById('feedback');
    feedback.innerHTML = isCorrect ? '<div>👍 Goed!</div>' : '<div>👎 Helaas...</div>';
    feedback.classList.add('show');

    // Logic
    if (isCorrect) {
        setTimeout(() => {
            feedback.classList.remove('show');
            nextQuestion(true);
        }, 1500);
    } else {
        State.player.currentAttempts++;
        if (State.player.currentAttempts >= 2) {
            // Fail question
            // Penalty
            State.player.info.timePenaltySeconds += CONFIG.PENALTY_SECONDS;
            API.updateTeam({
                teamId: State.player.teamId,
                teamToken: State.player.teamToken,
                sessionCode: State.player.sessionCode,
                timePenaltySeconds: State.player.info.timePenaltySeconds
            });
            setTimeout(() => {
                feedback.classList.remove('show');
                nextQuestion(false);
            }, 1500);
        } else {
            // Try again
            setTimeout(() => {
                feedback.classList.remove('show');
                // Re-render to show attempts
                showCurrentQuestion('animate__pulse');
            }, 1500);
        }
    }
}

function nextQuestion(success) {
    const p = State.player;
    p.currentQIndex++;
    p.currentAttempts = 0;
    p.hintsUsedForQ = 0;

    // Sync Progress
    API.updateTeam({
        teamId: p.teamId,
        teamToken: p.teamToken,
        sessionCode: p.sessionCode,
        progress: p.currentQIndex
    });

    // Storage Update
    const s = Storage.get('player_session');
    if (s) {
        s.currentQIndex = p.currentQIndex;
        Storage.set('player_session', s);
    }

    showCurrentQuestion();
}

async function showFinished() {
    const p = State.player;
    // Mark finished
    await API.updateTeam({
        teamId: p.teamId,
        teamToken: p.teamToken,
        sessionCode: p.sessionCode,
        finished: true
    });

    // Get words from p.info (Should be in join response)
    // Get words from p.info (Should be in join response)
    const animId = (p.info && p.info.animalId) ? parseInt(p.info.animalId) : 1;
    // Wrap around after 10 teams (20 words)
    const idx1 = ((animId - 1) * 2) % 20 + 1;
    const idx2 = idx1 + 1;

    // Format: "1. Woord"
    const words = [
        `${idx1}. ${p.info.word1 || '???'}`,
        `${idx2}. ${p.info.word2 || '???'}`
    ];

    let displayTeamName = p.info.teamName;
    if (p.info.animalId) {
        const anim = ANIMALS.find(a => a.id == p.info.animalId);
        if (anim) displayTeamName = anim.teamName;
    }

    render(Views.playerFinished(displayTeamName, words, p.info.timePenaltySeconds));
    if (pollInterval) clearInterval(pollInterval);
}

// ==========================================
// ADMIN CONTROLLER
// ==========================================
function startAdmin() {
    render(Views.adminSetup(async (name) => {
        try {
            const session = await API.createSession(name);
            State.admin.session = session;
            adminLoop();
            // Start polling
            pollInterval = setInterval(adminLoop, CONFIG.POLLING_INTERVAL);
        } catch (e) {
            alert("Fout bij maken sessie: " + e.message);
        }
    }));
}

async function adminLoop() {
    if (!State.admin.session) return;
    try {
        let s = State.admin.session;
        try {
            const fetched = await API.fetchSessionState(State.admin.session.sessionCode);
            // Only update if we got a valid session object back (prevents overwriting with empty/error response)
            if (fetched && fetched.sessionCode) {
                // Merge to preserve local fields (like sessionName) if API omits them
                s = { ...State.admin.session, ...fetched };
                State.admin.session = s;
                if (fetched.teams) State.admin.teams = fetched.teams;
            } else {
                console.warn("Fetched state invalid/empty, using cached state.", fetched);
            }
        } catch (fetchErr) {
            console.warn("Network/API error polling session, showing cached/created state.", fetchErr);
        }

        // Render or Update Dashboard
        if (document.getElementById('admin-screen')) {
            // Update existing view to prevent flash
            Views.adminDashboardUpdate(s, State.admin.teams || []);

            // Ensure event handlers for main buttons are attached if they were lost? 
            // No, because we only updated innerHTML of team-list and inputs. 
            // Buttons in header and words-panel (except "save") are static.
            // We need to re-bind if we re-rendered headers. We didn't.
        } else {
            // Initial Render
            const view = Views.adminDashboard(s, State.admin.teams || []);
            render(view);

            // Handler for Show Sentence
            const btnShowSentence = view.querySelector('#btn-show-sentence');
            if (btnShowSentence) {
                btnShowSentence.onclick = () => {
                    alert("In de bibliotheek vinden we verhalen om in te verdwijnen: spanning, actie, fantasie, verbeelding, en samen ontdekken we nieuwe werelden.");
                };
            }



            // Live Validation & Autosave
            const inputs = view.querySelectorAll('.word-input');
            inputs.forEach(inp => {
                inp.oninput = () => {
                    const idx = inp.dataset.idx;
                    const val = inp.value;
                    const target = Views.SOLUTION_WORDS[idx];

                    const cleanVal = val.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                    const cleanTarget = target.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                    const isMatch = cleanVal === cleanTarget;

                    // Update UI immediately (optimistic)
                    if (val.length > 0) {
                        if (isMatch) {
                            inp.style.borderColor = 'var(--success)';
                            inp.style.background = '#DCFCE7';
                        } else {
                            inp.style.borderColor = 'var(--danger)';
                            inp.style.background = '#FEE2E2';
                        }
                    } else {
                        inp.style.borderColor = '#D1D5DB';
                        inp.style.background = 'white';
                    }

                    // Check all for Button
                    let allCorrect = true;
                    // We must check current DOM state + this input's new value (which is in DOM)
                    // But we also need to check other inputs.
                    const currentValues = Array.from(inputs).map(i => i.value);

                    for (let i = 0; i < 20; i++) {
                        const v = currentValues[i].toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                        const t = Views.SOLUTION_WORDS[i].toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                        if (v !== t) allCorrect = false;
                    }

                    const btnSave = view.querySelector('#btn-save-words');
                    if (allCorrect) {
                        btnSave.textContent = "🔓 Open de kluis";
                        btnSave.disabled = false;
                        btnSave.className = "btn btn-success btn-large";
                        btnSave.style.background = "var(--success)";
                        btnSave.style.cursor = "pointer";
                        btnSave.dataset.action = "openVault";
                    } else {
                        btnSave.textContent = "🔒 Open de kluis";
                        btnSave.className = "btn";
                        btnSave.disabled = true;
                        btnSave.style.background = "#ccc";
                        btnSave.style.cursor = "not-allowed";
                        delete btnSave.dataset.action;
                    }

                    // Autosave if Match (or just debounced? User said "When it turns green i want you to autosave")
                    // If we save on every char, might be too much. But user specifically said "When it turns green".
                    // That implies saving ONLY when it becomes valid? 
                    // Or maybe just save the state so if they refresh it's there.
                    // Given "autosave", let's save.
                    // To prevent spam, let's debounce lightly or check if it matches target.
                    if (isMatch) {
                        API.adminUpdateWords({
                            sessionCode: s.sessionCode,
                            words: currentValues
                        });
                    }
                };
            });

            view.querySelector('#btn-save-words').onclick = (e) => {
                const btn = e.target;
                if (btn.dataset.action === 'openVault') {
                    // Trigger Open Vault Animation
                    render(Views.openVaultAnimation());
                    // Maybe stop polling?
                    if (pollInterval) clearInterval(pollInterval);
                    return;
                }

                const inputs = view.querySelectorAll('.word-input');
                const words = Array.from(inputs).map(i => i.value);
                API.adminUpdateWords({
                    sessionCode: s.sessionCode,
                    words: words
                }).then(() => alert("Woorden opgeslagen"));
            };

            // Purge Handler
            const btnPurge = view.querySelector('#btn-purge');
            if (btnPurge) {
                btnPurge.onclick = async () => {
                    const input = prompt("Typ de sessiecode na om te wissen (" + s.sessionCode + "):");
                    if (input === s.sessionCode) {
                        try {
                            await API.purgeSession({ sessionCode: s.sessionCode });
                            alert("Sessie gewist.");
                            location.reload();
                        } catch (e) { alert("Fout: " + e.message); }
                    }
                };
            }
        }

        // Update Timer & Status (Always, even if editing)
        const t = document.getElementById('admin-timer');
        const st = document.getElementById('admin-status');

        if (s.startTime) {
            const start = new Date(s.startTime).getTime();
            const now = new Date().getTime(); // slightly out of sync with server 'now' maybe, but good for UI
            const diff = Math.floor((now - start) / 1000);

            if (t) {
                t.textContent = formatTime(diff);
                if (diff > 45 * 60) {
                    t.style.color = 'var(--danger)';
                } else {
                    t.style.color = 'inherit';
                }
            }
        } else if (t) {
            t.textContent = "00:00";
            t.style.color = 'inherit';
        }

    } catch (e) {
        console.error("Admin poll error", e);
    }
}
