import { defineConfig } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
    testDir: 'tests/e2e',
    timeout: 15000,
    use: {
        baseURL: `http://localhost:${PORT}/`,
        locale: 'ar',
        // Service workers would cache between tests; the browser tests are about
        // the page, not the offline layer.
        serviceWorkers: 'block'
    },
    webServer: {
        command: `node tests/serve.js ${PORT}`,
        url: `http://localhost:${PORT}/`,
        reuseExistingServer: !process.env.CI
    },
    projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
});
