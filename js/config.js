// config.js
// Cloudflare Worker backend configuration
// 
// SECURITY: Secrets worden geladen uit URL query parameters, niet hardcoded.
// Gebruik de app met: ?secret=YOUR_SECRET&adminSecret=YOUR_ADMIN_SECRET

const BASE_URL = "https://groepsbezoeken-bieb-app.digilab-464.workers.dev";

/**
 * Parse secrets from URL query string
 * @returns {{ secret: string|null, adminSecret: string|null }}
 */
function getSecretsFromURL() {
    const params = new URLSearchParams(window.location.search);
    return {
        secret: params.get('secret') || null,
        adminSecret: params.get('adminSecret') || params.get('admin_secret') || null
    };
}

// Cache secrets once at load time
const urlSecrets = getSecretsFromURL();

// ?mock=1 draait de app zonder backend (gedeelde localStorage-database, handig voor demo en lokaal testen)
const MOCK_MODE = new URLSearchParams(window.location.search).has('mock');

export const CONFIG = {
    BASE_URL,

    // Secret loaded from URL query param: ?secret=...
    // Falls back to null if not provided (will cause auth errors)
    SECRET: urlSecrets.secret,

    // Admin secret loaded from URL query param: ?adminSecret=...
    // Used for adminUpdateWords and purgeSession endpoints
    ADMIN_SECRET: urlSecrets.adminSecret,

    MOCK_MODE,

    ENDPOINTS: MOCK_MODE ? {} : {
        createSession: `${BASE_URL}/api/createSession`,
        fetchSessionState: `${BASE_URL}/api/fetchSessionState`,
        joinTeam: `${BASE_URL}/api/joinTeam`,
        updateTeam: `${BASE_URL}/api/updateTeam`,
        adminUpdateWords: `${BASE_URL}/api/adminUpdateWords`,
        purgeSession: `${BASE_URL}/api/purgeSession`,
        claimStation: `${BASE_URL}/api/claimStation`,
        adminSkipStation: `${BASE_URL}/api/adminSkipStation`
    },

    POLLING_INTERVAL: 5000,
    MAX_TIME_SECONDS: 45 * 60,
    PENALTY_SECONDS: 30,
    MAX_HINTS: 3,
    APP_VERSION: "1.1.0"  // Bumped for D1 backend migration
};

// Validate secrets on load
if (!CONFIG.SECRET && !MOCK_MODE) {
    console.warn(
        'No secret found in URL. Add ?secret=YOUR_SECRET to the URL.\n' +
        'For admin access, also add &adminSecret=YOUR_ADMIN_SECRET'
    );
}
