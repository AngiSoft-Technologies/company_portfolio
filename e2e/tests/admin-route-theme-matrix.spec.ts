import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { mockApi } from '../fixtures/mockApi';

/**
 * Authenticated admin route × theme matrix — LOCAL, MOCKED browser coverage.
 *
 * This is deliberately not a live-auth matrix: every `/v1/**` request is
 * stubbed (including `/auth/refresh`, which is how the admin guard rehydrates
 * its in-memory session). The real Vite admin app, router, shell and lazy
 * feature chunks still render in Chromium; only the backend is absent.
 *
 * The guarded route set is parsed from `frontend/admin/src/app.tsx` at test
 * time (the `<AdminProtectedLayout>` block), so adding/removing a guarded
 * route changes this matrix without editing a duplicated list here.
 */

type ThemeScenario = {
  /** Test label / failure context. */
  name: 'light' | 'dark' | 'system';
  /** Value seeded for `angisoft-theme-mode`; null means "no stored choice". */
  stored: 'light' | 'dark' | null;
  /** OS preference used for a given guarded route. */
  osForRoute: (index: number) => 'light' | 'dark';
  /** Expected `document.documentElement[data-theme]`. */
  expectedForRoute: (index: number) => 'light' | 'dark';
};

const SCENARIOS: ThemeScenario[] = [
  { name: 'light', stored: 'light', osForRoute: () => 'light', expectedForRoute: () => 'light' },
  // Explicit local choice must win over a light OS preference.
  { name: 'dark', stored: 'dark', osForRoute: () => 'light', expectedForRoute: () => 'dark' },
  // No stored choice: alternate OS preferences across routes so the whole
  // matrix exercises both `prefers-color-scheme` branches.
  {
    name: 'system',
    stored: null,
    osForRoute: (i) => (i % 2 === 0 ? 'dark' : 'light'),
    expectedForRoute: (i) => (i % 2 === 0 ? 'dark' : 'light'),
  },
];

const THEME_KEY = 'angisoft-theme-mode';
const CRITICAL_TOKENS = [
  '--bg-primary',
  '--surface',
  '--text-primary',
  '--text-secondary',
  '--border',
  '--card-bg',
  '--color-primary',
  '--radius-md',
  '--font-body',
] as const;

const EFFECTIVE_ACCESS = {
  version: 1,
  employeeId: 'emp_admin',
  systemRole: 'ADMIN',
  permissions: [{ key: '*', effect: 'GRANT', source: 'SYSTEM' }],
  assignmentCounts: { products: 0, projects: 0, bookings: 0, enquiries: 0, publications: 0 },
  widgets: [],
  preferences: { theme: 'system', layout: 'default' },
};

function adminSourcePath(): string {
  const candidates = [
    resolve(process.cwd(), 'frontend/admin/src/app.tsx'),
    resolve(process.cwd(), '../frontend/admin/src/app.tsx'),
  ];
  const found = candidates.find((candidate) => {
    try {
      readFileSync(candidate, 'utf8');
      return true;
    } catch {
      return false;
    }
  });
  if (!found) throw new Error(`Cannot locate admin route source; tried: ${candidates.join(', ')}`);
  return found;
}

