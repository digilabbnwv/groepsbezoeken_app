/**
 * Groepsbezoeken App - Cloudflare Worker
 * 
 * Vervangt Power Automate + Microsoft Lists backend
 * met Cloudflare D1 (SQLite) voor betere performance en eenvoudigere architectuur.
 */

import { handleCORS, corsHeaders } from './cors.js';
import { validateSecret, validateAdminSecret } from './auth.js';
import { RateLimiter } from './rateLimit.js';
import {
    createSession,
    fetchSessionState,
    joinTeam,
    updateTeam,
    adminUpdateWords,
    purgeSession,
    autoPurgeSessions
} from './handlers.js';

export default {
    /**
     * Main HTTP request handler
     */
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return handleCORS(request, env);
        }

        // Initialize rate limiter
        const rateLimiter = new RateLimiter(env);

        try {
            // Check rate limit
            const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
            const sessionCode = url.searchParams.get('code') || 'global';
            const isAllowed = await rateLimiter.checkLimit(clientIP, sessionCode);

            if (!isAllowed) {
                return jsonResponse({ error: 'Rate limit exceeded. Please try again later.' }, 429, env);
            }

            // Route requests
            const path = url.pathname;

            // API Routes
            if (path === '/api/createSession' && request.method === 'POST') {
                const body = await request.json();
                if (!validateSecret(body.secret, url, env)) {
                    return jsonResponse({ error: 'Invalid secret' }, 401, env);
                }
                return await createSession(body, env);
            }

            if (path === '/api/fetchSessionState' && request.method === 'GET') {
                if (!validateSecret(null, url, env)) {
                    return jsonResponse({ error: 'Invalid secret' }, 401, env);
                }
                const code = url.searchParams.get('code');
                if (!code) {
                    return jsonResponse({ error: 'Missing code parameter' }, 400, env);
                }
                return await fetchSessionState(code, env);
            }

            if (path === '/api/joinTeam' && request.method === 'POST') {
                const body = await request.json();
                if (!validateSecret(body.secret, url, env)) {
                    return jsonResponse({ error: 'Invalid secret' }, 401, env);
                }
                return await joinTeam(body, env);
            }

            if (path === '/api/updateTeam' && request.method === 'POST') {
                const body = await request.json();
                if (!validateSecret(body.secret, url, env)) {
                    return jsonResponse({ error: 'Invalid secret' }, 401, env);
                }
                return await updateTeam(body, env);
            }

            if (path === '/api/adminUpdateWords' && request.method === 'POST') {
                const body = await request.json();
                // Admin endpoints require admin secret
                if (!validateAdminSecret(body.secret, url, env)) {
                    return jsonResponse({ error: 'Invalid admin secret' }, 401, env);
                }
                const code = url.searchParams.get('code') || body.sessionCode;
                if (!code) {
                    return jsonResponse({ error: 'Missing session code' }, 400, env);
                }
                return await adminUpdateWords(code, body, env);
            }

            if (path === '/api/purgeSession' && request.method === 'POST') {
                const body = await request.json();
                // Admin endpoints require admin secret
                if (!validateAdminSecret(body.secret, url, env)) {
                    return jsonResponse({ error: 'Invalid admin secret' }, 401, env);
                }
                return await purgeSession(body, env);
            }

            // Health check endpoint
            if (path === '/health' || path === '/') {
                return jsonResponse({
                    status: 'ok',
                    version: '1.0.0',
                    timestamp: new Date().toISOString()
                }, 200, env);
            }

            // 404 for unknown routes
            return jsonResponse({ error: 'Not found' }, 404, env);

        } catch (error) {
            console.error('Worker error:', error);
            return jsonResponse({
                error: 'Internal server error',
                message: error.message
            }, 500, env);
        }
    },

    /**
     * Scheduled (Cron) handler - runs weekly for auto-purge
     * Configured in wrangler.toml: Sunday 22:00 UTC (≈ 23:00 NL winter, 00:00 NL summer)
     */
    async scheduled(event, env, ctx) {
        console.log('Cron triggered:', event.cron);

        try {
            const result = await autoPurgeSessions(env);
            console.log('Auto-purge completed:', result);
        } catch (error) {
            console.error('Auto-purge failed:', error);
        }
    }
};

/**
 * Create JSON response with CORS headers
 */
function jsonResponse(data, status, env) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(env)
        }
    });
}
