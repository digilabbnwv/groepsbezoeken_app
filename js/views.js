
import { ANIMALS } from './animals.js';
import { formatTime } from './utils.js';

export const Views = {
    SOLUTION_WORDS: [
        "In", "de", "bibliotheek", "vinden", "we", "verhalen", "om", "in", "te", "verdwijnen",
        "spanning", "actie", "fantasie", "verbeelding", "en", "samen", "ontdekken", "we", "nieuwe", "werelden"
    ],

    landing() {
        const div = document.createElement('div');
        div.className = 'screen';
        div.innerHTML = `
            <div class="card">
                <h1>Welkom bij de Speurtocht</h1>
                <p>Klaar voor het avontuur?</p>
                <button class="btn btn-primary btn-large" onclick="location.hash='#player'">Start als Speler</button>
                <div style="margin-top: 2rem;">
                    <a href="#admin" style="color: #ccc; font-size: 0.8rem; text-decoration: none;">Beheerder Login</a>
                </div>
            </div>
        `;
        return div;
    },

    playerJoin(onResume, onJoin) {
        const div = document.createElement('div');
        div.className = 'screen';
        div.innerHTML = `
            <div class="card">
                <h1>Doe mee!</h1>
                <input type="text" id="session-code" placeholder="Sessiecode (6 tekens)" 
                    style="font-size: 2rem; padding: 10px; width: 200px; text-transform: uppercase; text-align: center; margin: 20px 0; border: 2px solid #ddd; border-radius: 8px;">
                <br>
                <button id="btn-join" class="btn btn-primary btn-large">Start</button>
            </div>
        `;

        const input = div.querySelector('#session-code');
        div.querySelector('#btn-join').onclick = () => {
            const code = input.value.trim().toUpperCase();
            if (code.length >= 3) onJoin(code);
        };
        return div;
    },

    playerRejoin(teamName, onYes, onNo) {
        const div = document.createElement('div');
        div.className = 'screen';
        div.innerHTML = `
            <div class="card">
                <h1>Welkom terug!</h1>
                <p>Wil je doorgaan als <strong>${teamName}</strong>?</p>
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                    <button id="btn-yes" class="btn btn-primary">Ja, verder</button>
                    <button id="btn-no" class="btn btn-secondary">Nee, nieuw team</button>
                </div>
            </div>
        `;
        div.querySelector('#btn-yes').onclick = onYes;
        div.querySelector('#btn-no').onclick = onNo;
        return div;
    },

    playerAvatarSelection(takenIds, onSelect, selectedId) {
        const div = document.createElement('div');
        div.className = 'screen';

        // Default to empty array if undefined
        const takenList = takenIds || [];

        let gridHtml = '';
        ANIMALS.forEach(animal => {
            // An animal is taken if it is in the list, UNLESS it is the one currently selected by us
            const isTaken = takenList.includes(animal.id) && animal.id !== selectedId;
            const isSelected = animal.id === selectedId;
            const cls = `animal-card ${isSelected ? 'selected' : ''} ${isTaken ? 'disabled' : ''}`;

            gridHtml += `
                <div class="${cls}" data-id="${animal.id}">
                    <div style="font-size: 3rem;">${getAnimalIcon(animal.name)}</div>
                    <div style="font-weight: bold; margin-top: 5px;">${animal.name}</div>
                    <div style="font-size: 0.8rem; color: #666;">${animal.teamName}</div>
                    <div style="height: 5px; background: ${animal.color}; margin-top: 5px; border-radius: 2px;"></div>
                </div>
            `;
        });

        div.innerHTML = `
            <h2 style="margin-bottom: 20px;">Kies je team</h2>
            <div class="animal-grid">${gridHtml}</div>
            <button id="btn-confirm" class="btn btn-primary btn-large" style="margin-top: 20px;" ${selectedId ? '' : 'disabled'}>Bevestigen</button>
        `;

        div.querySelectorAll('.animal-card').forEach(el => {
            el.onclick = () => {
                if (!el.classList.contains('disabled')) {
                    onSelect(parseInt(el.dataset.id));
                }
            };
        });

        return div;
    },

    playerGame(question, progressText, attempts, maxAttempts, onAnswer, onHint, hintsUsed, timePenalty, teamData) {
        const div = document.createElement('div');
        div.className = 'player-layout';

        const isMcq = question.type === 'mcq';
        const isMatch = question.type === 'match';
        const isOrder = question.type === 'order';

        let contentHtml = '';

        if (isMcq) {
            contentHtml = `<div class="options-list">
                ${question.options.map((opt, i) => `
                    <button class="btn option-btn" data-idx="${i}">${opt}</button>
                `).join('')}
            </div>`;
        } else if (isMatch) {
            contentHtml = `
                <div class="match-pairs">
                    <div class="match-col" id="col-left">
                        ${question.pairs.map((p, i) => `<div class="match-item" data-side="left" data-idx="${i}">${p.left}</div>`).join('')}
                    </div>
                    <div class="match-col" id="col-right">
                         ${question.pairs.map((p, i) => `<div class="match-item" data-side="right" data-idx="${i}">${p.right}</div>`).join('')}
                    </div>
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <button id="btn-submit-match" class="btn btn-primary">Check</button>
                </div>
            `;
        } else if (isOrder) {
            contentHtml = `
                <div id="order-list" class="options-list"></div>
                <div style="text-align: center; margin-top: 20px;">
                    <button id="btn-submit-order" class="btn btn-primary">Check</button>
                </div>
            `;
        }

        // Header Info
        let headerHtml = '';
        if (teamData) {
            const currentQ = parseInt(progressText.split('/')[0]) - 1;
            const pct = Math.min(100, Math.round((currentQ / 12) * 100));
            const [cur, total] = progressText.split('/');

            // Find icon and proper name
            let icon = '🐾';
            let DisplayName = teamData.teamName;

            if (teamData.animalId) {
                const anim = ANIMALS.find(a => a.id == teamData.animalId);
                if (anim) {
                    icon = getAnimalIcon(anim.name);
                    DisplayName = anim.teamName;
                }
            }

            headerHtml = `
                <div style="background: white; padding: 10px 20px; border-bottom: 1px solid #E5E7EB; display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.5rem;">${icon}</span>
                        <div style="font-weight: bold; font-family: var(--font-heading);">${DisplayName}</div>
                    </div>
                     <div style="flex: 1; max-width: 300px; margin: 0 20px; display: flex; flex-direction: column; align-items: center;">
                        <div style="font-size: 0.8rem; margin-bottom: 4px; color: #666;">${cur} van ${total}</div>
                        <div style="height: 8px; width: 100%; background: #E5E7EB; border-radius: 4px; overflow: hidden;">
                            <div style="height: 100%; width: ${pct}%; background: var(--primary); transition: width 0.5s;"></div>
                        </div>
                    </div>
                    <div style="width: 20px;"></div>
                </div>
            `;
        }

        div.innerHTML = `
            <div style="display: flex; flex-direction: column; width: 100%; height: 100%;">
                ${headerHtml}
                <div class="question-area">
                    <div class="question-container">
                        <div class="card" style="max-width: 100%;">
                            <h2 style="margin-bottom: 20px;">${question.prompt}</h2>
                            ${contentHtml}
                            
                            <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 0.9rem;">Poging ${attempts}/${maxAttempts}</span>
                                <button id="btn-hint" class="btn btn-secondary" ${hintsUsed >= 3 ? 'disabled' : ''}>
                                    Hint (${3 - hintsUsed} over)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div id="comp-sidebar" class="competition-sidebar">
                <!-- Injected via updateCompetitionSidebar -->
            </div>
            <div id="feedback" class="feedback-overlay"></div>
        `;

        return div;
    },

    playerFinished(teamName, words, timePenalty) {
        const div = document.createElement('div');
        div.className = 'screen';
        div.innerHTML = `
            <div class="card">
                <h1>Gefeliciteerd, ${teamName}!</h1>
                <p>Jullie hebben alle vragen opgelost.</p>
                
                <div style="margin: 30px 0; background: #EFF6FF; padding: 20px; border-radius: 10px;">
                    <h3>Jullie woorden om de kluis te kraken:</h3>
                    <div style="font-size: 2rem; font-weight: bold; color: var(--primary); margin-top: 10px;">
                        ${words[0]} &nbsp;&nbsp; ${words[1]}
                    </div>
                </div>
                
                <p>Meld je bij de leerkracht!</p>
            </div>
        `;
        return div;
    },

    // ADMIN VIEWS
    adminSetup(onCreate) {
        const div = document.createElement('div');
        div.className = 'screen';
        div.innerHTML = `
            <div class="card">
                <h1>Groepsbezoek Bibliotheek</h1>
                <input type="text" id="session-name" placeholder="Naam (bv. Groep 6B)" 
                    style="font-size: 1.5rem; padding: 10px; width: 100%; margin: 20px 0;">
                <button id="btn-create" class="btn btn-primary btn-large">Start met deze groep</button>
            </div>
        `;
        div.querySelector('#btn-create').onclick = () => {
            const name = div.querySelector('#session-name').value;
            if (name) onCreate(name);
        };
        return div;
    },

    adminDashboard(session, teams) {
        const div = document.createElement('div');
        div.className = 'screen';
        div.id = 'admin-screen';
        div.style.display = 'block';

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'padding: 20px; background: white; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);';

        const isRunning = session.status === 'running';
        const isPaused = session.status === 'paused';

        header.innerHTML = `
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <h2 style="margin: 0; font-size: 2rem;">${session.sessionName}</h2>
                <div style="font-size: 1.2rem; font-weight: bold; letter-spacing: 2px; margin-top: 5px;">CODE: ${session.sessionCode} (PIN: ${session.sessionPin})</div>
            </div>
             <div style="margin-top: 10px; display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                 <button id="btn-purge" class="btn" style="background: #fee; color: red; font-size: 0.8rem;">⚠ Wis Sessie</button>
            </div>
        `;

        // Note: btn-toggle-comp has data-action, so generic handler in app.js will pick it up.

        const btnPurge = header.querySelector('#btn-purge');
        // Purge handler is attached in app.js if elements exist

        // Main Grid
        const grid = document.createElement('div');
        grid.className = 'admin-grid';

        // Teams Panel
        const teamsPanel = document.createElement('div');
        teamsPanel.className = 'admin-panel';
        teamsPanel.innerHTML = '<h3>Teams</h3><div id="team-list"></div>';

        // Render teams list
        const teamList = teamsPanel.querySelector('#team-list');
        teams.forEach(t => {
            teamList.appendChild(createTeamRow(t));
        });

        const wordsPanel = document.createElement('div');
        wordsPanel.className = 'admin-panel';
        wordsPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3>Kluiswoorden</h3>
                <button id="btn-show-sentence" class="btn btn-secondary" style="font-size: 0.8rem; padding: 5px 10px;">Toon Zin</button>
            </div>
            <div id="words-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px;"></div>
            <button id="btn-save-words" class="btn" disabled style="margin-top: 20px; width: 100%; background: #ccc; cursor: not-allowed; font-size: 1.2rem;">🔒 Open de kluis</button>
        `;

        const wordsGrid = wordsPanel.querySelector('#words-grid');
        const currentWords = session.words || Array(20).fill('');
        let allCorrect = true;

        for (let i = 0; i < 20; i++) {
            const inp = document.createElement('input');
            inp.type = 'text';
            const val = currentWords[i] || '';
            inp.value = val;
            inp.placeholder = `Woord ${i + 1}`;

            // Visual Validation Logic
            const target = Views.SOLUTION_WORDS[i];
            const cleanVal = val.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            const cleanTarget = target.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            const isMatch = cleanVal === cleanTarget;
            const hasValue = cleanVal.length > 0;

            let borderColor = '#D1D5DB';
            let bgColor = 'white';

            if (hasValue) {
                if (isMatch) {
                    borderColor = 'var(--success)';
                    bgColor = '#DCFCE7';
                } else {
                    borderColor = 'var(--danger)';
                    bgColor = '#FEE2E2';
                    allCorrect = false;
                }
            } else {
                allCorrect = false;
            }

            inp.style.cssText = `padding: 8px 12px; border: 2px solid ${borderColor}; background: ${bgColor}; border-radius: 8px; outline: none; transition: all 0.2s;`;

            inp.onfocus = () => { inp.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'; };
            inp.onblur = () => { inp.style.boxShadow = 'none'; };

            inp.className = 'word-input';
            inp.dataset.idx = i;
            wordsGrid.appendChild(inp);
        }

        grid.appendChild(teamsPanel);
        grid.appendChild(wordsPanel);

        div.appendChild(header);
        div.appendChild(grid);

        // Update Save button state
        const btnSave = div.querySelector('#btn-save-words');
        if (allCorrect) {
            btnSave.textContent = "🔓 Open de kluis";
            btnSave.disabled = false;
            btnSave.className = "btn btn-success btn-large";
            btnSave.style.background = "var(--success)";
            btnSave.style.cursor = "pointer";
            btnSave.dataset.action = "openVault";
        }

        return div;
    },

    adminDashboardUpdate(session, teams) {
        const container = document.getElementById('admin-screen');
        if (!container) return;

        // 1. Update Team List
        const teamList = container.querySelector('#team-list');
        if (teamList) {
            // Re-build list
            teamList.innerHTML = '';
            teams.forEach(t => {
                teamList.appendChild(createTeamRow(t));
            });
        }

        // 2. Update Words (if not editing)
        const grid = container.querySelector('#words-grid');
        const isEditing = grid && grid.contains(document.activeElement);
        if (!isEditing && grid) {
            const inputs = grid.querySelectorAll('.word-input');
            const currentWords = session.words || [];

            inputs.forEach((inp, i) => {
                const val = currentWords[i] || '';
                // Only update if changed
                if (inp.value !== val) {
                    inp.value = val;
                    // Re-apply validation styles manually (duplicated logic, but safe)
                    const target = Views.SOLUTION_WORDS[i];
                    const cleanVal = val.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                    const cleanTarget = target.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                    const isMatch = cleanVal === cleanTarget;

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
                }
            });

            // Update Save Button
            // We need to check all values (from inputs or session)
            let allCorrect = true;
            for (let i = 0; i < 20; i++) {
                const val = currentWords[i] || '';
                const target = Views.SOLUTION_WORDS[i];
                const cleanVal = val.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                const cleanTarget = target.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                if (cleanVal !== cleanTarget) allCorrect = false;
            }

            const btnSave = container.querySelector('#btn-save-words');
            if (btnSave) {
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
            }
        }
    },

    openVaultAnimation() {
        const div = document.createElement('div');
        div.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; background: black; display: flex; align-items: center; justify-content: center; overflow: hidden;';

        // Image
        const img = document.createElement('img');
        img.src = 'assets/vault_fantasy.png';
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 3s ease-in;';

        div.appendChild(img);

        // Sound effect?

        // Trigger animation
        requestAnimationFrame(() => {
            setTimeout(() => {
                img.style.opacity = '1';
            }, 100);
        });

        return div;
    },

    updateCompetitionSidebar(teams, myTeamId) {
        const sb = document.getElementById('comp-sidebar');
        if (!sb) return;

        sb.innerHTML = '';
        // Sort me first? Or rank? Just list.
        teams.forEach(t => {
            const isMe = t.teamId === myTeamId;
            const progress = t.progress || 0;
            const pct = (progress / 12) * 100;
            const color = t.teamColor || '#ccc';

            // Conic gradient for ring
            const grad = `conic-gradient(${color} ${pct}%, #E5E7EB ${pct}%)`;

            // Find Animal Icon
            let icon = '🐾';
            if (t.animalId) {
                const anim = ANIMALS.find(a => a.id == t.animalId);
                if (anim) icon = getAnimalIcon(anim.name);
            } else {
                // Fallback attempt
                icon = getAnimalIcon(t.teamName.split(' ')[1] || t.teamName);
            }

            const el = document.createElement('div');
            el.className = `mini-team ${isMe ? 'is-me' : ''}`;
            el.innerHTML = `
                <div class="progress-ring" style="background: ${grad};">
                    <span class="mini-avatar-icon">${icon}</span> 
                </div> 
                <div class="mini-name">${t.teamName}</div>
            `;
            // Add name tooltip
            el.title = t.teamName;
            sb.appendChild(el);
        });
    }
};

