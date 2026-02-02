/**
 * Unit tests for payloadBuilder.js
 */
import { describe, it, expect } from 'vitest';
import {
    SOLUTION_SENTENCE,
    getTeamWords,
    buildCreateSessionPayload,
    buildJoinTeamPayload,
    buildUpdateTeamPayload,
    buildAdminUpdateWordsPayload,
    buildPurgeSessionPayload
} from '../../js/payloadBuilder.js';

describe('SOLUTION_SENTENCE', () => {
    it('should have exactly 20 words', () => {
        expect(SOLUTION_SENTENCE).toHaveLength(20);
    });

    it('should start with "In"', () => {
        expect(SOLUTION_SENTENCE[0]).toBe('In');
    });

    it('should end with "werelden"', () => {
        expect(SOLUTION_SENTENCE[19]).toBe('werelden');
    });
});

describe('getTeamWords', () => {
    it('should return correct words for animalId 1', () => {
        const result = getTeamWords(1);
        expect(result.word1).toBe('In');
        expect(result.word2).toBe('de');
        expect(result.index1).toBe(1);
        expect(result.index2).toBe(2);
    });

    it('should return correct words for animalId 5', () => {
        const result = getTeamWords(5);
        // animalId 5: index (5-1)*2 = 8, and 9
        // SOLUTION_SENTENCE[8] = "te", SOLUTION_SENTENCE[9] = "verdwijnen"
        expect(result.word1).toBe('te');
        expect(result.word2).toBe('verdwijnen');
        expect(result.index1).toBe(9);  // 1-indexed for display
        expect(result.index2).toBe(10);
    });

    it('should return correct words for animalId 10', () => {
        const result = getTeamWords(10);
        expect(result.word1).toBe('nieuwe');
        expect(result.word2).toBe('werelden');
        expect(result.index1).toBe(19);
        expect(result.index2).toBe(20);
    });

    it('should return "???" for invalid animalId', () => {
        const result = getTeamWords(11);
        expect(result.word1).toBe('???');
        expect(result.word2).toBe('???');
    });
});

describe('buildCreateSessionPayload', () => {
    it('should build valid payload', () => {
        const payload = buildCreateSessionPayload('secret123', 'Groep 6B');
        expect(payload).toEqual({
            secret: 'secret123',
            sessionName: 'Groep 6B'
        });
    });

    it('should trim whitespace', () => {
        const payload = buildCreateSessionPayload('  secret  ', '  Session Name  ');
        expect(payload.secret).toBe('secret');
        expect(payload.sessionName).toBe('Session Name');
    });

    it('should throw on missing secret', () => {
        expect(() => buildCreateSessionPayload('', 'Name')).toThrow('Secret is verplicht');
        expect(() => buildCreateSessionPayload(null, 'Name')).toThrow('Secret is verplicht');
    });

    it('should throw on missing sessionName', () => {
        expect(() => buildCreateSessionPayload('secret', '')).toThrow('SessionName is verplicht');
        expect(() => buildCreateSessionPayload('secret', null)).toThrow('SessionName is verplicht');
    });
});

describe('buildJoinTeamPayload', () => {
    it('should build valid payload with required fields', () => {
        const payload = buildJoinTeamPayload({
            secret: 'secret123',
            sessionCode: 'abc1234',
            animalId: 1
        });

        expect(payload.secret).toBe('secret123');
        expect(payload.sessionCode).toBe('ABC1234'); // uppercase
        expect(payload.animalId).toBe(1);
        expect(payload.word1).toBe('In');
        expect(payload.word2).toBe('de');
    });

    it('should include optional fields when provided', () => {
        const payload = buildJoinTeamPayload({
            secret: 'secret',
            sessionCode: 'ABC123',
            animalId: 3,
            teamName: "Lollige Leeuwen",
            teamColor: '#E9C46A'
        });

        expect(payload.teamName).toBe("Lollige Leeuwen");
        expect(payload.teamColor).toBe('#E9C46A');
    });

    it('should throw on invalid animalId', () => {
        expect(() => buildJoinTeamPayload({
            secret: 'secret',
            sessionCode: 'ABC',
            animalId: 0
        })).toThrow('AnimalId moet tussen 1 en 10 liggen');

        expect(() => buildJoinTeamPayload({
            secret: 'secret',
            sessionCode: 'ABC',
            animalId: 11
        })).toThrow('AnimalId moet tussen 1 en 10 liggen');
    });

    it('should throw on missing required fields', () => {
        expect(() => buildJoinTeamPayload({
            sessionCode: 'ABC',
            animalId: 1
        })).toThrow('Secret is verplicht');

        expect(() => buildJoinTeamPayload({
            secret: 'secret',
            animalId: 1
        })).toThrow('SessionCode is verplicht');
    });
});

