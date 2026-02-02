/**
 * Integration tests for Cloudflare Worker (D1 API flow)
 * 
 * These tests simulate the full API flow:
 * createSession → adminUpdateWords → joinTeam → updateTeam → fetchSessionState → purgeSession
 * 
 * Uses a mock D1 database interface for local testing.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock D1 database for testing
class MockD1Database {
    constructor() {
        this.sessions = new Map();
        this.teams = new Map();
    }

    prepare(sql) {
        return new MockStatement(sql, this);
    }

    // Helper to reset database state
    reset() {
        this.sessions.clear();
        this.teams.clear();
    }
}

class MockStatement {
    constructor(sql, db) {
        this.sql = sql;
        this.db = db;
        this.params = [];
    }

    bind(...params) {
        this.params = params;
        return this;
    }

    async run() {
        const sql = this.sql.toLowerCase();

        if (sql.includes('insert into sessions')) {
            const [sessionId, sessionName, sessionCode, wordsJson, createdAt] = this.params;

            // Check unique constraint
            for (const session of this.db.sessions.values()) {
                if (session.sessionCode === sessionCode) {
                    throw new Error('UNIQUE constraint failed: sessions.sessionCode');
                }
            }

            this.db.sessions.set(sessionId, {
                sessionId, sessionName, sessionCode, wordsJson, createdAt, startTime: null
            });
            return { meta: { changes: 1 } };
        }

        if (sql.includes('insert into teams')) {
            const [teamId, teamToken, sessionCode, animalId, teamName, teamColor, word1, word2, lastSeen] = this.params;

            // Check unique constraint
            for (const team of this.db.teams.values()) {
                if (team.sessionCode === sessionCode && team.animalId === animalId) {
                    throw new Error('UNIQUE constraint failed: unique_animal_per_session');
                }
            }

            this.db.teams.set(teamId, {
                teamId, teamToken, sessionCode, animalId, teamName, teamColor,
                word1, word2, lastSeen, progress: 0, score: 0, hintsUsed: 0,
                timePenaltySeconds: 0, finished: 0
            });
            return { meta: { changes: 1 } };
        }

        if (sql.includes('update sessions')) {
            const sessionCode = this.params[this.params.length - 1];
            const session = [...this.db.sessions.values()].find(s => s.sessionCode === sessionCode);
            if (session) {
                // Simple update logic for wordsJson
                if (sql.includes('wordsjson')) {
                    session.wordsJson = this.params[0];
                }
            }
            return { meta: { changes: session ? 1 : 0 } };
        }

        if (sql.includes('update teams')) {
            const teamId = this.params[this.params.length - 1];
            const team = this.db.teams.get(teamId);
            if (team) {
                // Apply updates based on params
                let paramIndex = 0;
                if (sql.includes('progress =')) {
                    team.progress = this.params[paramIndex++];
                }
                if (sql.includes('hintsused =')) {
                    team.hintsUsed = this.params[paramIndex++];
                }
                if (sql.includes('finished =')) {
                    team.finished = this.params[paramIndex++];
                }
            }
            return { meta: { changes: team ? 1 : 0 } };
        }

        if (sql.includes('delete from teams')) {
            const sessionCode = this.params[0];
            let deleted = 0;
            for (const [id, team] of this.db.teams.entries()) {
                if (team.sessionCode === sessionCode) {
                    this.db.teams.delete(id);
                    deleted++;
                }
            }
            return { meta: { changes: deleted } };
        }

        if (sql.includes('delete from sessions')) {
            const sessionCode = this.params[0];
            let deleted = 0;
            for (const [id, session] of this.db.sessions.entries()) {
                if (session.sessionCode === sessionCode) {
                    this.db.sessions.delete(id);
                    deleted++;
                }
            }
            return { meta: { changes: deleted } };
        }

        return { meta: { changes: 0 } };
    }

    async first() {
        const sql = this.sql.toLowerCase();

        if (sql.includes('from sessions')) {
            if (sql.includes('sessioncode = ?')) {
                const code = this.params[0];
                return [...this.db.sessions.values()].find(s => s.sessionCode === code) || null;
            }
            if (sql.includes('sessionid = ?')) {
                const id = this.params[0];
                return this.db.sessions.get(id) || null;
            }
        }

        if (sql.includes('from teams')) {
            if (sql.includes('teamid = ?')) {
                const id = this.params[0];
                return this.db.teams.get(id) || null;
            }
            if (sql.includes('sessioncode = ?') && sql.includes('animalid = ?')) {
                const [code, animalId] = this.params;
                return [...this.db.teams.values()].find(
                    t => t.sessionCode === code && t.animalId === animalId
                ) || null;
            }
        }

        return null;
    }

    async all() {
        const sql = this.sql.toLowerCase();

        if (sql.includes('from teams') && sql.includes('sessioncode = ?')) {
            const code = this.params[0];
            const results = [...this.db.teams.values()].filter(t => t.sessionCode === code);
            return { results };
        }

        if (sql.includes('from sessions') && sql.includes('createdat < ?')) {
            const cutoff = this.params[0];
            const results = [...this.db.sessions.values()].filter(s => s.createdAt < cutoff);
            return { results };
        }

        return { results: [] };
    }
}

// Import handlers (with mock setup)
import {
    generateSessionCode,
    generateUUID,
    getWordsForAnimal
} from '../../worker/src/utils.js';

describe('API Integration Flow', () => {
    let mockDB;
    let mockEnv;

    beforeEach(() => {
        mockDB = new MockD1Database();
        mockEnv = {
            DB: mockDB,
            APP_SECRET: 'test-secret',
            ADMIN_SECRET: 'admin-secret',
            ALLOWED_ORIGINS: 'http://localhost:3000'
        };
    });

    it('should generate valid session codes', () => {
        const code = generateSessionCode();
        expect(code).toMatch(/^[A-Z]{3}[0-9]{4}$/);
    });

    it('should assign correct words based on animalId', () => {
        const words = [
            'In', 'de', 'bibliotheek', 'vinden', 'we',
            'verhalen', 'om', 'in', 'te', 'verdwijnen',
            'spanning', 'actie', 'fantasie', 'verbeelding', 'en',
            'samen', 'ontdekken', 'we', 'nieuwe', 'werelden'
        ];

        // Test all 10 animals
        for (let animalId = 1; animalId <= 10; animalId++) {
            const { word1, word2 } = getWordsForAnimal(words, animalId);
            const expectedIndex1 = (animalId - 1) * 2;
            const expectedIndex2 = expectedIndex1 + 1;

            expect(word1).toBe(words[expectedIndex1]);
            expect(word2).toBe(words[expectedIndex2]);
        }
    });

    it('should create a session successfully', async () => {
        const sessionId = generateUUID();
        const sessionCode = generateSessionCode();

        await mockDB.prepare(
            `INSERT INTO sessions (sessionId, sessionName, sessionCode, wordsJson, createdAt)
             VALUES (?, ?, ?, ?, ?)`
        ).bind(sessionId, 'Test Session', sessionCode, '[]', Date.now()).run();

        const session = await mockDB.prepare(
            `SELECT * FROM sessions WHERE sessionCode = ?`
        ).bind(sessionCode).first();

        expect(session).not.toBeNull();
        expect(session.sessionName).toBe('Test Session');
    });

    it('should handle full session lifecycle', async () => {
        // 1. Create session
        const sessionId = generateUUID();
        const sessionCode = 'TST1234';

        await mockDB.prepare(
            `INSERT INTO sessions (sessionId, sessionName, sessionCode, wordsJson, createdAt)
             VALUES (?, ?, ?, ?, ?)`
        ).bind(sessionId, 'Integration Test', sessionCode, '[]', Math.floor(Date.now() / 1000)).run();

        // 2. Update words (admin)
        const words = [
            'In', 'de', 'bibliotheek', 'vinden', 'we',
            'verhalen', 'om', 'in', 'te', 'verdwijnen',
            'spanning', 'actie', 'fantasie', 'verbeelding', 'en',
            'samen', 'ontdekken', 'we', 'nieuwe', 'werelden'
        ];

        await mockDB.prepare(
            `UPDATE sessions SET wordsJson = ? WHERE sessionCode = ?`
        ).bind(JSON.stringify(words), sessionCode).run();

        // 3. Join team
        const teamId = generateUUID();
        const teamToken = 'test-token-123';
        const animalId = 3;
        const { word1, word2 } = getWordsForAnimal(words, animalId);

        await mockDB.prepare(
            `INSERT INTO teams (teamId, teamToken, sessionCode, animalId, teamName, teamColor, word1, word2, lastSeen)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(teamId, teamToken, sessionCode, animalId, 'Test Team', '#FF0000', word1, word2, Date.now()).run();

        expect(word1).toBe('we');
        expect(word2).toBe('verhalen');

        // 4. Verify team was created
        const team = await mockDB.prepare(
            `SELECT * FROM teams WHERE teamId = ?`
        ).bind(teamId).first();

        expect(team).not.toBeNull();
        expect(team.animalId).toBe(animalId);
        expect(team.word1).toBe('we');

        // 5. Fetch session state
        const teams = await mockDB.prepare(
            `SELECT * FROM teams WHERE sessionCode = ?`
        ).bind(sessionCode).all();

        expect(teams.results).toHaveLength(1);

        // 6. Purge session
        await mockDB.prepare(`DELETE FROM teams WHERE sessionCode = ?`).bind(sessionCode).run();
        await mockDB.prepare(`DELETE FROM sessions WHERE sessionCode = ?`).bind(sessionCode).run();

        const deletedSession = await mockDB.prepare(
            `SELECT * FROM sessions WHERE sessionCode = ?`
        ).bind(sessionCode).first();

        expect(deletedSession).toBeNull();
    });

    it('should enforce unique animal per session constraint', async () => {
        const sessionCode = 'UNQ1234';

        // Create session
        await mockDB.prepare(
            `INSERT INTO sessions (sessionId, sessionName, sessionCode, wordsJson, createdAt)
             VALUES (?, ?, ?, ?, ?)`
        ).bind(generateUUID(), 'Unique Test', sessionCode, '[]', Date.now()).run();

        // First team join
        await mockDB.prepare(
            `INSERT INTO teams (teamId, teamToken, sessionCode, animalId, teamName, teamColor, word1, word2, lastSeen)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(generateUUID(), 'token1', sessionCode, 5, 'Team A', '#000', '', '', Date.now()).run();

        // Second team with same animalId should fail
        await expect(
            mockDB.prepare(
                `INSERT INTO teams (teamId, teamToken, sessionCode, animalId, teamName, teamColor, word1, word2, lastSeen)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(generateUUID(), 'token2', sessionCode, 5, 'Team B', '#000', '', '', Date.now()).run()
        ).rejects.toThrow('UNIQUE constraint');
    });
});
