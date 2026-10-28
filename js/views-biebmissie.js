/**
 * Views voor de BiebMissie-modus (boekstations + klassikale kluis)
 */
import { ANIMALS } from './animals.js';
import { getAnimalIcon } from './constants.js';
import { normalizeAnswer } from './stations.js';

const LOGO = 'assets/Logo-Bibliotheek-Noordwest-Veluwe-vierkant.png';

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function animalFor(team) {
    return ANIMALS.find(a => a.id === Number(team.animalId)) || null;
}

function teamLabel(team) {
    const anim = animalFor(team);
    return {
        icon: anim ? getAnimalIcon(anim.name) : '🐾',
        name: anim ? anim.teamName : (team.teamName || 'Team')
    };
}

function playerHeader(teamData, subtitle) {
    const { icon, name } = teamLabel(teamData);
    return `
        <div class="game-header">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.5rem;">${icon}</span>
                <div style="font-weight: bold; font-family: var(--font-heading);">${esc(name)}</div>
            </div>
            <div class="bm-header-sub">${esc(subtitle)}</div>
        </div>
    `;
}

/** Bolletjes voor de verplichte stations: ●●○ */
function stationDots(doneCount, required) {
    let html = '';
    for (let i = 0; i < required; i++) {
        html += `<span class="bm-dot ${i < doneCount ? 'done' : ''}"></span>`;
    }
    return `<span class="bm-dots" title="${doneCount} van ${required} boeken">${html}</span>`;
}

function stationTitle(station) {
    // De YouTube Hack staat er twee keer in (A en B): laat zien welk exemplaar
    const suffix = station.book && station.book !== station.id ? ` (${station.id.split('-').pop()})` : '';
    return station.title + suffix;
}

/** Normaliseert de letters van een rij uit de kluis */
export function rowValue(inputs) {
    return normalizeAnswer(Array.from(inputs).map(i => i.value).join(''));
}

