/**
 * Unit tests for utils.js
 */
import { describe, it, expect } from 'vitest';
import { seededShuffle, stringToSeed, formatTime, Storage } from '../../js/utils.js';

describe('seededShuffle', () => {
    it('should return array of same length', () => {
        const input = [1, 2, 3, 4, 5];
        const result = seededShuffle(input, 12345);
        expect(result).toHaveLength(5);
    });

    it('should contain all original elements', () => {
        const input = [1, 2, 3, 4, 5];
        const result = seededShuffle(input, 12345);
        expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it('should be deterministic with same seed', () => {
        const input = [1, 2, 3, 4, 5];
        const result1 = seededShuffle(input, 42);
        const result2 = seededShuffle(input, 42);
        expect(result1).toEqual(result2);
    });

    it('should produce different results with different seeds', () => {
        const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const result1 = seededShuffle(input, 1);
        const result2 = seededShuffle(input, 999);
        // Very unlikely to be the same
        expect(result1).not.toEqual(result2);
    });

    it('should not mutate original array', () => {
        const input = [1, 2, 3, 4, 5];
        const original = [...input];
        seededShuffle(input, 12345);
        expect(input).toEqual(original);
    });

    it('should handle empty array', () => {
        const result = seededShuffle([], 12345);
        expect(result).toEqual([]);
    });

    it('should handle single element array', () => {
        const result = seededShuffle([42], 12345);
        expect(result).toEqual([42]);
    });
});

describe('stringToSeed', () => {
    it('should return consistent values for same input', () => {
        expect(stringToSeed('test')).toBe(stringToSeed('test'));
        expect(stringToSeed('hello')).toBe(stringToSeed('hello'));
    });

    it('should return different values for different inputs', () => {
        expect(stringToSeed('abc')).not.toBe(stringToSeed('xyz'));
    });

    it('should return 0 for empty string', () => {
        expect(stringToSeed('')).toBe(0);
    });

    it('should handle long strings', () => {
        const longString = 'a'.repeat(1000);
        const result = stringToSeed(longString);
        expect(typeof result).toBe('number');
        expect(Number.isInteger(result)).toBe(true);
    });

    it('should produce 32-bit integers', () => {
        const result = stringToSeed('some random string with various characters 123456');
        expect(result).toBeGreaterThanOrEqual(-2147483648);
        expect(result).toBeLessThanOrEqual(2147483647);
    });
});

describe('formatTime', () => {
    it('should format 0 seconds as 00:00', () => {
        expect(formatTime(0)).toBe('00:00');
    });

    it('should format seconds under a minute', () => {
        expect(formatTime(5)).toBe('00:05');
        expect(formatTime(30)).toBe('00:30');
        expect(formatTime(59)).toBe('00:59');
    });

    it('should format exactly one minute', () => {
        expect(formatTime(60)).toBe('01:00');
    });

    it('should format minutes and seconds', () => {
        expect(formatTime(65)).toBe('01:05');
        expect(formatTime(125)).toBe('02:05');
        expect(formatTime(599)).toBe('09:59');
    });

    it('should format 10+ minutes with leading zeros', () => {
        expect(formatTime(600)).toBe('10:00');
        expect(formatTime(3600)).toBe('60:00');
    });

    it('should handle 45 minutes (max game time)', () => {
        expect(formatTime(45 * 60)).toBe('45:00');
    });
});

describe('Storage', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('get', () => {
        it('should return null for non-existent key', () => {
            expect(Storage.get('nonexistent')).toBeNull();
        });

        it('should parse JSON values', () => {
            localStorage.setItem('test', JSON.stringify({ foo: 'bar' }));
            expect(Storage.get('test')).toEqual({ foo: 'bar' });
        });

        it('should return null for invalid JSON', () => {
            localStorage.setItem('test', 'not-valid-json');
            expect(Storage.get('test')).toBeNull();
        });
    });

    describe('set', () => {
        it('should stringify and store values', () => {
            Storage.set('test', { foo: 'bar' });
            expect(localStorage.getItem('test')).toBe('{"foo":"bar"}');
        });

        it('should handle primitive values', () => {
            Storage.set('number', 42);
            Storage.set('string', 'hello');
            Storage.set('bool', true);

            expect(Storage.get('number')).toBe(42);
            expect(Storage.get('string')).toBe('hello');
            expect(Storage.get('bool')).toBe(true);
        });

        it('should handle arrays', () => {
            Storage.set('arr', [1, 2, 3]);
            expect(Storage.get('arr')).toEqual([1, 2, 3]);
        });
    });

    describe('remove', () => {
        it('should remove existing key', () => {
            Storage.set('test', 'value');
            Storage.remove('test');
            expect(Storage.get('test')).toBeNull();
        });

        it('should not throw for non-existent key', () => {
            expect(() => Storage.remove('nonexistent')).not.toThrow();
        });
    });

    describe('clear', () => {
        it('should remove all keys', () => {
            Storage.set('key1', 'value1');
            Storage.set('key2', 'value2');
            Storage.clear();
            expect(Storage.get('key1')).toBeNull();
            expect(Storage.get('key2')).toBeNull();
        });
    });
});
