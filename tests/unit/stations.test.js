/**
 * Unit tests voor de BiebMissie-verkeersleider en de inhoud van content/biebmissie.json
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import {
    rankStations,
    sanitizeStationConfig,
    buildStationConfig,
    normalizeAnswer,
    isOpenAnswerCorrect,
    computeVaultCode
} from '../../js/stations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const content = JSON.parse(readFileSync(join(__dirname, '../../content/biebmissie.json'), 'utf-8'));

const STATIONS = [
    { id: 'YT-A', capacity: 1, priority: true, book: 'youtube' },
    { id: 'YT-B', capacity: 1, priority: true, book: 'youtube' },
    { id: 'SUPER', capacity: 2, priority: false, book: 'SUPER' },
    { id: 'COMPLOT', capacity: 2, priority: false, book: 'COMPLOT' }
];

describe('rankStations', () => {
    it('zet onbezochte prioriteitsstations vooraan', () => {
        const { candidates } = rankStations({ stations: STATIONS, teams: [], teamId: 't1' });
        expect(candidates.slice(0, 2).sort()).toEqual(['YT-A', 'YT-B']);
    });

    it('slaat volle stations over', () => {
        const teams = [
            { teamId: 't2', currentStation: 'YT-A', stationsDone: [] },
            { teamId: 't3', currentStation: 'SUPER', stationsDone: [] },
            { teamId: 't4', currentStation: 'SUPER', stationsDone: [] }
        ];
        const { candidates } = rankStations({ stations: STATIONS, teams, teamId: 't1' });
        expect(candidates).not.toContain('YT-A');
        expect(candidates).not.toContain('SUPER');
        expect(candidates[0]).toBe('YT-B');
    });

    it('geeft geen tweede station van hetzelfde boek', () => {
        const { candidates, remaining } = rankStations({
            stations: STATIONS, teams: [], teamId: 't1', stationsDone: ['YT-A']
        });
        expect(candidates).not.toContain('YT-B');
        expect(remaining).toEqual(['SUPER', 'COMPLOT']);
    });

    it('verkiest het rustigste station boven een half bezet station', () => {
        const teams = [
            { teamId: 't2', currentStation: 'SUPER', stationsDone: [] },
            { teamId: 't3', currentStation: 'YT-A', stationsDone: [] },
            { teamId: 't4', currentStation: 'YT-B', stationsDone: [] }
        ];
        const { candidates } = rankStations({ stations: STATIONS, teams, teamId: 't1' });
        expect(candidates).toEqual(['COMPLOT', 'SUPER']);
    });

    it('telt het eigen huidige station niet mee als bezetting', () => {
        const teams = [{ teamId: 't1', currentStation: 'YT-A', stationsDone: [] }];
        const { candidates } = rankStations({ stations: STATIONS, teams, teamId: 't1' });
        expect(candidates).toContain('YT-A');
    });
});

describe('sanitizeStationConfig', () => {
    it('accepteert de config uit de content', () => {
        const config = sanitizeStationConfig(buildStationConfig(content));
        expect(config.stations).toHaveLength(content.stations.length);
        expect(config.requiredStations).toBe(content.requiredStations);
    });

    it('weigert lege, dubbele of rare station-ids', () => {
        expect(sanitizeStationConfig(null)).toBeNull();
        expect(sanitizeStationConfig({ stations: [] })).toBeNull();
        expect(sanitizeStationConfig({ stations: [{ id: 'A' }, { id: 'A' }] })).toBeNull();
        expect(sanitizeStationConfig({ stations: [{ id: '<script>' }] })).toBeNull();
    });

    it('begrenst capaciteit en aantal verplichte stations', () => {
        const config = sanitizeStationConfig({ requiredStations: 99, stations: [{ id: 'A', capacity: 500 }] });
        expect(config.stations[0].capacity).toBe(1);
        expect(config.requiredStations).toBe(1);
    });
});

describe('antwoorden controleren', () => {
    it('negeert hoofdletters, spaties, accenten en leestekens', () => {
        expect(normalizeAnswer('  Één Boek! ')).toBe('eenboek');
        expect(isOpenAnswerCorrect('BOEK.', ['boek'])).toBe(true);
        expect(isOpenAnswerCorrect('boeken', ['boek'])).toBe(false);
        expect(isOpenAnswerCorrect('', [''])).toBe(false);
    });

    it('accepteert varianten', () => {
        expect(isOpenAnswerCorrect('163 likes', ['likes', '163 likes'])).toBe(true);
    });

    it('berekent de code uit de gekleurde vakjes', () => {
        expect(computeVaultCode([
            { answer: 'abcdef', highlight: 6 },
            { answer: 'SLIMMERIK', highlight: 4 }
        ])).toBe('FM');
    });
});

describe('content/biebmissie.json', () => {
    const questions = content.stations.flatMap(s => s.questions);

    it('heeft unieke station- en vraag-ids', () => {
        const stationIds = content.stations.map(s => s.id);
        const questionIds = questions.map(q => q.id);
        expect(new Set(stationIds).size).toBe(stationIds.length);
        expect(new Set(questionIds).size).toBe(questionIds.length);
    });

    it('heeft geldige vragen', () => {
        for (const q of questions) {
            expect(['mcq', 'open', 'match', 'order'], q.id).toContain(q.type);
            expect(q.prompt, q.id).toBeTruthy();
            if (q.type === 'mcq') {
                expect(q.options.length, q.id).toBeGreaterThanOrEqual(2);
                expect(q.options[q.correctIndex], q.id).toBeDefined();
            }
            if (q.type === 'open') expect(q.answers.length, q.id).toBeGreaterThan(0);
            if (q.type === 'match') expect(q.pairs, q.id).toHaveLength(4);
            if (q.type === 'order') expect([...q.correctOrder].sort(), q.id).toEqual(q.items.map((_, i) => i));
        }
    });

    it('kluisrijen passen in de vakjes van het codeformulier', () => {
        for (const row of content.vault.rows) {
            expect(normalizeAnswer(row.answer), row.label).toHaveLength(row.length);
            expect(row.highlight, row.label).toBeLessThanOrEqual(row.length);
        }
        // De middelste letter is de M van SLIMMERIK
        expect(computeVaultCode(content.vault.rows).charAt(2)).toBe('M');
    });

    it('elke kluisrij (behalve het cadeautje) hoort bij precies één open vraag met hetzelfde antwoord', () => {
        for (const row of content.vault.rows.filter(r => !r.given)) {
            const linked = questions.filter(q => q.vaultRow === row.row);
            expect(linked, row.label).toHaveLength(1);
            expect(linked[0].type).toBe('open');
            expect(linked[0].answers.map(normalizeAnswer)).toContain(normalizeAnswer(row.answer));
        }
    });

    it('er zijn genoeg exemplaren voor 10 teams', () => {
        const seats = content.stations.reduce((sum, s) => sum + s.capacity, 0);
        expect(seats).toBeGreaterThanOrEqual(10);
    });
});
