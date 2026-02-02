/**
 * API Request Handlers
 * 
 * Implements all API endpoints according to API_DOCUMENTATION.md
 */

import {
    generateSessionCode,
    generateUUID,
    generateTeamToken,
    getWordsForAnimal,
    jsonResponse
} from './utils.js';

/**
 * POST /api/createSession
 * Creates a new game session
 * 
 * @param {Object} body - { secret, sessionName }
 * @param {Object} env - Environment with DB binding
 * @returns {Response} - Session object
 */
export async function createSession(body, env) {
    const { sessionName = 'Nieuwe Sessie' } = body;

    // Generate unique identifiers
    const sessionId = generateUUID();
    let sessionCode = generateSessionCode();

    // Ensure session code is unique (retry if collision)
    let attempts = 0;
    while (attempts < 5) {
        try {
            await env.DB.prepare(
                `INSERT INTO sessions (sessionId, sessionName, sessionCode, wordsJson, createdAt)
                 VALUES (?, ?, ?, ?, ?)`
            ).bind(
                sessionId,
                sessionName,
                sessionCode,
                '[]', // Empty words initially
                Math.floor(Date.now() / 1000)
            ).run();

            break; // Success
        } catch (error) {
            if (error.message.includes('UNIQUE constraint') && attempts < 4) {
                // Collision - generate new code and retry
                sessionCode = generateSessionCode();
                attempts++;
            } else {
                console.error('createSession error:', error);
                return jsonResponse({ error: 'Failed to create session' }, 500, env);
            }
        }
    }

    return jsonResponse({
        sessionId,
        sessionName,
        sessionCode,
        startTime: null,
        words: []
    }, 200, env);
}

/**
 * GET /api/fetchSessionState?code=...
 * Retrieves session state with teams
 * 
 * @param {string} code - Session code
 * @param {Object} env - Environment with DB binding
 * @returns {Response} - Session with teams and current time
 */
export async function fetchSessionState(code, env) {
    // Fetch session
    const session = await env.DB.prepare(
        `SELECT sessionId, sessionName, sessionCode, startTime, wordsJson 
         FROM sessions 
         WHERE sessionCode = ?`
    ).bind(code).first();

    if (!session) {
        return jsonResponse({ error: 'Session not found' }, 404, env);
    }

    // Fetch teams for this session
    const teamsResult = await env.DB.prepare(
        `SELECT teamId, teamName, animalId, progress, score, hintsUsed, 
                timePenaltySeconds, finished, lastSeen
         FROM teams 
         WHERE sessionCode = ?
         ORDER BY animalId ASC`
    ).bind(code).all();

    const teams = teamsResult.results.map(team => ({
        teamId: team.teamId,
        teamName: team.teamName,
        animalId: team.animalId,
        progress: team.progress || 0,
        score: team.score || 0,
        hintsUsed: team.hintsUsed || 0,
        timePenaltySeconds: team.timePenaltySeconds || 0,
        finished: team.finished === 1,
        lastSeen: team.lastSeen ? new Date(team.lastSeen * 1000).toISOString() : null
    }));

    // Parse words
    let words = [];
    try {
        words = JSON.parse(session.wordsJson || '[]');
    } catch (e) {
        words = [];
    }

    return jsonResponse({
        sessionId: session.sessionId,
        sessionCode: session.sessionCode,
        sessionName: session.sessionName,
        startTime: session.startTime,
        words,
        teams,
        now: new Date().toISOString()
    }, 200, env);
}

/**
 * POST /api/joinTeam
 * Join a session with an animal avatar (idempotent)
 * 
 * @param {Object} body - { secret, sessionCode, animalId, teamName? }
 * @param {Object} env - Environment with DB binding
 * @returns {Response} - Team object with assigned words
 */
