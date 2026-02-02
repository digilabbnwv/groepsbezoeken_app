/**
 * Unit tests for validators.js
 */
import { describe, it, expect } from 'vitest';
import {
    validateSessionCode,
    validateAnimalId,
    validateProgress,
    validateWordsArray,
    validateHexColor,
    checkWordMatch,
    checkAllWords,
    validatePin,
    validateTeamToken
} from '../../js/validators.js';

describe('validateSessionCode', () => {
    it('should accept valid codes', () => {
        expect(validateSessionCode('ABC').valid).toBe(true);
        expect(validateSessionCode('ABC1234').valid).toBe(true);
        expect(validateSessionCode('123').valid).toBe(true);
        expect(validateSessionCode('A1B2C3D').valid).toBe(true);
    });

    it('should normalize to uppercase', () => {
        expect(validateSessionCode('abc').valid).toBe(true);
    });

    it('should reject codes that are too short', () => {
        const result = validateSessionCode('AB');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('minimaal 3');
    });

    it('should reject codes that are too long', () => {
        const result = validateSessionCode('ABCD1234');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('maximaal 7');
    });

    it('should reject codes with special characters', () => {
        const result = validateSessionCode('ABC-123');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('letters en cijfers');
    });

    it('should reject empty or null codes', () => {
        expect(validateSessionCode('').valid).toBe(false);
        expect(validateSessionCode(null).valid).toBe(false);
        expect(validateSessionCode(undefined).valid).toBe(false);
    });
});

describe('validateAnimalId', () => {
    it('should accept valid IDs (1-10)', () => {
        for (let i = 1; i <= 10; i++) {
            expect(validateAnimalId(i).valid).toBe(true);
        }
    });

    it('should reject 0', () => {
        const result = validateAnimalId(0);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('1 en 10');
    });

    it('should reject numbers > 10', () => {
        expect(validateAnimalId(11).valid).toBe(false);
        expect(validateAnimalId(100).valid).toBe(false);
    });

    it('should reject non-integers', () => {
        expect(validateAnimalId(1.5).valid).toBe(false);
        expect(validateAnimalId('1').valid).toBe(false);
    });
});

describe('validateProgress', () => {
    it('should accept valid progress (0-12)', () => {
        for (let i = 0; i <= 12; i++) {
            expect(validateProgress(i).valid).toBe(true);
        }
    });

    it('should reject negative numbers', () => {
        expect(validateProgress(-1).valid).toBe(false);
    });

    it('should reject numbers > 12', () => {
        expect(validateProgress(13).valid).toBe(false);
    });

    it('should reject non-integers', () => {
        expect(validateProgress(5.5).valid).toBe(false);
    });
});

describe('validateWordsArray', () => {
    it('should accept array of 20 strings', () => {
        const words = Array(20).fill('word');
        expect(validateWordsArray(words).valid).toBe(true);
    });

    it('should accept array of 20 empty strings', () => {
        const words = Array(20).fill('');
        expect(validateWordsArray(words).valid).toBe(true);
    });

    it('should reject non-arrays', () => {
        expect(validateWordsArray('not-array').valid).toBe(false);
        expect(validateWordsArray(null).valid).toBe(false);
        expect(validateWordsArray({}).valid).toBe(false);
    });

    it('should reject arrays with wrong length', () => {
        expect(validateWordsArray(Array(19).fill('')).valid).toBe(false);
        expect(validateWordsArray(Array(21).fill('')).valid).toBe(false);
    });

    it('should reject arrays with non-string items', () => {
        const words = Array(19).fill('word');
        words.push(123);
        expect(validateWordsArray(words).valid).toBe(false);
    });
});

describe('validateHexColor', () => {
    it('should accept valid hex colors', () => {
        expect(validateHexColor('#000000').valid).toBe(true);
        expect(validateHexColor('#FFFFFF').valid).toBe(true);
        expect(validateHexColor('#E86A2A').valid).toBe(true);
        expect(validateHexColor('#e86a2a').valid).toBe(true);
    });

    it('should reject 3-digit hex colors', () => {
        expect(validateHexColor('#FFF').valid).toBe(false);
    });

    it('should reject colors without #', () => {
        expect(validateHexColor('FFFFFF').valid).toBe(false);
    });

    it('should reject invalid hex characters', () => {
        expect(validateHexColor('#GGGGGG').valid).toBe(false);
    });

    it('should reject empty or null', () => {
        expect(validateHexColor('').valid).toBe(false);
        expect(validateHexColor(null).valid).toBe(false);
    });
});

