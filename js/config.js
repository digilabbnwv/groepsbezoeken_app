// config.js
const BASE_URL = "https://groepsbezoeken-bieb-app.digilab-464.workers.dev";

export const CONFIG = {
    BASE_URL,
    SECRET: "EDIT_ME_SECRET",
    ENDPOINTS: {
        createSession: `${BASE_URL}/api/createSession`,
        fetchSessionState: `${BASE_URL}/api/fetchSessionState`,
        joinTeam: `${BASE_URL}/api/joinTeam`,
        updateTeam: `${BASE_URL}/api/updateTeam`,
        adminUpdateWords: `${BASE_URL}/api/adminUpdateWords`,
        purgeSession: `${BASE_URL}/api/purgeSession`
    },
    POLLING_INTERVAL: 5000,
    MAX_TIME_SECONDS: 45 * 60,
    PENALTY_SECONDS: 30,
    MAX_HINTS: 3,
    APP_VERSION: "1.0.3"
};
