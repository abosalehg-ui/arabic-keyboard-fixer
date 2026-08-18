export default [
    {
        files: ['js/**/*.js', 'tests/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                document: 'readonly',
                window: 'readonly',
                navigator: 'readonly',
                localStorage: 'readonly',
                fetch: 'readonly',
                console: 'readonly',
                process: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                requestAnimationFrame: 'readonly',
                Blob: 'readonly',
                URL: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
            'no-undef': 'error',
            'eqeqeq': ['error', 'smart'],
            'no-var': 'error',
            'prefer-const': 'error'
        }
    },
    {
        files: ['service-worker.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: { self: 'readonly', caches: 'readonly', fetch: 'readonly', URL: 'readonly', Promise: 'readonly' }
        },
        rules: { 'no-undef': 'error', 'no-var': 'error' }
    }
];
