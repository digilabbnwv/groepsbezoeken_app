/**
 * Integration tests for API contract validation
 * Validates that payload builders produce correct output
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import {
    buildCreateSessionPayload,
    buildJoinTeamPayload,
    buildUpdateTeamPayload,
    buildAdminUpdateWordsPayload,
    buildPurgeSessionPayload
} from '../../js/payloadBuilder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('API Contract Validation', () => {
    let examples;

    beforeAll(() => {
        // Load examples
        const examplesPath = join(__dirname, '../../contracts/api.examples.json');
        examples = JSON.parse(readFileSync(examplesPath, 'utf-8'));
    });

    describe('createSession', () => {
        it('should generate payload with required fields', () => {
            const payload = buildCreateSessionPayload('BNWV2026', 'Groep 6B');

            expect(payload).toHaveProperty('secret');
            expect(payload).toHaveProperty('sessionName');
            expect(typeof payload.secret).toBe('string');
            expect(typeof payload.sessionName).toBe('string');
        });

        it('should match example payload structure', () => {
            const payload = buildCreateSessionPayload('BNWV2026', 'Groep 6B - De Leesadventuriers');

            expect(Object.keys(payload).sort()).toEqual(
                Object.keys(examples.createSession.request).sort()
            );
        });
    });

    describe('joinTeam', () => {
        it('should generate payload with all required fields', () => {
            const payload = buildJoinTeamPayload({
                secret: 'BNWV2026',
                sessionCode: 'ABC1234',
                animalId: 1,
                teamName: "Pittige Panda's",
                teamColor: '#E86A2A'
            });

            // Required fields
            expect(payload).toHaveProperty('secret');
            expect(payload).toHaveProperty('sessionCode');
            expect(payload).toHaveProperty('animalId');
            expect(payload).toHaveProperty('word1');
            expect(payload).toHaveProperty('word2');

            // Types
            expect(typeof payload.secret).toBe('string');
            expect(typeof payload.sessionCode).toBe('string');
            expect(typeof payload.animalId).toBe('number');
            expect(typeof payload.word1).toBe('string');
            expect(typeof payload.word2).toBe('string');
        });

        it('should include word1 and word2 based on animalId', () => {
            const payload = buildJoinTeamPayload({
                secret: 'secret',
                sessionCode: 'ABC',
                animalId: 1
            });

            expect(payload.word1).toBe('In');
            expect(payload.word2).toBe('de');
        });

        it('should uppercase session code', () => {
            const payload = buildJoinTeamPayload({
                secret: 'secret',
                sessionCode: 'abc1234',
                animalId: 1
            });

            expect(payload.sessionCode).toBe('ABC1234');
        });

        it('should reject invalid animalId', () => {
            expect(() => buildJoinTeamPayload({
                secret: 'secret',
                sessionCode: 'ABC',
                animalId: 15 // Out of range
            })).toThrow();
        });
    });

    describe('updateTeam', () => {
        it('should generate payload with required fields', () => {
            const payload = buildUpdateTeamPayload({
                secret: 'BNWV2026',
                teamId: 'team-1-abc123',
                teamToken: 'tok-xyz789',
                sessionCode: 'ABC1234',
                progress: 6,
                hintsUsed: 1,
                timePenaltySeconds: 30,
                finished: false
            });

            // Required fields
            expect(payload).toHaveProperty('secret');
            expect(payload).toHaveProperty('teamId');
            expect(payload).toHaveProperty('teamToken');

            // Optional fields should be present when provided
            expect(payload).toHaveProperty('progress');
            expect(payload).toHaveProperty('finished');
        });

        it('should generate valid minimal payload', () => {
            const payload = buildUpdateTeamPayload({
                secret: 'BNWV2026',
                teamId: 'team-1',
                teamToken: 'token-123'
            });

            expect(Object.keys(payload)).toHaveLength(3);
            expect(payload.secret).toBe('BNWV2026');
            expect(payload.teamId).toBe('team-1');
            expect(payload.teamToken).toBe('token-123');
        });

        it('should validate progress bounds', () => {
            expect(() => buildUpdateTeamPayload({
                secret: 'secret',
                teamId: 'team-1',
                teamToken: 'token',
                progress: 15 // Out of range
            })).toThrow();
        });
    });

    describe('adminUpdateWords', () => {
        it('should generate payload with 20 words', () => {
            const words = [
                'In', 'de', 'bibliotheek', 'vinden', 'we',
                'verhalen', 'om', 'in', 'te', 'verdwijnen',
                'spanning', 'actie', 'fantasie', 'verbeelding', 'en',
                'samen', 'ontdekken', 'we', 'nieuwe', 'werelden'
            ];

            const payload = buildAdminUpdateWordsPayload({
                secret: 'BNWV2026',
                sessionCode: 'ABC1234',
                words
            });

            expect(payload).toHaveProperty('secret');
            expect(payload).toHaveProperty('sessionCode');
            expect(payload).toHaveProperty('words');
            expect(payload.words).toHaveLength(20);
        });

        it('should normalize array to 20 items', () => {
            const payload = buildAdminUpdateWordsPayload({
                secret: 'secret',
                sessionCode: 'ABC',
                words: ['word1', 'word2']
            });

            expect(payload.words).toHaveLength(20);
            expect(payload.words[0]).toBe('word1');
            expect(payload.words[1]).toBe('word2');
            expect(payload.words[19]).toBe('');
        });
    });

    describe('purgeSession', () => {
        it('should generate payload with secret', () => {
            const payload = buildPurgeSessionPayload({
                secret: 'BNWV2026',
                sessionCode: 'ABC1234'
            });

            expect(payload).toHaveProperty('secret');
            expect(payload.secret).toBe('BNWV2026');
        });

        it('should optionally include sessionCode', () => {
            const withCode = buildPurgeSessionPayload({
                secret: 'BNWV2026',
                sessionCode: 'ABC1234'
            });

            const withoutCode = buildPurgeSessionPayload({
                secret: 'BNWV2026'
            });

            expect(withCode).toHaveProperty('sessionCode');
            expect(withoutCode).not.toHaveProperty('sessionCode');
        });
    });

    describe('Example files integrity', () => {
        it('should have valid examples.json', () => {
            expect(examples).toHaveProperty('createSession');
            expect(examples).toHaveProperty('fetchSessionState');
            expect(examples).toHaveProperty('joinTeam');
            expect(examples).toHaveProperty('updateTeam');
            expect(examples).toHaveProperty('adminUpdateWords');
            expect(examples).toHaveProperty('purgeSession');
        });

        it('should have request and response for each endpoint', () => {
            expect(examples.createSession).toHaveProperty('request');
            expect(examples.createSession).toHaveProperty('response');
            expect(examples.joinTeam).toHaveProperty('request');
            expect(examples.joinTeam).toHaveProperty('response');
        });

        it('should have valid session code format in examples', () => {
            expect(examples.createSession.response.sessionCode).toMatch(/^[A-Z0-9]{3,7}$/);
        });

        it('should have exactly 20 words in adminUpdateWords example', () => {
            expect(examples.adminUpdateWords.request.words).toHaveLength(20);
        });
    });
});
