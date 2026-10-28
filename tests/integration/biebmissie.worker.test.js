// @vitest-environment node
/**
 * Integration tests voor de BiebMissie-verkeersleider (claimStation / adminSkipStation)
 *
 * Draait de echte SQL tegen een in-memory SQLite database (node:sqlite, Node 22.5+),
 * met beide migraties. Op oudere Node-versies worden deze tests overgeslagen.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

import {
    createSession,
    fetchSessionState,
    joinTeam,
    claimStation,
    adminSkipStation
} from '../../worker/src/handlers.js';

// createRequire i.p.v. import: Vite kent node:sqlite niet als builtin
let DatabaseSync = null;
try {
    ({ DatabaseSync } = createRequire(import.meta.url)('node:sqlite'));
} catch {
    DatabaseSync = null;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrations = ['0001_init.sql', '0002_biebmissie.sql']
    .map(f => readFileSync(join(__dirname, '../../migrations', f), 'utf-8'));

/** Minimal D1 adapter on top of node:sqlite */
function createD1() {
    const db = new DatabaseSync(':memory:');
    migrations.forEach(sql => db.exec(sql));
    return {
        prepare(sql) {
            let params = [];
            const stmt = {
                bind(...p) { params = p; return stmt; },
                async first() { return db.prepare(sql).get(...params) || null; },
                async all() { return { results: db.prepare(sql).all(...params) }; },
                async run() {
                    const r = db.prepare(sql).run(...params);
                    return { meta: { changes: Number(r.changes) } };
                }
            };
            return stmt;
        }
    };
}

const STATION_CONFIG = {
    requiredStations: 3,
    stations: [
        { id: 'YT-A', capacity: 1, priority: true, book: 'youtube' },
        { id: 'YT-B', capacity: 1, priority: true, book: 'youtube' },
        { id: 'SUPER', capacity: 2 },
        { id: 'COMPLOT', capacity: 2 },
        { id: 'WOLF', capacity: 2 },
        { id: 'PIXIE', capacity: 2 },
        { id: 'WAARHEID', capacity: 2 }
    ]
};

