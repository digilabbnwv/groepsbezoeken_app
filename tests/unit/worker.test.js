/**
 * Unit Tests for Cloudflare Worker utilities
 * 
 * Run with: npm run test:worker
 */

import { describe, it, expect } from 'vitest';
import {
    generateSessionCode,
    generateUUID,
    generateTeamToken,
    getWordsForAnimal
} from '../../worker/src/utils.js';

describe('generateSessionCode', () => {
    it('should generate a 7-character code', () => {
        const code = generateSessionCode();
        expect(code).toHaveLength(7);
    });

    it('should generate uppercase alphanumeric codes', () => {
        const code = generateSessionCode();
        expect(code).toMatch(/^[A-Z]{3}[0-9]{4}$/);
    });

    it('should not contain confusing characters (I, O)', () => {
        // Generate many codes and check none contain I or O
        for (let i = 0; i < 100; i++) {
            const code = generateSessionCode();
            expect(code).not.toContain('I');
            expect(code).not.toContain('O');
        }
    });

    it('should generate unique codes (probabilistic)', () => {
        const codes = new Set();
        for (let i = 0; i < 100; i++) {
            codes.add(generateSessionCode());
        }
        // With 7 chars, collisions in 100 codes would be extremely rare
        expect(codes.size).toBe(100);
    });
});

describe('generateUUID', () => {
    it('should generate valid UUID format', () => {
        const uuid = generateUUID();
        expect(uuid).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
    });

    it('should generate unique UUIDs', () => {
        const uuids = new Set();
        for (let i = 0; i < 100; i++) {
            uuids.add(generateUUID());
        }
        expect(uuids.size).toBe(100);
    });
});

describe('generateTeamToken', () => {
    it('should generate a 32-character token', () => {
        const token = generateTeamToken();
        expect(token).toHaveLength(32);
    });

    it('should contain only alphanumeric characters', () => {
        const token = generateTeamToken();
        expect(token).toMatch(/^[A-Za-z0-9]{32}$/);
    });

    it('should generate unique tokens', () => {
        const tokens = new Set();
        for (let i = 0; i < 100; i++) {
            tokens.add(generateTeamToken());
        }
        expect(tokens.size).toBe(100);
    });
});

describe('getWordsForAnimal', () => {
    const testWords = [
        'In', 'de',          // animalId 1
        'bibliotheek', 'vinden', // animalId 2
        'we', 'verhalen',    // animalId 3
        'om', 'in',          // animalId 4
        'te', 'verdwijnen',  // animalId 5
        'spanning', 'actie', // animalId 6
        'fantasie', 'verbeelding', // animalId 7
        'en', 'samen',       // animalId 8
        'ontdekken', 'we',   // animalId 9
        'nieuwe', 'werelden' // animalId 10
    ];

    it('should return correct words for animalId 1', () => {
        const { word1, word2 } = getWordsForAnimal(testWords, 1);
        expect(word1).toBe('In');
        expect(word2).toBe('de');
    });

    it('should return correct words for animalId 5', () => {
        const { word1, word2 } = getWordsForAnimal(testWords, 5);
        expect(word1).toBe('te');
        expect(word2).toBe('verdwijnen');
    });

    it('should return correct words for animalId 10', () => {
        const { word1, word2 } = getWordsForAnimal(testWords, 10);
        expect(word1).toBe('nieuwe');
        expect(word2).toBe('werelden');
    });

    it('should return empty strings for empty words array', () => {
        const { word1, word2 } = getWordsForAnimal([], 1);
        expect(word1).toBe('');
        expect(word2).toBe('');
    });

    it('should return empty strings for insufficient words', () => {
        const { word1, word2 } = getWordsForAnimal(['only', 'five', 'words', 'here', 'see'], 5);
        expect(word1).toBe('');
        expect(word2).toBe('');
    });

    it('should handle null/undefined words array', () => {
        const result1 = getWordsForAnimal(null, 1);
        expect(result1.word1).toBe('');
        expect(result1.word2).toBe('');

        const result2 = getWordsForAnimal(undefined, 1);
        expect(result2.word1).toBe('');
        expect(result2.word2).toBe('');
    });
});
