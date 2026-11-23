import { defineConfig } from '@playwright/test';

/**
 * Browser-level E2E suite (plan Phase 5).
 *
 * Runs the real Vite dev servers for `frontend/web` (:5173) and
 * `frontend/admin` (:5174). The backend is NOT required: every spec stubs
 * `/v1/**` via `page.route` (see fixtures/mockApi.ts), so journeys exercise
 * the real React apps end-to-end in a browser without a database.
 *
 *   pnpm test:e2e            # both projects
 *   pnpm test:e2e -- --project=web
 */
export default defineConfig({
  testDir: './tests',
  // The specs drive real Vite dev servers: a first navigation can spend ~40s
  // compiling a lazy route, so keep a generous per-test ceiling.
  timeout: 120_000,
  // Vite dev first-compile under two workers can exceed 20s; assertions get
  // headroom while the per-test timeout still bounds the whole journey.
  expect: { timeout: 30_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [['list']],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'web', testMatch: 'web-*.spec.ts', use: { baseURL: 'http://localhost:5173' } },
    { name: 'admin', testMatch: 'admin*.spec.ts', use: { baseURL: 'http://localhost:5174' } },
  ],
  webServer: [
    {
      command: 'pnpm -C ../frontend/web dev --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      // Vite 8 dev servers can leave watcher handles on teardown; bound the
      // shutdown instead of hanging the whole gate after scenarios pass.
      gracefulShutdown: { signal: 'SIGTERM', timeout: 2_000 },
      timeout: 120_000,
    },
    {
      command: 'pnpm -C ../frontend/admin dev --port 5174 --strictPort',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 2_000 },
      timeout: 120_000,
    },
  ],
});