function createTeamRow(t) {
    const lastSeen = new Date(t.lastSeen || 0);
    const isOnline = (new Date() - lastSeen) < 20000;

    let avatar = '';
    let name = t.teamName;
    if (t.animalId) {
        const anim = ANIMALS.find(a => a.id == t.animalId);
        if (anim) {
            avatar = `<span style="font-size: 1.5rem; margin-right: 5px;">${getAnimalIcon(anim.name)}</span>`;
            name = anim.teamName;
        }
    }

    const pct = Math.min(100, Math.round((t.progress / 12) * 100));
    const row = document.createElement('div');
    row.className = 'team-row';
    row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; min-width: 200px;">
            ${avatar}
            <strong>${name}</strong>
        </div>
        <div style="flex: 1; margin: 0 20px;">
            <div style="height: 10px; background: #E5E7EB; border-radius: 5px; overflow: hidden;">
                <div style="height: 100%; width: ${pct}%; background: ${t.teamColor || 'var(--primary)'}; transition: width 0.5s;"></div>
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 15px;">
            <small>${t.progress}/12</small>
            <span title="Hints">💡 ${t.hintsUsed}</span>
            <div class="status-indicator ${isOnline ? 'status-online' : ''}" title="${isOnline ? 'Online' : 'Offline'}"></div>
        </div>
    `;
    return row;
}

function getAnimalIcon(name) {
    const icons = {
        'Panda': '🐼', 'Haas': '🐰', 'Koe': '🐮', 'Vos': '🦊',
        'Leeuw': '🦁', 'Kikker': '🐸', 'Slang': '🐍', 'Beer': '🐻',
        'Giraffe': '🦒', 'Kraai': '🐦', 'Dolfijn': '🐬', 'Koala': '🐨',
        'Stier': '🐂', 'Kwal': '🪼', 'Stokstaart': '🐿️'
    };
    // Fuzzy check?
    for (const k of Object.keys(icons)) {
        if (name.includes(k)) return icons[k];
    }
    return '🐾';
}