describe('buildUpdateTeamPayload', () => {
    const baseParams = {
        secret: 'secret',
        teamId: 'team-1',
        teamToken: 'token-123'
    };

    it('should build payload with required fields only', () => {
        const payload = buildUpdateTeamPayload(baseParams);
        expect(payload).toEqual({
            secret: 'secret',
            teamId: 'team-1',
            teamToken: 'token-123'
        });
    });

    it('should include optional progress', () => {
        const payload = buildUpdateTeamPayload({
            ...baseParams,
            progress: 5
        });
        expect(payload.progress).toBe(5);
    });

    it('should include optional finished flag', () => {
        const payload = buildUpdateTeamPayload({
            ...baseParams,
            finished: true
        });
        expect(payload.finished).toBe(true);
    });

    it('should throw on progress out of range', () => {
        expect(() => buildUpdateTeamPayload({
            ...baseParams,
            progress: -1
        })).toThrow('Progress moet tussen 0 en 12 liggen');

        expect(() => buildUpdateTeamPayload({
            ...baseParams,
            progress: 13
        })).toThrow('Progress moet tussen 0 en 12 liggen');
    });

    it('should throw on hintsUsed out of range', () => {
        expect(() => buildUpdateTeamPayload({
            ...baseParams,
            hintsUsed: 4
        })).toThrow('HintsUsed moet tussen 0 en 3 liggen');
    });

    it('should clamp negative timePenaltySeconds to 0', () => {
        const payload = buildUpdateTeamPayload({
            ...baseParams,
            timePenaltySeconds: -10
        });
        expect(payload.timePenaltySeconds).toBe(0);
    });

    it('should throw on missing required fields', () => {
        expect(() => buildUpdateTeamPayload({
            teamId: 'team-1',
            teamToken: 'token'
        })).toThrow('Secret is verplicht');

        expect(() => buildUpdateTeamPayload({
            secret: 'secret',
            teamToken: 'token'
        })).toThrow('TeamId is verplicht');

        expect(() => buildUpdateTeamPayload({
            secret: 'secret',
            teamId: 'team-1'
        })).toThrow('TeamToken is verplicht');
    });
});

describe('buildAdminUpdateWordsPayload', () => {
    it('should build valid payload', () => {
        const words = Array(20).fill('test');
        const payload = buildAdminUpdateWordsPayload({
            secret: 'secret',
            sessionCode: 'ABC123',
            words
        });

        expect(payload.secret).toBe('secret');
        expect(payload.sessionCode).toBe('ABC123');
        expect(payload.words).toHaveLength(20);
    });

    it('should pad array to 20 items', () => {
        const payload = buildAdminUpdateWordsPayload({
            secret: 'secret',
            sessionCode: 'ABC',
            words: ['word1', 'word2']
        });

        expect(payload.words).toHaveLength(20);
        expect(payload.words[0]).toBe('word1');
        expect(payload.words[19]).toBe('');
    });

    it('should truncate array to 20 items', () => {
        const words = Array(25).fill('word');
        const payload = buildAdminUpdateWordsPayload({
            secret: 'secret',
            sessionCode: 'ABC',
            words
        });

        expect(payload.words).toHaveLength(20);
    });

    it('should throw on non-array words', () => {
        expect(() => buildAdminUpdateWordsPayload({
            secret: 'secret',
            sessionCode: 'ABC',
            words: 'not an array'
        })).toThrow('Words moet een array zijn');
    });
});

describe('buildPurgeSessionPayload', () => {
    it('should build payload with secret only', () => {
        const payload = buildPurgeSessionPayload({ secret: 'secret' });
        expect(payload).toEqual({ secret: 'secret' });
    });

    it('should include sessionCode when provided', () => {
        const payload = buildPurgeSessionPayload({
            secret: 'secret',
            sessionCode: 'ABC123'
        });
        expect(payload.sessionCode).toBe('ABC123');
    });

    it('should throw on missing secret', () => {
        expect(() => buildPurgeSessionPayload({})).toThrow('Secret is verplicht');
    });
});
