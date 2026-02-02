/**
 * Vitest Setup File
 * Runs before all tests to set up the test environment
 */

// Mock localStorage for tests
const localStorageMock = {
    store: {},
    getItem(key) {
        return this.store[key] || null;
    },
    setItem(key, value) {
        this.store[key] = String(value);
    },
    removeItem(key) {
        delete this.store[key];
    },
    clear() {
        this.store = {};
    },
};

// Apply mock if not in browser environment
if (typeof window !== 'undefined' && !window.localStorage) {
    Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
    });
}

// Reset localStorage before each test
beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
    }
});

// Global test utilities
globalThis.createMockResponse = (data, ok = true, status = 200) => ({
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
});

globalThis.createMockFetch = (responses) => {
    let callIndex = 0;
    return async (_url, _options) => {
        const response = Array.isArray(responses)
            ? responses[callIndex++]
            : responses;
        return globalThis.createMockResponse(response);
    };
};