describe.skipIf(!DatabaseSync)('BiebMissie verkeersleider (D1/SQLite)', () => {
    let env;
    let code;

    const json = res => res.json();

    async function join(animalId) {
        const team = await json(await joinTeam({ sessionCode: code, animalId }, env));
        return team;
    }

    async function claim(team, extra = {}) {
        return json(await claimStation({ teamId: team.teamId, teamToken: team.teamToken, ...extra }, env));
    }

    beforeEach(async () => {
        env = { DB: createD1(), ALLOWED_ORIGINS: 'http://localhost:3000' };
        const session = await json(await createSession({
            sessionName: 'Groep 6A',
            mode: 'biebmissie',
            stationConfig: STATION_CONFIG
        }, env));
        code = session.sessionCode;
    });

    it('slaat modus en config op in de sessie', async () => {
        const state = await json(await fetchSessionState(code, env));
        expect(state.mode).toBe('biebmissie');
        expect(state.config.requiredStations).toBe(3);
        expect(state.config.stations).toHaveLength(7);
    });

    it('weigert een BiebMissie-sessie zonder geldige stations', async () => {
        const res = await createSession({ sessionName: 'x', mode: 'biebmissie', stationConfig: { stations: [] } }, env);
        expect(res.status).toBe(400);
    });

    it('reguliere sessies blijven werken en hebben modus regulier', async () => {
        const res = await json(await createSession({ sessionName: 'Gewoon' }, env));
        const state = await json(await fetchSessionState(res.sessionCode, env));
        expect(state.mode).toBe('regulier');
    });

    it('stuurt de eerste teams eerst naar De YouTube Hack A en B', async () => {
        const t1 = await claim(await join(1));
        const t2 = await claim(await join(2));
        expect([t1.station, t2.station].sort()).toEqual(['YT-A', 'YT-B']);
    });

    it('is idempotent: een team dat bij een boek zit krijgt hetzelfde boek terug', async () => {
        const team = await join(1);
        const first = await claim(team);
        const again = await claim(team);
        expect(again.station).toBe(first.station);
    });

    it('stuurt nooit meer teams naar een boek dan er exemplaren zijn (10 teams)', async () => {
        for (let id = 1; id <= 10; id++) {
            await claim(await join(id));
        }
        const state = await json(await fetchSessionState(code, env));
        for (const s of STATION_CONFIG.stations) {
            const count = state.teams.filter(t => t.currentStation === s.id).length;
            expect(count).toBeLessThanOrEqual(s.capacity);
        }
        // 12 plekken voor 10 teams: iedereen heeft een boek
        expect(state.teams.every(t => t.currentStation)).toBe(true);
    });

    it('geeft geen boek dat het team al deed, en geen tweede YouTube Hack-station', async () => {
        const team = await join(1);
        let r = await claim(team);
        expect(r.station).toMatch(/^YT-/);
        const seen = [r.station];
        r = await claim(team, { completedStation: r.station });
        seen.push(r.station);
        r = await claim(team, { completedStation: r.station });
        seen.push(r.station);

        expect(new Set(seen).size).toBe(3);
        expect(seen.filter(s => s.startsWith('YT-'))).toHaveLength(1);
    });

    it('na 3 stations is het team klaar en krijgt het alleen op verzoek een bonusboek', async () => {
        const team = await join(1);
        let r = await claim(team);
        for (let i = 0; i < 3; i++) {
            r = await claim(team, { completedStation: r.station });
        }
        expect(r.station).toBeNull();
        expect(r.finishedRequired).toBe(true);
        expect(r.stationsDone).toHaveLength(3);

        let state = await json(await fetchSessionState(code, env));
        expect(state.teams[0].finished).toBe(true);

        const bonus = await claim(team, { bonus: true });
        expect(bonus.station).toBeTruthy();
        expect(bonus.bonus).toBe(true);

        state = await json(await fetchSessionState(code, env));
        expect(state.teams[0].finished).toBe(true);
    });

    it('laat een team wachten als alle overgebleven boeken bezet zijn', async () => {
        const small = await json(await createSession({
            sessionName: 'Klein',
            mode: 'biebmissie',
            stationConfig: { requiredStations: 1, stations: [{ id: 'A', capacity: 1 }] }
        }, env));
        code = small.sessionCode;

        const first = await claim(await join(1));
        const second = await claim(await join(2));
        expect(first.station).toBe('A');
        expect(second.station).toBeNull();
        expect(second.wait).toBe(true);

        // Zodra team 1 klaar is, komt het boek vrij
        await claim({ ...(await join(1)) }, { completedStation: 'A' });
        const retry = await claim(await join(2));
        expect(retry.station).toBe('A');
    });

    it('voorkomt dubbele toewijzing bij gelijktijdige claims op het laatste exemplaar', async () => {
        const small = await json(await createSession({
            sessionName: 'Race',
            mode: 'biebmissie',
            stationConfig: { requiredStations: 1, stations: [{ id: 'A', capacity: 1 }] }
        }, env));
        code = small.sessionCode;

        const teams = await Promise.all([1, 2, 3, 4].map(join));
        const results = await Promise.all(teams.map(t => claim(t)));
        expect(results.filter(r => r.station === 'A')).toHaveLength(1);
    });

    it('weigert een verkeerd teamToken', async () => {
        const team = await join(1);
        const res = await claimStation({ teamId: team.teamId, teamToken: 'fout' }, env);
        expect(res.status).toBe(401);
    });

    it('weigert claimStation in een reguliere sessie', async () => {
        const regular = await json(await createSession({ sessionName: 'Gewoon' }, env));
        code = regular.sessionCode;
        const team = await join(1);
        const res = await claimStation({ teamId: team.teamId, teamToken: team.teamToken }, env);
        expect(res.status).toBe(400);
    });

    it('noodrem: adminSkipStation sluit het boek af en het team kan door', async () => {
        const team = await join(1);
        const first = await claim(team);

        const skip = await json(await adminSkipStation({ sessionCode: code, teamId: team.teamId }, env));
        expect(skip.stationsDone).toEqual([first.station]);

        const next = await claim(team);
        expect(next.station).toBeTruthy();
        expect(next.station).not.toBe(first.station);
    });
});