export const BiebMissieViews = {
    // ==========================================
    // PLAYER
    // ==========================================

    stationIntro(station, teamData, stationNumber, required, isBonus, onReady, returnPrevious = false) {
        const div = document.createElement('div');
        div.className = 'player-layout';
        const label = isBonus ? '⭐ Bonusboek' : `Boek ${stationNumber} van ${required}`;

        div.innerHTML = `
            <img src="${LOGO}" class="bg-logo">
            <div style="display: flex; flex-direction: column; width: 100%; height: 100%; z-index: 1;">
                ${playerHeader(teamData, label)}
                <div class="question-area">
                    <div class="question-container">
                        <div class="card bm-book-card animate__animated animate__fadeInUp">
                            ${returnPrevious ? '<div class="bm-return">↩️ Leg eerst het vorige boek terug op zijn plek.</div>' : ''}
                            <div class="bm-kicker">Jullie missie: zoek dit boek</div>
                            <div class="bm-book">
                                <div class="bm-book-spine" aria-hidden="true">📕</div>
                                <div>
                                    <h1 class="bm-book-title">${esc(station.title)}</h1>
                                    <div class="bm-book-author">${esc(station.author)}</div>
                                </div>
                            </div>
                            ${station.copyLabel ? `<div class="bm-copy-label">👉 ${esc(station.copyLabel)}</div>` : ''}
                            ${station.teaser ? `<p class="bm-teaser">${esc(station.teaser)}</p>` : ''}
                            <p style="margin-top: 10px;">Er ${station.questions.length === 1 ? 'is 1 vraag' : `zijn ${station.questions.length} vragen`} over dit boek. Het antwoord staat in het boek!</p>
                            <button id="btn-have-book" class="btn btn-primary btn-large" style="margin-top: 20px;">📖 We hebben het boek!</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        div.querySelector('#btn-have-book').onclick = onReady;
        return div;
    },

    waiting(teamData) {
        const div = document.createElement('div');
        div.className = 'player-layout';
        div.innerHTML = `
            <img src="${LOGO}" class="bg-logo">
            <div style="display: flex; flex-direction: column; width: 100%; height: 100%; z-index: 1;">
                ${playerHeader(teamData, 'Even wachten')}
                <div class="question-area">
                    <div class="question-container">
                        <div class="card animate__animated animate__fadeIn">
                            <div style="font-size: 4rem;" class="bm-pulse">⏳</div>
                            <h2>Alle boeken zijn even bezet</h2>
                            <p>Blijf hier staan. Zodra er een boek vrijkomt, zie je hier waar jullie heen moeten.</p>
                            <p style="margin-top: 10px; color: #888;">Bespreek ondertussen: welke app of welk filmpje gebruik jij het meest? Waarom?</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return div;
    },

    redirected() {
        const div = document.createElement('div');
        div.className = 'screen';
        div.innerHTML = `
            <img src="${LOGO}" class="bg-logo">
            <div class="card animate__animated animate__fadeIn">
                <div style="font-size: 3rem;">🔀</div>
                <h2>Door naar het volgende boek!</h2>
                <p>De bibliothecaris stuurt jullie door. Leg het boek terug en kijk waar jullie nu heen gaan…</p>
            </div>
        `;
        return div;
    },

    /**
     * @param {Object} teamData
     * @param {Array<{label: string, answer: string}>} vaultFinds - kluisantwoorden die dit team vond
     * @param {boolean} canBonus - is er nog een boek over voor een bonusronde?
     * @param {Function} onBonus
     */
    finished(teamData, vaultFinds, canBonus, onBonus) {
        const div = document.createElement('div');
        div.className = 'screen';
        const { name } = teamLabel(teamData);

        let confettiHtml = '';
        for (let i = 0; i < 120; i++) {
            confettiHtml += `<div class="confetti" style="left: ${Math.random() * 100}%; animation-delay: ${Math.random() * 5}s"></div>`;
        }

        const findsHtml = vaultFinds.length ? `
            <div class="bm-vault-finds">
                <h3>🔑 Jullie hebben kluisantwoorden gevonden!</h3>
                <p>Onthoud ze goed: de klas heeft ze straks nodig om de code te kraken.</p>
                ${vaultFinds.map(f => `
                    <div class="bm-find"><span>${esc(f.label)}</span><strong>${esc(f.answer)}</strong></div>
                `).join('')}
            </div>
        ` : '';

        div.innerHTML = `
            <img src="${LOGO}" class="bg-logo">
            <div class="confetti-container">${confettiHtml}</div>
            <div class="card" style="z-index: 40;">
                <div style="font-size: 3rem;">🔓</div>
                <h1>Missie volbracht, ${esc(name)}!</h1>
                <p>Jullie slot op de kluis is open. Leg het boek terug op het station.</p>
                ${findsHtml}
                ${canBonus ? `
                    <p style="margin-top: 20px;">Nog tijd over? Pak een bonusboek!</p>
                    <button id="btn-bonus" class="btn btn-primary" style="margin-top: 10px;">⭐ Bonusboek</button>
                ` : ''}
                <p style="margin-top: 20px; font-weight: 600;">Wacht op het teken van de bibliothecaris voor de finale!</p>
            </div>
        `;
        const btn = div.querySelector('#btn-bonus');
        if (btn) btn.onclick = onBonus;
        return div;
    },

    // ==========================================
    // ADMIN
    // ==========================================

    adminDashboard(session, teams, content) {
        const div = document.createElement('div');
        div.className = 'screen';
        div.id = 'admin-screen';
        div.style.display = 'block';

        div.innerHTML = `
            ${content.placeholder ? `
                <div class="bm-placeholder-banner">⚠️ Dit zijn nog VOORBEELDVRAGEN. Vul het invulsjabloon in voordat je dit met een klas gebruikt.</div>
            ` : ''}
            <div class="bm-admin-header">
                <img src="${LOGO}" alt="Logo" style="height: 80px; width: auto;">
                <div style="flex: 1; text-align: center;">
                    <div class="bm-kicker">BiebMissie · MediaMasters</div>
                    <h2 style="margin: 0; font-size: 2rem;">${esc(session.sessionName)}</h2>
                    <div style="font-size: 1.4rem; font-weight: bold; letter-spacing: 3px;">CODE: ${esc(session.sessionCode)}</div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                    <div id="admin-timer" class="bm-timer">00:00</div>
                    <button id="btn-show-answers" class="btn btn-secondary" style="font-size: 0.8rem; padding: 5px 10px;">Toon antwoorden</button>
                    <button id="btn-purge" class="btn" style="background: #fee; color: red; font-size: 0.8rem; padding: 5px 10px;">⚠ Wis Sessie</button>
                </div>
            </div>
            <div class="bm-admin-grid">
                <div class="admin-panel">
                    <h3>Teams</h3>
                    <div id="team-list"></div>
                </div>
                <div class="admin-panel">
                    <h3>Boeken</h3>
                    <div id="station-list" class="bm-station-list"></div>
                </div>
                <div class="admin-panel bm-vault-panel">
                    <h3>De kluis</h3>
                    <div id="padlocks" class="bm-padlocks"></div>
                    <div id="code-form" class="bm-code-form"></div>
                    <div class="bm-code-label">De code:</div>
                    <div id="code-boxes" class="bm-code-boxes"></div>
                    <button id="btn-open-vault" class="btn btn-large bm-vault-btn" disabled>🔒 Open de kluis</button>
                </div>
            </div>
        `;

        // Codeformulier: één invulvakje per letter, net als op papier
        const form = div.querySelector('#code-form');
        content.vault.rows.forEach(row => {
            const rowEl = document.createElement('div');
            rowEl.className = 'bm-code-row';
            rowEl.dataset.row = row.row;
            let boxes = '';
            const given = row.given ? normalizeAnswer(row.answer).toUpperCase() : '';
            for (let i = 0; i < row.length; i++) {
                const hl = i === row.highlight - 1 ? 'highlight' : '';
                boxes += `<input class="bm-letter ${hl}" autocomplete="off" autocapitalize="characters" spellcheck="false"
                    data-row="${row.row}" data-idx="${i}" ${row.given ? `value="${given[i] || ''}" disabled` : ''}>`;
            }
            rowEl.innerHTML = `<label>${esc(row.label)}</label><div class="bm-letters">${boxes}</div><span class="bm-row-ok">✔</span>`;
            form.appendChild(rowEl);
        });

        const codeBoxes = div.querySelector('#code-boxes');
        content.vault.rows.forEach(row => {
            codeBoxes.insertAdjacentHTML('beforeend', `<div class="bm-code-box ${row.given ? 'given' : ''}" data-row="${row.row}"></div>`);
        });

        BiebMissieViews.adminDashboardUpdate(session, teams, content, div);
        return div;
    },

    adminDashboardUpdate(session, teams, content, root = document.getElementById('admin-screen')) {
        if (!root) return;
        const required = content.requiredStations;
        const byId = Object.fromEntries(content.stations.map(s => [s.id, s]));
        const sorted = [...(teams || [])].sort((a, b) => a.animalId - b.animalId);

        // 1. Teams
        const teamList = root.querySelector('#team-list');
        if (!sorted.length) {
            teamList.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">Er zijn nog geen teams die deelnemen.</div>';
        } else {
            teamList.innerHTML = sorted.map(t => {
                const { icon, name } = teamLabel(t);
                const done = (t.stationsDone || []).length;
                const isOnline = (new Date() - new Date(t.lastSeen || 0)) < 20000;
                let where = '<span class="bm-where wait">⏳ wacht op een boek</span>';
                if (t.currentStation && byId[t.currentStation]) {
                    where = `<span class="bm-where">${done >= required ? '⭐ ' : '📖 '}${esc(stationTitle(byId[t.currentStation]))}</span>`;
                } else if (t.finished || done >= required) {
                    where = '<span class="bm-where done">✅ klaar</span>';
                }
                return `
                    <div class="team-row" data-team-id="${esc(t.teamId)}">
                        <div style="display: flex; align-items: center; gap: 8px; width: 165px; flex-shrink: 0;">
                            <span style="font-size: 1.4rem;">${icon}</span><strong>${esc(name)}</strong>
                        </div>
                        <div style="flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; justify-content: space-between;">
                            ${where}
                            ${stationDots(done, required)}
                        </div>
                        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-left: 10px; width: 52px; flex-shrink: 0;">
                            ${t.currentStation ? `<button class="bm-skip" data-team-id="${esc(t.teamId)}" title="Stuur door naar het volgende boek">⏭</button>` : ''}
                            <div class="status-indicator ${isOnline ? 'status-online' : ''}" title="${isOnline ? 'Online' : 'Offline'}"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 2. Boeken: wie zit waar
        root.querySelector('#station-list').innerHTML = content.stations.map(s => {
            const here = sorted.filter(t => t.currentStation === s.id);
            const visited = sorted.filter(t => (t.stationsDone || []).includes(s.id)).length;
            let seats = '';
            for (let i = 0; i < s.capacity; i++) {
                seats += here[i]
                    ? `<span class="bm-seat taken" title="${esc(teamLabel(here[i]).name)}">${teamLabel(here[i]).icon}</span>`
                    : '<span class="bm-seat" title="Vrij exemplaar">📗</span>';
            }
            return `
                <div class="bm-station ${here.length >= s.capacity ? 'full' : ''} ${s.priority && !visited && !here.length ? 'urgent' : ''}">
                    <div class="bm-station-name">${esc(stationTitle(s))}</div>
                    <div class="bm-seats">${seats}</div>
                    <div class="bm-visited">${visited}× klaar</div>
                </div>
            `;
        }).join('');

        // 3. Hangslotjes: één per team, open als het team klaar is
        root.querySelector('#padlocks').innerHTML = sorted.map(t => {
            const open = t.finished || (t.stationsDone || []).length >= required;
            return `<span class="bm-padlock ${open ? 'open' : ''}" title="${esc(teamLabel(t).name)}">${open ? '🔓' : '🔒'}<small>${teamLabel(t).icon}</small></span>`;
        }).join('');
    },

    vaultReveal(code, content) {
        const div = document.createElement('div');
        div.className = 'bm-reveal';
        const think = content.stations
            .flatMap(s => s.questions)
            .map(q => q.thinkQuestion)
            .filter(Boolean);
        const host = content.vault.claimUrl.replace(/^https?:\/\/(www\.)?/, '');

        div.innerHTML = `
            <button id="btn-close-vault" class="vault-close-btn">← Terug naar overzicht</button>
            <div class="bm-reveal-inner">
                <div class="bm-kicker" style="color: white;">De kluis is open!</div>
                <h1>Jullie code</h1>
                <div class="bm-code-boxes big">
                    ${code.split('').map((ch, i) => `<div class="bm-code-box filled" style="animation-delay: ${0.4 + i * 0.35}s">${esc(ch)}</div>`).join('')}
                </div>
                <p class="bm-claim">Claim jullie bits op <strong>${esc(host)}</strong></p>
                ${think.length ? `
                    <div class="bm-think">
                        <h2>💭 Hersenspinsels</h2>
                        <ul>${think.map(q => `<li>${esc(q)}</li>`).join('')}</ul>
                    </div>
                ` : ''}
            </div>
        `;
        return div;
    }
};
