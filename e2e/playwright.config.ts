import { defineConfig } from '@playwright/test';

/**
 * Browser-level E2E suite (plan Phase 5).
 *
 * Runs the real Vite dev servers for `frontend/web` (:5173) and
 * `frontend/admin` (:5174). The backend is NOT required: every spec stubs
 * `/api/**` via `page.route` (see fixtures/mockApi.ts), so journeys exercise
 * the real React apps end-to-end in a browser without a database.
 *
 *   pnpm test:e2e            # both projects
 *   pnpm test:e2e -- --project=web
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
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
      timeout: 120_000,
    },
    {
      command: 'pnpm -C ../frontend/admin dev --port 5174 --strictPort',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
