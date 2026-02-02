import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'happy-dom',
        globals: true,
        include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
        exclude: ['tests/e2e/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['js/**/*.js'],
            exclude: ['js/app.js'], // Main app file is tested via E2E
        },
        setupFiles: ['./tests/setup.js'],
    },
});
