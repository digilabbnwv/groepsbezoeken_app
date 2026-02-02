/**
 * Constants
 * Centrale plek voor alle constanten en configureerbare waarden.
 */

/**
 * Beschikbare dieren/teams met hun eigenschappen
 * @constant {Object[]}
 */
export const ANIMALS = [
    { id: 1, name: "Panda", teamName: "Pittige Panda's", color: "#E86A2A", icon: "🐼" },
    { id: 2, name: "Koe", teamName: "Kale Koeien", color: "#264653", icon: "🐮" },
    { id: 3, name: "Leeuw", teamName: "Lollige Leeuwen", color: "#E9C46A", icon: "🦁" },
    { id: 4, name: "Koala", teamName: "Koddige Koala's", color: "#7C3AED", icon: "🐨" },
    { id: 5, name: "Kraai", teamName: "Kekke Kraaien", color: "#343A40", icon: "🐦" },
    { id: 6, name: "Beer", teamName: "Brutale Beren", color: "#6F4518", icon: "🐻" },
    { id: 7, name: "Kwal", teamName: "Kwieke Kwallen", color: "#0EA5E9", icon: "🪼" },
    { id: 8, name: "Stokstaart", teamName: "Stoere Stokstaarten", color: "#16A34A", icon: "🐿️" },
    { id: 9, name: "Dolfijn", teamName: "Dappere Dolfijnen", color: "#1D4ED8", icon: "🐬" },
    { id: 10, name: "Slang", teamName: "Slimme Slangen", color: "#6C757D", icon: "🐍" }
];

/**
 * Haalt dier info op basis van ID
 * @param {number} animalId 
 * @returns {Object|null}
 */
export function getAnimalById(animalId) {
    return ANIMALS.find(a => a.id === animalId) || null;
}

/**
 * Haalt dier info op basis van teamnaam
 * @param {string} teamName 
 * @returns {Object|null}
 */
export function getAnimalByTeamName(teamName) {
    return ANIMALS.find(a => a.teamName === teamName) || null;
}

/**
 * Haalt het icon op voor een diernaam
 * @param {string} name - Naam van het dier
 * @returns {string} Emoji icon
 */
export function getAnimalIcon(name) {
    const animal = ANIMALS.find(a =>
        a.name === name || name.includes(a.name)
    );
    return animal?.icon || '🐾';
}

/**
 * Geldige vestigingscodes (PINs)
 * @constant {string[]}
 */
export const VALID_PINS = ['7300', '6801', '6800', '4500', '3800'];

/**
 * Game configuratie
 * @constant {Object}
 */
export const GAME_CONFIG = {
    /** Aantal vragen per spelronde */
    TOTAL_QUESTIONS: 12,

    /** Maximaal aantal pogingen per vraag */
    MAX_ATTEMPTS_PER_QUESTION: 2,

    /** Maximaal aantal hints per spel */
    MAX_HINTS: 3,

    /** Straftijd per verkeerd antwoord (seconden) */
    PENALTY_SECONDS: 30,

    /** Maximale speeltijd (seconden) */
    MAX_TIME_SECONDS: 45 * 60,

    /** Polling interval voor state updates (ms) */
    POLLING_INTERVAL: 5000,

    /** Timeout voor API calls (ms) */
    API_TIMEOUT: 8000,

    /** Inactiviteit threshold voor "offline" status (ms) */
    OFFLINE_THRESHOLD: 20000
};

/**
 * De vaste oplossing (20 woorden)
 * @constant {string[]}
 */
export const SOLUTION_WORDS = [
    "In", "de", "bibliotheek", "vinden", "we",
    "verhalen", "om", "in", "te", "verdwijnen",
    "spanning", "actie", "fantasie", "verbeelding", "en",
    "samen", "ontdekken", "we", "nieuwe", "werelden"
];

/**
 * De volledige oplossing als zin
 * @constant {string}
 */
export const SOLUTION_SENTENCE_TEXT =
    "In de bibliotheek vinden we verhalen om in te verdwijnen: " +
    "spanning, actie, fantasie, verbeelding, en samen ontdekken we nieuwe werelden.";
