/**
 * Unit tests for constants.js
 */
import { describe, it, expect } from 'vitest';
import {
    ANIMALS,
    getAnimalById,
    getAnimalByTeamName,
    getAnimalIcon,
    VALID_PINS,
    GAME_CONFIG,
    SOLUTION_WORDS,
    SOLUTION_SENTENCE_TEXT
} from '../../js/constants.js';

describe('ANIMALS', () => {
    it('should have exactly 10 animals', () => {
        expect(ANIMALS).toHaveLength(10);
    });

    it('should have sequential IDs from 1 to 10', () => {
        ANIMALS.forEach((animal, index) => {
            expect(animal.id).toBe(index + 1);
        });
    });

    it('should have all required properties', () => {
        ANIMALS.forEach(animal => {
            expect(animal).toHaveProperty('id');
            expect(animal).toHaveProperty('name');
            expect(animal).toHaveProperty('teamName');
            expect(animal).toHaveProperty('color');
            expect(animal).toHaveProperty('icon');
        });
    });

    it('should have unique team names', () => {
        const teamNames = ANIMALS.map(a => a.teamName);
        const uniqueNames = [...new Set(teamNames)];
        expect(uniqueNames).toHaveLength(10);
    });

    it('should have valid hex colors', () => {
        ANIMALS.forEach(animal => {
            expect(animal.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
    });
});

describe('getAnimalById', () => {
    it('should return correct animal for valid ID', () => {
        const panda = getAnimalById(1);
        expect(panda.name).toBe('Panda');
        expect(panda.teamName).toBe("Pittige Panda's");
    });

    it('should return null for invalid ID', () => {
        expect(getAnimalById(0)).toBeNull();
        expect(getAnimalById(11)).toBeNull();
        expect(getAnimalById(-1)).toBeNull();
    });

    it('should return null for non-number', () => {
        expect(getAnimalById('1')).toBeNull();
        expect(getAnimalById(null)).toBeNull();
    });
});

describe('getAnimalByTeamName', () => {
    it('should return correct animal for valid team name', () => {
        const panda = getAnimalByTeamName("Pittige Panda's");
        expect(panda.id).toBe(1);
        expect(panda.name).toBe('Panda');
    });

    it('should return null for unknown team name', () => {
        expect(getAnimalByTeamName('Unknown Team')).toBeNull();
    });

    it('should be case-sensitive', () => {
        expect(getAnimalByTeamName("pittige panda's")).toBeNull();
    });
});

describe('getAnimalIcon', () => {
    it('should return correct icon for animal name', () => {
        expect(getAnimalIcon('Panda')).toBe('🐼');
        expect(getAnimalIcon('Leeuw')).toBe('🦁');
        expect(getAnimalIcon('Dolfijn')).toBe('🐬');
    });

    it('should handle partial matches', () => {
        expect(getAnimalIcon('De Panda zegt')).toBe('🐼');
    });

    it('should return default icon for unknown animals', () => {
        expect(getAnimalIcon('Unknown')).toBe('🐾');
        expect(getAnimalIcon('')).toBe('🐾');
    });
});

describe('VALID_PINS', () => {
    it('should contain expected vestigingscodes', () => {
        expect(VALID_PINS).toContain('7300');
        expect(VALID_PINS).toContain('6801');
        expect(VALID_PINS).toContain('6800');
        expect(VALID_PINS).toContain('4500');
        expect(VALID_PINS).toContain('3800');
    });

    it('should all be 4-digit strings', () => {
        VALID_PINS.forEach(pin => {
            expect(pin).toMatch(/^\d{4}$/);
        });
    });
});

describe('GAME_CONFIG', () => {
    it('should have correct number of questions', () => {
        expect(GAME_CONFIG.TOTAL_QUESTIONS).toBe(12);
    });

    it('should have correct max attempts', () => {
        expect(GAME_CONFIG.MAX_ATTEMPTS_PER_QUESTION).toBe(2);
    });

    it('should have correct max hints', () => {
        expect(GAME_CONFIG.MAX_HINTS).toBe(3);
    });

    it('should have reasonable penalty time', () => {
        expect(GAME_CONFIG.PENALTY_SECONDS).toBe(30);
    });

    it('should have 45 minute max time', () => {
        expect(GAME_CONFIG.MAX_TIME_SECONDS).toBe(45 * 60);
    });

    it('should have reasonable polling interval', () => {
        expect(GAME_CONFIG.POLLING_INTERVAL).toBeGreaterThanOrEqual(1000);
        expect(GAME_CONFIG.POLLING_INTERVAL).toBeLessThanOrEqual(10000);
    });
});

describe('SOLUTION_WORDS', () => {
    it('should have exactly 20 words', () => {
        expect(SOLUTION_WORDS).toHaveLength(20);
    });

    it('should match expected first and last words', () => {
        expect(SOLUTION_WORDS[0]).toBe('In');
        expect(SOLUTION_WORDS[19]).toBe('werelden');
    });

    it('should form complete sentence', () => {
        expect(SOLUTION_WORDS.join(' ')).toContain('bibliotheek');
        expect(SOLUTION_WORDS.join(' ')).toContain('verhalen');
    });
});

describe('SOLUTION_SENTENCE_TEXT', () => {
    it('should contain all solution words', () => {
        SOLUTION_WORDS.forEach(word => {
            expect(SOLUTION_SENTENCE_TEXT.toLowerCase()).toContain(word.toLowerCase());
        });
    });

    it('should be a readable sentence', () => {
        expect(SOLUTION_SENTENCE_TEXT).toMatch(/[A-Z].*\.$/); // Starts with capital, ends with period
    });
});
