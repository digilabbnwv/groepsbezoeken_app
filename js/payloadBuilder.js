/**
 * Payload Builders
 * Pure functies voor het construeren van API payloads.
 * Deze functies zijn stateless en makkelijk te testen.
 */

/**
 * De vaste zin die elk team moet reconstrueren
 * @constant {string[]}
 */
export const SOLUTION_SENTENCE = [
    "In", "de", "bibliotheek", "vinden", "we",
    "verhalen", "om", "in", "te", "verdwijnen",
    "spanning", "actie", "fantasie", "verbeelding", "en",
    "samen", "ontdekken", "we", "nieuwe", "werelden"
];

/**
 * Berekent de twee woorden die bij een team horen op basis van animalId
 * @param {number} animalId - Het ID van het gekozen dier (1-10)
 * @returns {{ word1: string, word2: string, index1: number, index2: number }}
 */
export function getTeamWords(animalId) {
    const index1 = (animalId - 1) * 2;
    const index2 = index1 + 1;

    return {
        word1: SOLUTION_SENTENCE[index1] || "???",
        word2: SOLUTION_SENTENCE[index2] || "???",
        index1: index1 + 1, // 1-indexed for display
        index2: index2 + 1  // 1-indexed for display
    };
}

/**
 * Bouwt de payload voor createSession
 * @param {string} secret - Authenticatie secret
 * @param {string} sessionName - Naam van de sessie
 * @returns {Object} Request payload
 */
export function buildCreateSessionPayload(secret, sessionName) {
    if (!secret || typeof secret !== 'string') {
        throw new Error('Secret is verplicht');
    }
    if (!sessionName || typeof sessionName !== 'string') {
        throw new Error('SessionName is verplicht');
    }

    return {
        secret: secret.trim(),
        sessionName: sessionName.trim()
    };
}

/**
 * Bouwt de payload voor joinTeam
 * @param {Object} params
 * @param {string} params.secret - Authenticatie secret
 * @param {string} params.sessionCode - Sessie code
 * @param {number} params.animalId - ID van gekozen dier
 * @param {string} [params.teamName] - Team naam (optioneel)
 * @param {string} [params.teamColor] - Team kleur hex (optioneel)
 * @returns {Object} Request payload
 */
export function buildJoinTeamPayload({ secret, sessionCode, animalId, teamName, teamColor }) {
    if (!secret) throw new Error('Secret is verplicht');
    if (!sessionCode) throw new Error('SessionCode is verplicht');
    if (!animalId || animalId < 1 || animalId > 10) {
        throw new Error('AnimalId moet tussen 1 en 10 liggen');
    }

    const { word1, word2 } = getTeamWords(animalId);

    const payload = {
        secret,
        sessionCode: sessionCode.toUpperCase(),
        animalId,
        word1,
        word2
    };

    if (teamName) payload.teamName = teamName;
    if (teamColor) payload.teamColor = teamColor;

    return payload;
}

/**
 * Bouwt de payload voor updateTeam
 * @param {Object} params
 * @param {string} params.secret - Authenticatie secret
 * @param {string} params.teamId - Team ID
 * @param {string} params.teamToken - Team authenticatie token
 * @param {string} [params.sessionCode] - Sessie code
 * @param {number} [params.progress] - Voortgang (0-12)
 * @param {number} [params.hintsUsed] - Aantal gebruikte hints
 * @param {number} [params.timePenaltySeconds] - Straftijd in seconden
 * @param {boolean} [params.finished] - Of het team klaar is
 * @returns {Object} Request payload
 */
export function buildUpdateTeamPayload(params) {
    const { secret, teamId, teamToken, sessionCode, progress, hintsUsed, timePenaltySeconds, finished, teamName } = params;

    if (!secret) throw new Error('Secret is verplicht');
    if (!teamId) throw new Error('TeamId is verplicht');
    if (!teamToken) throw new Error('TeamToken is verplicht');

    const payload = { secret, teamId, teamToken };

    if (sessionCode) payload.sessionCode = sessionCode;
    if (typeof progress === 'number') {
        if (progress < 0 || progress > 12) {
            throw new Error('Progress moet tussen 0 en 12 liggen');
        }
        payload.progress = progress;
    }
    if (typeof hintsUsed === 'number') {
        if (hintsUsed < 0 || hintsUsed > 3) {
            throw new Error('HintsUsed moet tussen 0 en 3 liggen');
        }
        payload.hintsUsed = hintsUsed;
    }
    if (typeof timePenaltySeconds === 'number') {
        payload.timePenaltySeconds = Math.max(0, timePenaltySeconds);
    }
    if (typeof finished === 'boolean') {
        payload.finished = finished;
    }
    if (teamName) {
        payload.teamName = teamName;
    }

    return payload;
}

/**
 * Bouwt de payload voor adminUpdateWords
 * @param {Object} params
 * @param {string} params.secret - Authenticatie secret
 * @param {string} params.sessionCode - Sessie code
 * @param {string[]} params.words - Array van 20 woorden
 * @returns {Object} Request payload
 */
export function buildAdminUpdateWordsPayload({ secret, sessionCode, words }) {
    if (!secret) throw new Error('Secret is verplicht');
    if (!sessionCode) throw new Error('SessionCode is verplicht');
    if (!Array.isArray(words)) {
        throw new Error('Words moet een array zijn');
    }

    // Pad or truncate to exactly 20 words
    const normalizedWords = [...words];
    while (normalizedWords.length < 20) {
        normalizedWords.push('');
    }
    if (normalizedWords.length > 20) {
        normalizedWords.length = 20;
    }

    return {
        secret,
        sessionCode,
        words: normalizedWords
    };
}

/**
 * Bouwt de payload voor purgeSession
 * @param {Object} params
 * @param {string} params.secret - Authenticatie secret
 * @param {string} [params.sessionCode] - Sessie code
 * @returns {Object} Request payload
 */
export function buildPurgeSessionPayload({ secret, sessionCode }) {
    if (!secret) throw new Error('Secret is verplicht');

    const payload = { secret };
    if (sessionCode) payload.sessionCode = sessionCode;

    return payload;
}
