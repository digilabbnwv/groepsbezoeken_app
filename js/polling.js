/**
 * PollingService
 * Beheert polling requests met singleton AbortController en in-flight guards.
 * Voorkomt overlappende requests en zorgt voor proper cleanup.
 */

class PollingServiceClass {
    constructor() {
        // Singleton abort controller per endpoint
        this.controllers = new Map();

        // In-flight guards per endpoint
        this.inFlight = new Map();

        // Active intervals
        this.intervals = new Map();

        // Setup cleanup handlers
        this._setupCleanupHandlers();
    }

    /**
     * Setup cleanup bij page unload en hash changes
     */
    _setupCleanupHandlers() {
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => this.stopAll());
            window.addEventListener('hashchange', () => this.stopAll());
        }
    }

    /**
     * Maakt een AbortController voor een specifieke endpoint.
     * Annuleert automatisch de vorige controller als die nog actief is.
     * @param {string} endpointKey - Unieke key voor dit endpoint (bijv. 'fetchSessionState')
     * @returns {AbortController} De nieuwe controller
     */
    getController(endpointKey) {
        // Cancel previous if exists
        const existing = this.controllers.get(endpointKey);
        if (existing) {
            existing.abort();
        }

        // Create new
        const controller = new AbortController();
        this.controllers.set(endpointKey, controller);
        return controller;
    }

    /**
     * Check of een request al in-flight is voor een endpoint
     * @param {string} endpointKey 
     * @returns {boolean}
     */
    isInFlight(endpointKey) {
        return this.inFlight.get(endpointKey) === true;
    }

    /**
     * Markeer een endpoint als in-flight
     * @param {string} endpointKey 
     */
    setInFlight(endpointKey, value) {
        this.inFlight.set(endpointKey, value);
    }

    /**
     * Start een polling interval
     * @param {string} intervalKey - Unieke key voor dit interval
     * @param {Function} callback - Async functie om periodiek uit te voeren
     * @param {number} intervalMs - Interval in milliseconden
     * @returns {void}
     */
    startInterval(intervalKey, callback, intervalMs) {
        // Stop existing interval if any
        this.stopInterval(intervalKey);

        const wrappedCallback = async () => {
            // Skip if previous call still running
            if (this.isInFlight(intervalKey)) {
                console.debug(`[PollingService] Skipping ${intervalKey} - previous request still in flight`);
                return;
            }

            this.setInFlight(intervalKey, true);
            try {
                await callback();
            } catch (e) {
                // Only log non-abort errors
                if (e.name !== 'AbortError') {
                    console.warn(`[PollingService] Error in ${intervalKey}:`, e.message);
                }
            } finally {
                this.setInFlight(intervalKey, false);
            }
        };

        const id = setInterval(wrappedCallback, intervalMs);
        this.intervals.set(intervalKey, id);

        console.debug(`[PollingService] Started interval: ${intervalKey} (${intervalMs}ms)`);
    }

    /**
     * Stop een specifiek polling interval
     * @param {string} intervalKey 
     */
    stopInterval(intervalKey) {
        const id = this.intervals.get(intervalKey);
        if (id) {
            clearInterval(id);
            this.intervals.delete(intervalKey);
            console.debug(`[PollingService] Stopped interval: ${intervalKey}`);
        }

        // Also abort any pending request
        const controller = this.controllers.get(intervalKey);
        if (controller) {
            controller.abort();
            this.controllers.delete(intervalKey);
        }

        this.inFlight.set(intervalKey, false);
    }

    /**
     * Stop alle polling intervals en abort alle pending requests
     */
    stopAll() {
        console.debug('[PollingService] Stopping all polling...');

        // Stop all intervals
        for (const [key, id] of this.intervals) {
            clearInterval(id);
            console.debug(`[PollingService] Cleared interval: ${key}`);
        }
        this.intervals.clear();

        // Abort all controllers
        for (const [key, controller] of this.controllers) {
            controller.abort();
            console.debug(`[PollingService] Aborted request: ${key}`);
        }
        this.controllers.clear();

        // Reset in-flight status
        this.inFlight.clear();
    }

    /**
     * Check of een specifiek interval actief is
     * @param {string} intervalKey 
     * @returns {boolean}
     */
    isRunning(intervalKey) {
        return this.intervals.has(intervalKey);
    }
}

// Singleton instance
export const PollingService = new PollingServiceClass();
