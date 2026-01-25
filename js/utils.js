
// Fisher-Yates shuffle with a seed
export function seededShuffle(array, seed) {
    let m = array.length, t, i;
    // Simple seeded random generator
    const random = function () {
        var x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    // Copy array to avoid mutation of original if needed, or shuffle in place
    // We shuffle a copy here
    let copy = [...array];

    while (m) {
        i = Math.floor(random() * m--);
        t = copy[m];
        copy[m] = copy[i];
        copy[i] = t;
    }
    return copy;
}

// Simple hash for string to number
export function stringToSeed(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

export function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

export const Storage = {
    get: (key) => {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch (e) {
            return null;
        }
    },
    set: (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
    },
    remove: (key) => {
        localStorage.removeItem(key);
    },
    clear: () => localStorage.clear()
};