describe('checkWordMatch', () => {
    it('should match exact words', () => {
        expect(checkWordMatch('In', 0).matches).toBe(true);
        expect(checkWordMatch('de', 1).matches).toBe(true);
        expect(checkWordMatch('bibliotheek', 2).matches).toBe(true);
    });

    it('should match case-insensitively', () => {
        expect(checkWordMatch('IN', 0).matches).toBe(true);
        expect(checkWordMatch('De', 1).matches).toBe(true);
        expect(checkWordMatch('BIBLIOTHEEK', 2).matches).toBe(true);
    });

    it('should match with extra whitespace', () => {
        expect(checkWordMatch(' In ', 0).matches).toBe(true);
        expect(checkWordMatch('  de  ', 1).matches).toBe(true);
    });

    it('should handle empty strings', () => {
        expect(checkWordMatch('', 0).matches).toBe(false);
        expect(checkWordMatch(null, 0).matches).toBe(false);
    });

    it('should return expected word', () => {
        const result = checkWordMatch('wrong', 0);
        expect(result.matches).toBe(false);
        expect(result.expected).toBe('In');
    });

    it('should handle out-of-bounds index', () => {
        const result = checkWordMatch('word', 25);
        expect(result.matches).toBe(false);
        expect(result.expected).toBe('');
    });
});

describe('checkAllWords', () => {
    it('should return allCorrect true when all match', () => {
        const words = [
            "In", "de", "bibliotheek", "vinden", "we",
            "verhalen", "om", "in", "te", "verdwijnen",
            "spanning", "actie", "fantasie", "verbeelding", "en",
            "samen", "ontdekken", "we", "nieuwe", "werelden"
        ];
        const result = checkAllWords(words);
        expect(result.allCorrect).toBe(true);
        expect(result.incorrectIndices).toHaveLength(0);
    });

    it('should return incorrect indices for wrong words', () => {
        const words = Array(20).fill('wrong');
        words[0] = 'In';
        words[1] = 'de';

        const result = checkAllWords(words);
        expect(result.allCorrect).toBe(false);
        expect(result.incorrectIndices).toContain(2);
        expect(result.incorrectIndices).not.toContain(0);
        expect(result.incorrectIndices).not.toContain(1);
    });

    it('should handle partial arrays', () => {
        const result = checkAllWords(['In', 'de']);
        expect(result.allCorrect).toBe(false);
        // Indices 2-19 should be marked incorrect
        expect(result.incorrectIndices.length).toBe(18);
    });
});

describe('validatePin', () => {
    it('should accept valid pins', () => {
        expect(validatePin('7300').valid).toBe(true);
        expect(validatePin('6801').valid).toBe(true);
        expect(validatePin('6800').valid).toBe(true);
        expect(validatePin('4500').valid).toBe(true);
        expect(validatePin('3800').valid).toBe(true);
    });

    it('should reject invalid pins', () => {
        expect(validatePin('0000').valid).toBe(false);
        expect(validatePin('9999').valid).toBe(false);
    });

    it('should reject non-4-digit strings', () => {
        expect(validatePin('123').valid).toBe(false);
        expect(validatePin('12345').valid).toBe(false);
    });

    it('should reject non-numeric strings', () => {
        expect(validatePin('abcd').valid).toBe(false);
    });

    it('should accept custom valid pins', () => {
        expect(validatePin('1234', ['1234', '5678']).valid).toBe(true);
        expect(validatePin('9999', ['1234', '5678']).valid).toBe(false);
    });
});

describe('validateTeamToken', () => {
    it('should accept non-empty strings', () => {
        expect(validateTeamToken('token-123').valid).toBe(true);
        expect(validateTeamToken('a').valid).toBe(true);
    });

    it('should reject empty strings', () => {
        expect(validateTeamToken('').valid).toBe(false);
    });

    it('should reject null/undefined', () => {
        expect(validateTeamToken(null).valid).toBe(false);
        expect(validateTeamToken(undefined).valid).toBe(false);
    });
});
