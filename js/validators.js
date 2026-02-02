/**
 * Validators
 * Pure validatie functies voor data integriteit.
 */

import { SOLUTION_SENTENCE } from './payloadBuilder.js';

/**
 * Valideert een sessie code
 * @param {string} code - De te valideren code
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSessionCode(code) {
    if (!code || typeof code !== 'string') {
        return { valid: false, error: 'Sessie code is verplicht' };
    }

    const normalized = code.trim().toUpperCase();

    if (normalized.length < 3) {
        return { valid: false, error: 'Code moet minimaal 3 tekens zijn' };
    }
    if (normalized.length > 7) {
        return { valid: false, error: 'Code mag maximaal 7 tekens zijn' };
    }
    if (!/^[A-Z0-9]+$/.test(normalized)) {
        return { valid: false, error: 'Code mag alleen letters en cijfers bevatten' };
    }

    return { valid: true };
}

/**
 * Valideert een animalId
 * @param {number} animalId - Het te valideren ID
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateAnimalId(animalId) {
    if (typeof animalId !== 'number' || !Number.isInteger(animalId)) {
        return { valid: false, error: 'AnimalId moet een geheel getal zijn' };
    }
    if (animalId < 1 || animalId > 10) {
        return { valid: false, error: 'AnimalId moet tussen 1 en 10 liggen' };
    }
    return { valid: true };
}

/**
 * Valideert een voortgangswaarde
 * @param {number} progress - De te valideren voortgang
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateProgress(progress) {
    if (typeof progress !== 'number' || !Number.isInteger(progress)) {
        return { valid: false, error: 'Progress moet een geheel getal zijn' };
    }
    if (progress < 0 || progress > 12) {
        return { valid: false, error: 'Progress moet tussen 0 en 12 liggen' };
    }
    return { valid: true };
}

/**
 * Valideert een words array
 * @param {string[]} words - De te valideren woorden array
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateWordsArray(words) {
    if (!Array.isArray(words)) {
        return { valid: false, error: 'Words moet een array zijn' };
    }
    if (words.length !== 20) {
        return { valid: false, error: 'Words moet exact 20 items bevatten' };
    }
    if (!words.every(w => typeof w === 'string')) {
        return { valid: false, error: 'Alle woorden moeten strings zijn' };
    }
    return { valid: true };
}

/**
 * Valideert een hex kleurcode
 * @param {string} color - De te valideren kleur
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateHexColor(color) {
    if (!color || typeof color !== 'string') {
        return { valid: false, error: 'Kleur is verplicht' };
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return { valid: false, error: 'Kleur moet een geldige hex code zijn (#RRGGBB)' };
    }
    return { valid: true };
}

/**
 * Controleert of een woord overeenkomt met het oplossingswoord op die positie
 * @param {string} word - Het ingevoerde woord
 * @param {number} index - De positie (0-indexed)
 * @returns {{ matches: boolean, expected: string }}
 */
export function checkWordMatch(word, index) {
    if (index < 0 || index >= SOLUTION_SENTENCE.length) {
        return { matches: false, expected: '' };
    }

    const expected = SOLUTION_SENTENCE[index];
    const normalizedWord = (word || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const normalizedExpected = expected.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

    return {
        matches: normalizedWord === normalizedExpected,
        expected
    };
}

/**
 * Controleert of alle woorden correct zijn
 * @param {string[]} words - Array van 20 woorden
 * @returns {{ allCorrect: boolean, incorrectIndices: number[] }}
 */
export function checkAllWords(words) {
    const incorrectIndices = [];

    for (let i = 0; i < 20; i++) {
        const { matches } = checkWordMatch(words[i] || '', i);
        if (!matches) {
            incorrectIndices.push(i);
        }
    }

    return {
        allCorrect: incorrectIndices.length === 0,
        incorrectIndices
    };
}

/**
 * Valideert een PIN code (vestigingscode)
 * @param {string} pin - De te valideren PIN
 * @param {string[]} validPins - Lijst van geldige PINs
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePin(pin, validPins = ['7300', '6801', '6800', '4500', '3800']) {
    if (!pin || typeof pin !== 'string') {
        return { valid: false, error: 'PIN is verplicht' };
    }
    if (!/^\d{4}$/.test(pin)) {
        return { valid: false, error: 'PIN moet 4 cijfers zijn' };
    }
    if (!validPins.includes(pin)) {
        return { valid: false, error: 'Ongeldige PIN code' };
    }
    return { valid: true };
}

/**
 * Valideert een team token
 * @param {string} token - Het te valideren token
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateTeamToken(token) {
    if (!token || typeof token !== 'string') {
        return { valid: false, error: 'Team token is verplicht' };
    }
    if (token.length < 1) {
        return { valid: false, error: 'Team token mag niet leeg zijn' };
    }
    return { valid: true };
}
