import { CONFIG } from './config.js';
import { Storage } from './utils.js';

// SHARED MOCK STATE (Local Storage)
// This allows testing Admin in Tab 1 and Player in Tab 2 on the same browser.
const MOCK_KEY = 'GROEPSBEZOEK_MOCK_DB';

function getMockDB() {
    try {
        return JSON.parse(localStorage.getItem(MOCK_KEY)) || { session: null, teams: {} };
    } catch {
        return { session: null, teams: {} };
    }
}

function saveMockDB(db) {
    localStorage.setItem(MOCK_KEY, JSON.stringify(db));
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithTimeout(url, options = {}) {
    // Automatically append 'secret' query parameter if it exists in CONFIG
    if (CONFIG.SECRET) {
        try {
            const urlObj = new URL(url, window.location.origin); // Handle relative URLs
            urlObj.searchParams.append('secret', CONFIG.SECRET);
            url = urlObj.toString();
        } catch (e) {
            // Fallback for weird URLs if necessary, though new URL() usually handles HTTP/HTTPS
            console.warn("Could not append secret to URL", url);
        }
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000);

    // Ensure JSON headers for POST
    const fetchOptions = { ...options };
    if (fetchOptions.method === 'POST') {
        fetchOptions.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...(fetchOptions.headers || {})
        };
    }

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
}

export const API = {
    async createSession(sessionName) {
        if (!CONFIG.ENDPOINTS.createSession) {
            console.log("MOCK: createSession");
            await delay(500);

            const db = { session: null, teams: {} };
            db.session = {
                sessionId: "mock-session-id-" + Date.now(),
                sessionName: sessionName || "Oefensessie",
                sessionCode: "ABC1234",

                startTime: new Date().toISOString(),
                words: Array(20).fill("")
            };
            saveMockDB(db);
            return db.session;
        }

        // Real impl
        const res = await fetchWithTimeout(CONFIG.ENDPOINTS.createSession, {
            method: 'POST',
            body: JSON.stringify({ secret: CONFIG.SECRET, sessionName })
        });
        return res.json();
    },

    async fetchSessionState(sessionCode) {
        if (!CONFIG.ENDPOINTS.fetchSessionState) {
            const db = getMockDB();
            // Loose check: matches code OR if code is empty (admin created it knowing context)
            // Actually admin context usually knows code. 
            // But if we are checking "Does A session exist" we check DB.
            if (db.session && (db.session.sessionCode === sessionCode || !sessionCode)) {
                return {
                    ...db.session,
                    teams: Object.values(db.teams),
                    now: new Date().toISOString()
                };
            }
            throw new Error("Session not found or no mock session active");
        }

        const url = new URL(CONFIG.ENDPOINTS.fetchSessionState);
        url.searchParams.append('code', sessionCode);
        const res = await fetchWithTimeout(url.toString());
        return res.json();
    },

    async joinTeam(sessionCode, animalId) {
        if (!CONFIG.ENDPOINTS.joinTeam) {
            console.log("MOCK: joinTeam", animalId);
            await delay(500);

            const db = getMockDB();
            if (!db.session || db.session.sessionCode !== sessionCode) {
                throw new Error("Sessie niet gevonden");
            }

            const teamId = "team-" + animalId;
            if (db.teams[teamId]) return db.teams[teamId];

            // Create new
            // Fixed sentence: "In de bibliotheek vinden we verhalen om in te verdwijnen: spanning, actie, fantasie, verbeelding, en samen ontdekken we nieuwe werelden."
            // Cleaned for 20 words:
            const mockSentence = "In de bibliotheek vinden we verhalen om in te verdwijnen spanning actie fantasie verbeelding en samen ontdekken we nieuwe werelden".split(" ");
            const word1 = mockSentence[(animalId - 1) * 2] || "???";
            const word2 = mockSentence[(animalId - 1) * 2 + 1] || "???";

            const newTeam = {
                teamId,
                teamToken: "token-" + animalId,
                animalId,
                teamName: "Team " + animalId, // Simpel fallback, UI maps animalId to name
                teamColor: "#000",
                word1: word1,
                word2: word2,
                progress: 0,
                hintsUsed: 0,
                timePenaltySeconds: 0,
                lastSeen: new Date().toISOString()
            };

            db.teams[teamId] = newTeam;
            saveMockDB(db);
            return newTeam;
        }

        const res = await fetchWithTimeout(CONFIG.ENDPOINTS.joinTeam, {
            method: 'POST',
            body: JSON.stringify({ secret: CONFIG.SECRET, sessionCode, animalId })
        });
        return res.json();
    },

    async updateTeam(payload) {
        if (!payload.teamId || !payload.teamToken) {
            console.error("API.updateTeam: Missing teamId or teamToken", payload);
            throw new Error("Missing teamId or teamToken");
        }

        if (!CONFIG.ENDPOINTS.updateTeam) {
            const db = getMockDB();
            const t = db.teams[payload.teamId];
            if (t) {
                // Mock validation (optional): check if t.teamToken === payload.teamToken
                Object.assign(t, payload);
                t.lastSeen = new Date().toISOString();
                saveMockDB(db);
            }
            return { ok: true };
        }

        const res = await fetchWithTimeout(CONFIG.ENDPOINTS.updateTeam, {
            method: 'POST',
            body: JSON.stringify({ secret: CONFIG.SECRET, ...payload })
        });
        return res.json();
    },



    async adminUpdateWords(payload) {
        if (!CONFIG.ENDPOINTS.adminUpdateWords) {
            const db = getMockDB();
            if (db.session) {
                db.session.words = payload.words;
                saveMockDB(db);
            }
            return { ok: true };
        }
        const url = new URL(CONFIG.ENDPOINTS.adminUpdateWords);
        if (payload.sessionCode) {
            url.searchParams.append('code', payload.sessionCode);
        }

        // Note: fetchWithTimeout logic will ALSO append 'secret' to this URL object if configured.
        // But fetchWithTimeout expects a string or URL. We should pass string.

        const res = await fetchWithTimeout(url.toString(), {
            method: 'POST',
            body: JSON.stringify({ secret: CONFIG.SECRET, ...payload })
        });
        return res.json();
    },

    async purgeSession(payload) {
        if (!CONFIG.ENDPOINTS.purgeSession) {
            localStorage.removeItem(MOCK_KEY);
            return { ok: true };
        }
        const res = await fetchWithTimeout(CONFIG.ENDPOINTS.purgeSession, {
            method: 'POST',
            body: JSON.stringify({ secret: CONFIG.SECRET, ...payload })
        });
        return res.json();
    }
};
