import { CONFIG } from './config.js';
import { PollingService } from './polling.js';

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

/**
 * Fetch with timeout and optional abort controller management
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {string} [options.endpointKey] - Optional key for PollingService controller management
 * @returns {Promise<Response|null>} Response or null if aborted
 */
async function fetchWithTimeout(url, options = {}) {
    const { endpointKey, ...fetchOptions } = options;

    // Automatically append 'secret' query parameter if it exists in CONFIG
    // Use adminSecret for admin endpoints if available
    const secretToUse = fetchOptions.useAdminSecret && CONFIG.ADMIN_SECRET
        ? CONFIG.ADMIN_SECRET
        : CONFIG.SECRET;

    if (secretToUse) {
        try {
            const urlObj = new URL(url, window.location.origin);
            urlObj.searchParams.append('secret', secretToUse);
            url = urlObj.toString();
        } catch (e) {
            console.warn("Could not append secret to URL", url);
        }
    }

    // Use PollingService controller if endpointKey provided, otherwise create local one
    let controller;
    let isManaged = false;

    if (endpointKey) {
        controller = PollingService.getController(endpointKey);
        isManaged = true;
    } else {
        controller = new AbortController();
    }

    const timeoutId = setTimeout(() => controller.abort(), 8000);

    // Ensure JSON headers for POST
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
        clearTimeout(timeoutId);
        return response;
    } catch (e) {
        clearTimeout(timeoutId);

        // Graceful handling of AbortError
        if (e.name === 'AbortError') {
            if (isManaged) {
                // Expected cancellation from PollingService, return null silently
                return null;
            }
            // Timeout abort, throw with better message
            throw new Error('Request timeout');
        }
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
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || `Server fout: ${res.status}`);
        }

        if (!data.sessionCode) {
            throw new Error("Ongeldige response: Geen sessie code ontvangen");
        }

        return data;
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

        // Use managed controller for polling requests
        const res = await fetchWithTimeout(url.toString(), {
            endpointKey: 'fetchSessionState'
        });

        // Request was aborted (e.g., new request started), return null
        if (!res) {
            return null;
        }

        const data = await res.json();

        // Unwrap nested D1 result if present (common pattern with some CF bindings)
        if (data && data.teams && data.teams.body && Array.isArray(data.teams.body)) {
            data.teams = data.teams.body;
        }

        return data;
    },

    async joinTeam(sessionCode, animalId, extraData = {}) {
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
            const mockSentence = "In de bibliotheek vinden we verhalen om in te verdwijnen spanning actie fantasie verbeelding en samen ontdekken we nieuwe werelden".split(" ");
            const word1 = mockSentence[(animalId - 1) * 2] || "???";
            const word2 = mockSentence[(animalId - 1) * 2 + 1] || "???";

            const newTeam = {
                teamId,
                teamToken: "token-" + animalId,
                animalId,
                teamName: extraData.teamName || ("Team " + animalId),
                teamColor: extraData.teamColor || "#000",
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

        // Generate words client-side to ensure they exist (backend might not generate them)
        const mockSentence = "In de bibliotheek vinden we verhalen om in te verdwijnen spanning actie fantasie verbeelding en samen ontdekken we nieuwe werelden".split(" ");
        const word1 = mockSentence[(animalId - 1) * 2] || "???";
        const word2 = mockSentence[(animalId - 1) * 2 + 1] || "???";

        const fullData = { word1, word2, ...extraData };

        const res = await fetchWithTimeout(CONFIG.ENDPOINTS.joinTeam, {
            method: 'POST',
            body: JSON.stringify({
                secret: CONFIG.SECRET,
                sessionCode,
                animalId,
                ...fullData
            })
        });
        const data = await res.json();

        // Force update to save extra fields (name/color/words)
        if (data.teamId && data.teamToken) {
            try {
                await this.updateTeam({
                    teamId: data.teamId,
                    teamToken: data.teamToken,
                    sessionCode,
                    ...fullData
                });
            } catch (e) { console.warn("Sync error", e); }
        }
        return { ...fullData, ...data };
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

        // Admin endpoint uses ADMIN_SECRET if available
        const adminSecret = CONFIG.ADMIN_SECRET || CONFIG.SECRET;

        const res = await fetchWithTimeout(url.toString(), {
            method: 'POST',
            useAdminSecret: true,
            body: JSON.stringify({ secret: adminSecret, ...payload })
        });
        return res.json();
    },

    async purgeSession(payload) {
        if (!CONFIG.ENDPOINTS.purgeSession) {
            localStorage.removeItem(MOCK_KEY);
            return { ok: true };
        }
        // Admin endpoint uses ADMIN_SECRET if available
        const adminSecret = CONFIG.ADMIN_SECRET || CONFIG.SECRET;

        const res = await fetchWithTimeout(CONFIG.ENDPOINTS.purgeSession, {
            method: 'POST',
            useAdminSecret: true,
            body: JSON.stringify({ secret: adminSecret, ...payload })
        });
        return res.json();
    }
};
