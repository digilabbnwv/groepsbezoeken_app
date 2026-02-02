/**
 * Utility functions for ID generation
 */

/**
 * Generate a session code (7 characters, uppercase alphanumeric)
 * Format: ABC1234 (3 letters + 4 digits for readability)
 * 
 * @returns {string} - Session code like "XYZ4829"
 */
export function generateSessionCode() {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluding I, O to avoid confusion
    const digits = '0123456789';

    let code = '';

    // 3 letters
    for (let i = 0; i < 3; i++) {
        code += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    // 4 digits
    for (let i = 0; i < 4; i++) {
        code += digits.charAt(Math.floor(Math.random() * digits.length));
    }

    return code;
}

/**
 * Generate a UUID v4
 * Uses crypto.randomUUID() if available, otherwise fallback
 * 
 * @returns {string} - UUID like "550e8400-e29b-41d4-a716-446655440000"
 */
export function generateUUID() {
    // Use native crypto if available (Workers support this)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    // Fallback implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Generate a secure token for team authentication
 * 32 characters, alphanumeric
 * 
 * @returns {string} - Token like "aB3xY9kL..."
 */
export function generateTeamToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 32;

    let token = '';

    // Use crypto.getRandomValues for better randomness
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint32Array(length);
        crypto.getRandomValues(array);
        for (let i = 0; i < length; i++) {
            token += chars.charAt(array[i] % chars.length);
        }
    } else {
        // Fallback
        for (let i = 0; i < length; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }

    return token;
}

/**
 * Get words for a team based on animalId
 * Each team gets 2 consecutive words from the 20-word array
 * 
 * @param {Array<string>} words - Array of 20 words
 * @param {number} animalId - Animal ID (1-10)
 * @returns {{ word1: string, word2: string }}
 */
export function getWordsForAnimal(words, animalId) {
    if (!Array.isArray(words) || words.length < 20) {
        return { word1: '', word2: '' };
    }

    // animalId 1 -> words[0], words[1]
    // animalId 2 -> words[2], words[3]
    // etc.
    const index1 = (animalId - 1) * 2;
    const index2 = index1 + 1;

    return {
        word1: words[index1] || '',
        word2: words[index2] || ''
    };
}

/**
 * Create a JSON response with CORS headers
 */
export function jsonResponse(data, status, env) {
    // Import corsHeaders dynamically to avoid circular dependency
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': (env.ALLOWED_ORIGINS || '').split(',')[0] || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
    };

    return new Response(JSON.stringify(data), {
        status,
        headers
    });
}
