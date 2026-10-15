/**
 * The single source of the app version. The footer reads it, the service worker
 * is registered with it (so a release always gets a fresh cache), and the test
 * suite checks that `package.json` agrees with it.
 */
export const VERSION = '1.3.0';