export async function joinTeam(body, env) {
    const { sessionCode, animalId, teamName = '', teamColor = '#000000' } = body;

    if (!sessionCode || !animalId) {
        return jsonResponse({ error: 'Missing sessionCode or animalId' }, 400, env);
    }

    // Validate animalId range (1-10)
    if (animalId < 1 || animalId > 10) {
        return jsonResponse({ error: 'animalId must be between 1 and 10' }, 400, env);
    }

    // Check if session exists and get words
    const session = await env.DB.prepare(
        `SELECT sessionId, wordsJson FROM sessions WHERE sessionCode = ?`
    ).bind(sessionCode).first();

    if (!session) {
        return jsonResponse({ error: 'Session not found' }, 404, env);
    }

    // Check if team already exists for this (sessionCode, animalId)
    const existingTeam = await env.DB.prepare(
        `SELECT teamId, teamToken, animalId, word1, word2 
         FROM teams 
         WHERE sessionCode = ? AND animalId = ?`
    ).bind(sessionCode, animalId).first();

    if (existingTeam) {
        // Idempotent: return existing team
        return jsonResponse({
            teamId: existingTeam.teamId,
            teamToken: existingTeam.teamToken,
            animalId: existingTeam.animalId,
            word1: existingTeam.word1,
            word2: existingTeam.word2
        }, 200, env);
    }

    // Parse session words and get assigned words for this animal
    let words = [];
    try {
        words = JSON.parse(session.wordsJson || '[]');
    } catch (e) {
        words = [];
    }

    const { word1, word2 } = getWordsForAnimal(words, animalId);

    // Create new team
    const teamId = generateUUID();
    const teamToken = generateTeamToken();

    try {
        await env.DB.prepare(
            `INSERT INTO teams (teamId, teamToken, sessionCode, animalId, teamName, teamColor, word1, word2, lastSeen)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            teamId,
            teamToken,
            sessionCode,
            animalId,
            teamName,
            teamColor,
            word1,
            word2,
            Math.floor(Date.now() / 1000)
        ).run();
    } catch (error) {
        // Handle race condition - another request may have created the team
        if (error.message.includes('UNIQUE constraint')) {
            const conflictTeam = await env.DB.prepare(
                `SELECT teamId, teamToken, animalId, word1, word2 
                 FROM teams 
                 WHERE sessionCode = ? AND animalId = ?`
            ).bind(sessionCode, animalId).first();

            if (conflictTeam) {
                return jsonResponse({
                    teamId: conflictTeam.teamId,
                    teamToken: conflictTeam.teamToken,
                    animalId: conflictTeam.animalId,
                    word1: conflictTeam.word1,
                    word2: conflictTeam.word2
                }, 200, env);
            }
        }

        console.error('joinTeam error:', error);
        return jsonResponse({ error: 'Failed to join team' }, 500, env);
    }

    return jsonResponse({
        teamId,
        teamToken,
        animalId,
        word1,
        word2
    }, 200, env);
}

/**
 * POST /api/updateTeam
 * Update team progress/state
 * 
 * @param {Object} body - { secret, teamId, teamToken, progress?, hintsUsed?, teamName? }
 * @param {Object} env - Environment with DB binding
 * @returns {Response} - { ok: true }
 */
export async function updateTeam(body, env) {
    const { teamId, teamToken, progress, hintsUsed, teamName, finished, timePenaltySeconds } = body;

    if (!teamId || !teamToken) {
        return jsonResponse({ error: 'Missing teamId or teamToken' }, 400, env);
    }

    // Verify team token
    const team = await env.DB.prepare(
        `SELECT teamToken FROM teams WHERE teamId = ?`
    ).bind(teamId).first();

    if (!team) {
        return jsonResponse({ error: 'Team not found' }, 404, env);
    }

    if (team.teamToken !== teamToken) {
        return jsonResponse({ error: 'Invalid team token' }, 401, env);
    }

    // Build dynamic update query
    const updates = [];
    const values = [];

    if (progress !== undefined) {
        updates.push('progress = ?');
        values.push(progress);
    }

    if (hintsUsed !== undefined) {
        updates.push('hintsUsed = ?');
        values.push(hintsUsed);
    }

    if (teamName !== undefined) {
        updates.push('teamName = ?');
        values.push(teamName);
    }

    if (finished !== undefined) {
        updates.push('finished = ?');
        values.push(finished ? 1 : 0);
    }

    if (timePenaltySeconds !== undefined) {
        updates.push('timePenaltySeconds = ?');
        values.push(timePenaltySeconds);
    }

    // Always update lastSeen
    updates.push('lastSeen = ?');
    values.push(Math.floor(Date.now() / 1000));

    if (updates.length === 0) {
        return jsonResponse({ ok: true }, 200, env);
    }

    // Add teamId for WHERE clause
    values.push(teamId);

    const query = `UPDATE teams SET ${updates.join(', ')} WHERE teamId = ?`;

    try {
        await env.DB.prepare(query).bind(...values).run();
    } catch (error) {
        console.error('updateTeam error:', error);
        return jsonResponse({ error: 'Failed to update team' }, 500, env);
    }

    return jsonResponse({ ok: true }, 200, env);
}

/**
 * POST /api/adminUpdateWords?code=...
 * Update session words (admin only)
 * 
 * @param {string} code - Session code
 * @param {Object} body - { secret, sessionCode, words: [...] }
 * @param {Object} env - Environment with DB binding
 * @returns {Response} - { ok: true }
 */
export async function adminUpdateWords(code, body, env) {
    const { words, startTime } = body;

    // Validate words
    if (!Array.isArray(words) || words.length !== 20) {
        return jsonResponse({
            error: 'Words array must contain exactly 20 words'
        }, 400, env);
    }

    // Check session exists
    const session = await env.DB.prepare(
        `SELECT sessionId FROM sessions WHERE sessionCode = ?`
    ).bind(code).first();

    if (!session) {
        return jsonResponse({ error: 'Session not found' }, 404, env);
    }

    // Build update query
    const updates = ['wordsJson = ?'];
    const values = [JSON.stringify(words)];

    // Optionally update startTime if provided
    if (startTime !== undefined) {
        updates.push('startTime = ?');
        values.push(startTime);
    }

    values.push(code);

    try {
        await env.DB.prepare(
            `UPDATE sessions SET ${updates.join(', ')} WHERE sessionCode = ?`
        ).bind(...values).run();

        // Update existing teams with new words
        // (Teams that already have words keep them for game consistency,
        //  but teams with empty words get updated)
        const teamsResult = await env.DB.prepare(
            `SELECT teamId, animalId FROM teams 
             WHERE sessionCode = ? AND (word1 = '' OR word1 IS NULL)`
        ).bind(code).all();

        for (const team of teamsResult.results) {
            const { word1, word2 } = getWordsForAnimal(words, team.animalId);
            await env.DB.prepare(
                `UPDATE teams SET word1 = ?, word2 = ? WHERE teamId = ?`
            ).bind(word1, word2, team.teamId).run();
        }

    } catch (error) {
        console.error('adminUpdateWords error:', error);
        return jsonResponse({ error: 'Failed to update words' }, 500, env);
    }

    return jsonResponse({ ok: true }, 200, env);
}

/**
 * POST /api/purgeSession
 * Delete session and all associated teams
 * 
 * @param {Object} body - { secret, sessionId?, sessionCode? }
 * @param {Object} env - Environment with DB binding
 * @returns {Response} - { ok: true }
 */
export async function purgeSession(body, env) {
    const { sessionId, sessionCode } = body;

    if (!sessionId && !sessionCode) {
        return jsonResponse({
            error: 'Either sessionId or sessionCode is required'
        }, 400, env);
    }

    let code = sessionCode;

    // If sessionId provided, look up the code
    if (sessionId) {
        const session = await env.DB.prepare(
            `SELECT sessionCode FROM sessions WHERE sessionId = ?`
        ).bind(sessionId).first();

        if (session) {
            code = session.sessionCode;
        } else if (!sessionCode) {
            return jsonResponse({ error: 'Session not found' }, 404, env);
        }
    }

    try {
        // Delete teams first (no foreign key constraints in SQLite by default)
        await env.DB.prepare(
            `DELETE FROM teams WHERE sessionCode = ?`
        ).bind(code).run();

        // Delete session
        await env.DB.prepare(
            `DELETE FROM sessions WHERE sessionCode = ?`
        ).bind(code).run();

    } catch (error) {
        console.error('purgeSession error:', error);
        return jsonResponse({ error: 'Failed to purge session' }, 500, env);
    }

    return jsonResponse({ ok: true }, 200, env);
}

/**
 * Auto-purge old sessions (called by cron trigger)
 * Deletes sessions older than AUTO_PURGE_DAYS (default 14)
 * 
 * @param {Object} env - Environment with DB binding
 * @returns {Object} - { deletedSessions, deletedTeams }
 */
export async function autoPurgeSessions(env) {
    const purgeDays = parseInt(env.AUTO_PURGE_DAYS || '14', 10);
    const cutoffTimestamp = Math.floor(Date.now() / 1000) - (purgeDays * 24 * 60 * 60);

    console.log(`Auto-purge: deleting sessions older than ${purgeDays} days (before ${new Date(cutoffTimestamp * 1000).toISOString()})`);

    try {
        // Get sessions to purge
        const sessionsResult = await env.DB.prepare(
            `SELECT sessionCode FROM sessions WHERE createdAt < ?`
        ).bind(cutoffTimestamp).all();

        const sessionCodes = sessionsResult.results.map(s => s.sessionCode);

        if (sessionCodes.length === 0) {
            console.log('Auto-purge: no old sessions to delete');
            return { deletedSessions: 0, deletedTeams: 0 };
        }

        // Delete teams for these sessions
        let deletedTeams = 0;
        for (const code of sessionCodes) {
            const result = await env.DB.prepare(
                `DELETE FROM teams WHERE sessionCode = ?`
            ).bind(code).run();
            deletedTeams += result.meta.changes || 0;
        }

        // Delete sessions
        const result = await env.DB.prepare(
            `DELETE FROM sessions WHERE createdAt < ?`
        ).bind(cutoffTimestamp).run();

        const deletedSessions = result.meta.changes || 0;

        console.log(`Auto-purge complete: ${deletedSessions} sessions, ${deletedTeams} teams deleted`);

        return { deletedSessions, deletedTeams };

    } catch (error) {
        console.error('Auto-purge error:', error);
        throw error;
    }
}
