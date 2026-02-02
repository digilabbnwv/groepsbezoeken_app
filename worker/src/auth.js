/**
 * Authentication utilities
 * 
 * Validates API secrets for regular and admin endpoints.
 * Secrets are passed via URL query string (as per existing frontend behavior)
 * and optionally in POST body.
 */

/**
 * Validate regular app secret
 * Checks both query string and body for backward compatibility
 * 
 * @param {string|null} bodySecret - Secret from request body
 * @param {URL} url - Request URL (for query params)
 * @param {Object} env - Environment variables
 * @returns {boolean} - True if valid
 */
export function validateSecret(bodySecret, url, env) {
    const expectedSecret = env.APP_SECRET;

    // If no secret configured, allow all (dev mode warning)
    if (!expectedSecret) {
        console.warn('APP_SECRET not configured - running in development mode');
        return true;
    }

    // Check query string first (primary method per API docs)
    const querySecret = url.searchParams.get('secret');
    if (querySecret === expectedSecret) {
        return true;
    }

    // Also check body (for backward compatibility)
    if (bodySecret === expectedSecret) {
        return true;
    }

    return false;
}

/**
 * Validate admin secret for privileged operations
 * (adminUpdateWords, purgeSession)
 * 
 * Admin secret takes precedence, but falls back to regular secret
 * if admin secret is not configured (simpler deployments)
 * 
 * @param {string|null} bodySecret - Secret from request body
 * @param {URL} url - Request URL (for query params)
 * @param {Object} env - Environment variables
 * @returns {boolean} - True if valid
 */
export function validateAdminSecret(bodySecret, url, env) {
    const adminSecret = env.ADMIN_SECRET;

    // If admin secret is configured, require it
    if (adminSecret) {
        const querySecret = url.searchParams.get('secret') ||
            url.searchParams.get('adminSecret') ||
            url.searchParams.get('admin_secret');

        if (querySecret === adminSecret || bodySecret === adminSecret) {
            return true;
        }
        return false;
    }

    // No separate admin secret - fall back to regular secret
    return validateSecret(bodySecret, url, env);
}