/** Parse every child route of the guarded `<AdminProtectedLayout>` shell. */
function guardedAdminRoutes(): string[] {
  const source = readFileSync(adminSourcePath(), 'utf8');
  const guardStart = source.indexOf('<AdminProtectedLayout>');
  if (guardStart === -1) throw new Error('AdminProtectedLayout guard not found in app.tsx');
  const guardEnd = source.indexOf('</Route>', guardStart);
  if (guardEnd === -1) throw new Error('Closing </Route> for the guarded shell not found');
  const block = source.slice(guardStart, guardEnd);

  const routes = [...block.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map((match) => match[1])
    .map((path) => (path.startsWith('/') ? path : `/${path}`))
    .filter((path) => !['/login', '/admin', '/admin/*', '*'].includes(path));

  const unique = [...new Set(routes)];
  // Sanity-check the parser: a failed parse must not silently test a subset.
  expect(unique.length, 'parsed guarded admin route count').toBeGreaterThanOrEqual(80);
  expect(unique, 'public /login must not be in the guarded matrix').not.toContain('/login');
  return unique;
}

/**
 * Generic, side-effect-free payload for feature endpoints. `useCrud` accepts
 * bare arrays and `data`/`items`/`results` envelopes; returning an empty array
 * exercises each page's real empty state instead of skipping the route.
 * Narrow shapes for individual screens are added below only where a bare
 * array is not enough to mount the component.
 */
function genericMock(ctx: { method: string; pathname: string }) {
  // `mockApi` matches handler keys without `/v1`, but hands the raw browser
  // pathname to functions; normalize here before the narrow-shape checks.
  const path = ctx.pathname.replace(/^\/v1/, '') || '/';

  if (path === '/auth/refresh') return { accessToken: 'matrix-access-token' };
  if (path === '/auth/mfa/status') return { required: false };
  if (path === '/staff-dashboard/effective-access') return EFFECTIVE_ACCESS;
  if (path === '/staff-dashboard/profile') return {};
  if (path === '/auth/mfa/methods') {
    return { enrolled: [], legacyTotp: false, backupCodesRemaining: 0, available: [] };
  }

  // Named shapes required by individual screens under generic mocks.
  if (path === '/admin/money/types') {
    return { flows: [], byFlow: {}, available: 0, total: 0, types: [] };
  }
  if (path.startsWith('/admin/money/payouts')) return { payouts: [] };
  if (path === '/admin/audit-logs') return { logs: [], total: 0, page: 1, limit: 50 };

  // Dashboard/analytics widgets commonly expect named collections.
  if (/dashboard|stats|summary|metrics|analytics/i.test(path)) {
    return {
      stats: {}, summary: {}, metrics: {}, analytics: {}, widgets: [],
      data: [], items: [], results: [],
    };
  }
  return [];
}

function seedTheme(stored: 'light' | 'dark' | null) {
  if (stored === null) {
    // Remove the app's own write before each document load so every route is
    // still a genuine "no stored choice → follow the OS" navigation.
    localStorage.removeItem('angisoft-theme-mode');
  } else if (!localStorage.getItem('angisoft-theme-mode')) {
    // Seed only once: subsequent navigations must prove the app persisted it.
    localStorage.setItem('angisoft-theme-mode', stored);
  }
}

type StyleReport = {
  missing: string[];
  bodyBgMatchesToken: boolean;
  bodyTextMatchesToken: boolean;
  dataTheme: string | null;
};

async function inspectTheme(page: import('@playwright/test').Page): Promise<StyleReport> {
  return page.evaluate((tokens) => {
    const root = document.documentElement;
    const computed = getComputedStyle(root);
    const missing = tokens.filter((token) => !computed.getPropertyValue(token).trim());

    // Compare the body's real computed colours with probe elements painted by
    // the same CSS variables: this fails if tokens are unset or the shell
    // stopped consuming them, without hardcoding brand hex values.
    const probeBg = document.createElement('div');
    const probeText = document.createElement('div');
    for (const probe of [probeBg, probeText]) {
      probe.style.position = 'absolute';
      probe.style.left = '-9999px';
      document.body.appendChild(probe);
    }
    probeBg.style.backgroundColor = 'var(--bg-primary)';
    probeText.style.color = 'var(--text-primary)';
    const body = getComputedStyle(document.body);
    const report: StyleReport = {
      missing: [...missing],
      bodyBgMatchesToken: getComputedStyle(probeBg).backgroundColor === body.backgroundColor,
      bodyTextMatchesToken: getComputedStyle(probeText).color === body.color,
      dataTheme: root.getAttribute('data-theme'),
    };
    probeBg.remove();
    probeText.remove();
    return report;
  }, [...CRITICAL_TOKENS]);
}

/** Keep each Playwright test short enough to stay under the suite ceiling. */
function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
  return groups;
}

async function expectNoOverlay(page: import('@playwright/test').Page, context: string) {
  const overlays = await page.evaluate(() => {
    const nodes = document.querySelectorAll(
      'vite-error-overlay, vite-plugin-checker-error-overlay, [data-react-error-overlay]',
    );
    return [...nodes].map((node) => node.tagName.toLowerCase());
  });
  expect(overlays, `${context}: compiler/React error overlay must not render`).toEqual([]);
}

