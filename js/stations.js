/**
 * BiebMissie stations ("verkeersleider")
 * Pure functies, gedeeld door de frontend (mock-modus) en de Cloudflare Worker.
 */

/** Spelmodi */
export const MODES = {
    REGULIER: 'regulier',
    BIEBMISSIE: 'biebmissie'
};

/** Standaard aantal verplichte stations per team */
export const DEFAULT_REQUIRED_STATIONS = 3;

/**
 * Haalt uit de content alleen wat de server nodig heeft om teams te verdelen.
 * @param {Object} content - Inhoud van content/biebmissie.json
 * @returns {{ requiredStations: number, stations: Array<{id: string, capacity: number, priority: boolean, book: string}> }}
 */
export function buildStationConfig(content) {
    return {
        requiredStations: content.requiredStations || DEFAULT_REQUIRED_STATIONS,
        stations: (content.stations || []).map(s => ({
            id: s.id,
            capacity: s.capacity || 1,
            priority: !!s.priority,
            book: s.book || s.id
        }))
    };
}

/**
 * Controleert en normaliseert een stationconfig (komt van de client, dus niet blind vertrouwen).
 * @param {Object} config
 * @returns {Object|null} Genormaliseerde config, of null als hij ongeldig is
 */
export function sanitizeStationConfig(config) {
    if (!config || !Array.isArray(config.stations)) return null;
    if (config.stations.length === 0 || config.stations.length > 20) return null;

    const ids = new Set();
    const stations = [];
    for (const s of config.stations) {
        if (!s || typeof s.id !== 'string' || !/^[A-Za-z0-9_-]{1,20}$/.test(s.id)) return null;
        if (ids.has(s.id)) return null;
        ids.add(s.id);
        const capacity = parseInt(s.capacity, 10);
        stations.push({
            id: s.id,
            capacity: capacity >= 1 && capacity <= 10 ? capacity : 1,
            priority: !!s.priority,
            book: typeof s.book === 'string' && s.book ? s.book.slice(0, 40) : s.id
        });
    }

    const required = parseInt(config.requiredStations, 10);
    return {
        requiredStations: required >= 1 && required <= stations.length ? required : Math.min(DEFAULT_REQUIRED_STATIONS, stations.length),
        stations
    };
}

/**
 * Kleine deterministische hash, zodat teams met gelijke keuzes niet allemaal hetzelfde boek krijgen.
 * @param {string} str
 * @returns {number}
 */
function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h) + str.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}

/**
 * Bepaalt naar welke stations een team nu kan, in volgorde van voorkeur.
 *
 * Regels:
 * - Geen station (of ander station van hetzelfde boek) dat het team al gedaan heeft.
 * - Alleen stations waar nog een exemplaar vrij is.
 * - Prioriteitsstations (De YouTube Hack) die nog door niemand bezocht zijn gaan voor.
 * - Daarna het rustigste station, dan het minst bezochte.
 *
 * @param {Object} params
 * @param {Array} params.stations - [{ id, capacity, priority, book }]
 * @param {Array} params.teams - [{ teamId, currentStation, stationsDone: string[] }]
 * @param {string} params.teamId - Team waarvoor we zoeken
 * @param {string[]} [params.stationsDone] - Gedane stations van dit team (overschrijft teams-data)
 * @returns {{ candidates: string[], remaining: string[] }}
 *   candidates: vrije stations op volgorde van voorkeur; remaining: alle stations die het team nog kan doen
 */
export function rankStations({ stations, teams, teamId, stationsDone }) {
    const me = teams.find(t => t.teamId === teamId) || { stationsDone: [] };
    const done = stationsDone || me.stationsDone || [];
    const doneBooks = new Set(stations.filter(s => done.includes(s.id)).map(s => s.book));

    const others = teams.filter(t => t.teamId !== teamId);
    const occupancy = id => others.filter(t => t.currentStation === id).length;
    const visits = id => others.filter(t => t.currentStation === id || (t.stationsDone || []).includes(id)).length;

    const remaining = stations.filter(s => !done.includes(s.id) && !doneBooks.has(s.book));
    const free = remaining.filter(s => occupancy(s.id) < s.capacity);

    const scored = free.map(s => ({
        id: s.id,
        urgent: s.priority && visits(s.id) === 0 ? 0 : 1,
        load: occupancy(s.id) / s.capacity,
        visits: visits(s.id),
        tiebreak: hash(teamId + s.id)
    }));

    scored.sort((a, b) =>
        a.urgent - b.urgent ||
        a.load - b.load ||
        a.visits - b.visits ||
        a.tiebreak - b.tiebreak
    );

    return {
        candidates: scored.map(s => s.id),
        remaining: remaining.map(s => s.id)
    };
}

/**
 * Normaliseert een getypt antwoord: hoofdletters, accenten, spaties en leestekens tellen niet mee.
 * @param {string} value
 * @returns {string}
 */
export function normalizeAnswer(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

/**
 * Controleert een open antwoord tegen het juiste antwoord en eventuele varianten.
 * @param {string} input
 * @param {string[]} answers
 * @returns {boolean}
 */
export function isOpenAnswerCorrect(input, answers) {
    const given = normalizeAnswer(input);
    if (!given) return false;
    return (answers || []).some(a => normalizeAnswer(a) === given);
}

/**
 * Berekent de kluiscode uit de rijen van het codeformulier.
 * @param {Array<{answer: string, highlight: number}>} rows - highlight is 1-based
 * @returns {string}
 */
export function computeVaultCode(rows) {
    return rows
        .map(r => normalizeAnswer(r.answer).charAt((r.highlight || 1) - 1).toUpperCase())
        .join('');
}
