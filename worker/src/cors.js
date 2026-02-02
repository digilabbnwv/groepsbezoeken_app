/**
 * CORS (Cross-Origin Resource Sharing) utilities
 * 
 * Handles preflight requests and CORS headers for GitHub Pages frontend
 */

/**
 * Get allowed origins from environment
 */
function getAllowedOrigins(env) {
    const originsStr = env.ALLOWED_ORIGINS || 'https://digilabbnwv.github.io';
    return originsStr.split(',').map(o => o.trim());
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin, env) {
    if (!origin) return false;
    const allowed = getAllowedOrigins(env);
    return allowed.includes(origin) || allowed.includes('*');
}

/**
 * Get CORS headers for response
 */
export function corsHeaders(env, requestOrigin = null) {
    const allowed = getAllowedOrigins(env);

    // If specific origin requested and it's allowed, use it
    // Otherwise use first allowed origin
    let origin = allowed[0];
    if (requestOrigin && isOriginAllowed(requestOrigin, env)) {
        origin = requestOrigin;
    }

    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
    };
}

/**
 * Handle CORS preflight (OPTIONS) request
 */
export function handleCORS(request, env) {
    const origin = request.headers.get('Origin');

    if (!isOriginAllowed(origin, env)) {
        return new Response('Forbidden', { status: 403 });
    }

    return new Response(null, {
        status: 204,
        headers: corsHeaders(env, origin)
    });
}
