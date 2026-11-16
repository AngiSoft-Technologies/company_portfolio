import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Force test mode so src/connectionUrl.ts resolves TEST_DATABASE_URL
  // instead of the development/production DATABASE_URL.
  test: {
    env: {
      NODE_ENV: 'test',
    },
    hookTimeout: 60_000,
    testTimeout: 60_000,
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