test.describe('admin authenticated route × theme matrix (mocked)', () => {
  const routes = guardedAdminRoutes();

  // The admin Vite proxy is intentionally scoped to `/uploads/public`, so a
  // document request for the guarded `/uploads` route is served by Vite's HTML
  // transform (with the React refresh preamble), not by a raw index.html stub.

  const CHUNK_SIZE = 16;
  for (const scenario of SCENARIOS) {
    const groups = chunk(routes, CHUNK_SIZE);
    for (const [groupIndex, group] of groups.entries()) {
      const offset = groupIndex * CHUNK_SIZE;
      test(`${scenario.name} theme · routes ${offset + 1}-${offset + group.length}`, async ({ page }) => {
        // Each chunk reuses one authenticated page. Bounded so a Vite cold
        // compile of many lazy feature chunks cannot stall the whole gate.
        test.setTimeout(8 * 60_000);

        const pageErrors: string[] = [];
        page.on('pageerror', (error) => pageErrors.push(String(error)));
        await page.addInitScript(seedTheme, scenario.stored);

        let refreshCount = 0;
        await mockApi(page, {
          'POST /v1/auth/refresh': () => {
            refreshCount += 1;
            return { accessToken: 'matrix-access-token' };
          },
          'GET /v1/auth/mfa/status': { required: false },
          'GET /v1/staff-dashboard/effective-access': EFFECTIVE_ACCESS,
          'GET /*': (ctx) => genericMock(ctx),
        });

        for (const [index, route] of group.entries()) {
          const routeIndex = offset + index;
          const os = scenario.osForRoute(routeIndex);
          const expected = scenario.expectedForRoute(routeIndex);
          const context = `route=${route} theme=${scenario.name} os=${os}`;
          pageErrors.length = 0;

          await test.step(context, async () => {
            await page.emulateMedia({ colorScheme: os });
            const beforeRefresh = refreshCount;
            await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 45_000 });

            await expect(page.locator('aside').getByText('AngiSoft Admin'), `${context}: admin shell`)
              .toBeVisible({ timeout: 30_000 });
            await expect(page.locator('main'), `${context}: route outlet`).toBeVisible();
            await expect(page.locator('main [aria-label="Loading"]'), `${context}: lazy route mounted`)
              .toHaveCount(0, { timeout: 30_000 });
            await expect.poll(() => page.locator('main').innerText(), {
              message: `${context}: route content rendered`,
              timeout: 30_000,
            }).not.toBe('');

            expect(new URL(page.url()).pathname, `${context}: stayed on guarded route`).toBe(route);
            expect(refreshCount, `${context}: authenticated via mocked refresh`).toBeGreaterThan(beforeRefresh);

            const style = await inspectTheme(page);
            expect(style.dataTheme, `${context}: data-theme`).toBe(expected);
            expect(style.missing, `${context}: critical CSS tokens present`).toEqual([]);
            expect(style.bodyBgMatchesToken, `${context}: body background uses --bg-primary`).toBe(true);
            expect(style.bodyTextMatchesToken, `${context}: body text uses --text-primary`).toBe(true);

            const stored = await page.evaluate((key) => localStorage.getItem(key), THEME_KEY);
            expect(stored, `${context}: persisted theme choice`).toBe(
              scenario.stored === null ? expected : scenario.stored,
            );

            await expectNoOverlay(page, context);
            expect(pageErrors, `${context}: no uncaught page errors`).toEqual([]);
          });
        }
      });
    }
  }

  test('explicit theme choice survives navigation; system follows a changed OS preference', async ({ page }) => {
    test.setTimeout(10 * 60_000);
    await page.addInitScript(() => {
      // One-time reset only: later navigations must keep the explicit choice.
      if (!sessionStorage.getItem('matrix-theme-seeded')) {
        localStorage.removeItem('angisoft-theme-mode');
        sessionStorage.setItem('matrix-theme-seeded', '1');
      }
    });
    await mockApi(page, {
      'POST /v1/auth/refresh': { accessToken: 'matrix-access-token' },
      'GET /v1/auth/mfa/status': { required: false },
      'GET /v1/staff-dashboard/effective-access': EFFECTIVE_ACCESS,
      'GET /*': (ctx) => genericMock(ctx),
    });

    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await expect(page.locator('aside').getByText('AngiSoft Admin')).toBeVisible({ timeout: 30_000 });
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY), 'system follows dark OS').toBe('dark');
    expect((await inspectTheme(page)).dataTheme, 'system follows dark OS').toBe('dark');

    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBe('light');
    expect((await inspectTheme(page)).dataTheme, 'toggle persists light').toBe('light');

    await page.goto('/reports', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await expect(page.locator('aside').getByText('AngiSoft Admin')).toBeVisible({ timeout: 30_000 });
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY), 'light survives navigation').toBe('light');
    expect((await inspectTheme(page)).dataTheme, 'light survives navigation').toBe('light');

    // Clear the explicit choice and reload under the opposite OS preference.
    await page.evaluate((key) => localStorage.removeItem(key), THEME_KEY);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/reports', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await expect(page.locator('aside').getByText('AngiSoft Admin')).toBeVisible({ timeout: 30_000 });
    expect((await inspectTheme(page)).dataTheme, 'system follows changed light OS').toBe('light');
  });
});
