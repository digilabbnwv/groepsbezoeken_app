
export const CONFIG = {
    SECRET: "EDIT_ME_SECRET", // Beheerder vult dit in
    ENDPOINTS: {
        createSession: "", // POST
        fetchSessionState: "", // GET
        joinTeam: "", // POST
        updateTeam: "", // POST
        adminUpdateSession: "", // POST
        adminUpdateWords: "", // POST
        purgeSession: "" // POST
    },
    // Polling interval in ms
    POLLING_INTERVAL: 5000,
    // Timer max seconds (45 min)
    MAX_TIME_SECONDS: 45 * 60, 
    // Penalty seconds
    PENALTY_SECONDS: 30,
    // Max hints
    MAX_HINTS: 3
};
