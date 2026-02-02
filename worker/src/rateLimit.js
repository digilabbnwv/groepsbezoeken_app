/**
 * Rate Limiting for API protection
 * 
 * Simple in-memory rate limiting per Cloudflare colo (edge location).
 * This is "good enough" for protecting against casual abuse.
 * 
 * For a free-tier friendly approach, we use a per-colo in-memory map.
 * This means limits are not globally synchronized, but provides adequate
 * protection against single-source abuse.
 * 
 * Limits:
 * - 60 requests per minute per IP per session code (default)
 * - Configurable via RATE_LIMIT_MAX_REQUESTS and RATE_LIMIT_WINDOW_SECONDS
 */

// In-memory rate limit storage (per colo)
// Key: `${ip}:${sessionCode}` -> { count, windowStart }
const rateLimitStore = new Map();

/**
 * Rate Limiter class
 */
export class RateLimiter {
    constructor(env) {
        this.maxRequests = parseInt(env.RATE_LIMIT_MAX_REQUESTS || '60', 10);
        this.windowSeconds = parseInt(env.RATE_LIMIT_WINDOW_SECONDS || '60', 10);
    }

    /**
     * Check if request is within rate limit
     * @param {string} clientIP - Client IP address
     * @param {string} sessionCode - Session code (for per-session limiting)
     * @returns {boolean} - True if allowed, false if rate limited
     */
    async checkLimit(clientIP, sessionCode) {
        const key = `${clientIP}:${sessionCode}`;
        const now = Date.now();
        const windowMs = this.windowSeconds * 1000;

        let record = rateLimitStore.get(key);

        // Clean up expired entries periodically (every ~100 requests)
        if (Math.random() < 0.01) {
            this.cleanup(now, windowMs);
        }

        if (!record || (now - record.windowStart) > windowMs) {
            // New window
            rateLimitStore.set(key, { count: 1, windowStart: now });
            return true;
        }

        // Within existing window
        if (record.count >= this.maxRequests) {
            return false;
        }

        record.count++;
        return true;
    }

    /**
     * Clean up expired rate limit entries
     */
    cleanup(now, windowMs) {
        for (const [key, record] of rateLimitStore.entries()) {
            if ((now - record.windowStart) > windowMs) {
                rateLimitStore.delete(key);
            }
        }
    }

    /**
     * Get current rate limit status (for debugging/headers)
     */
    getStatus(clientIP, sessionCode) {
        const key = `${clientIP}:${sessionCode}`;
        const record = rateLimitStore.get(key);

        if (!record) {
            return { remaining: this.maxRequests, total: this.maxRequests };
        }

        const remaining = Math.max(0, this.maxRequests - record.count);
        return { remaining, total: this.maxRequests };
    }
}
