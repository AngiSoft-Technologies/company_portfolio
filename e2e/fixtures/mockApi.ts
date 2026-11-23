import type { Page, Route } from '@playwright/test';

/**
 * Stub the backend for browser E2E specs.
 *
 * Usage:
 *   await mockApi(page, {
 *     'GET /v1/services': { data: [...] },           // plain body → 200 JSON
 *     'POST /v1/auth/login': { status: 200, body: { accessToken: 'x' } },
 *     'GET /v1/payroll/admin*': [...],               // trailing * = prefix match
 *   });
 *
 * The apps call `/v1/*`; matching is on `METHOD pathname` (query string
 * excluded). Unmatched requests get a 404 `{ "error": "not mocked" }` so pages
 * exercise their real error/empty-state paths instead of hitting a dead
 * backend. There is intentionally no `/api/*` alias: a wrong base URL should
 * fail the gate rather than be silently mocked.
 */

type MockContext = {
  method: string;
  url: string;
  pathname: string;
  postData: string | null;
};

type MockResult = { status?: number; body?: unknown };
export type MockHandler = unknown | ((ctx: MockContext) => MockResult | unknown | Promise<MockResult | unknown>);

const isEnvelope = (v: unknown): v is MockResult =>
  !!v && typeof v === 'object' &&
  ('body' in (v as object) || (typeof (v as MockResult).status === 'number' && Object.keys(v as object).length === 1));

export async function mockApi(page: Page, handlers: Record<string, MockHandler> = {}): Promise<void> {
  const entries = Object.entries(handlers).map(([key, handler]) => {
    const i = key.indexOf(' ');
    return { method: key.slice(0, i).toUpperCase(), path: stripVersion(key.slice(i + 1)), handler };
  });

  const fulfill = async (route: Route) => {
    const req = route.request();
    const { pathname } = new URL(req.url());
    const method = req.method().toUpperCase();
    const ctx: MockContext = { method, url: req.url(), pathname, postData: req.postData() };
    const apiPath = stripVersion(pathname);

    const match =
      entries.find((e) => e.method === method && pathMatches(e.path, apiPath)) ??
      entries.find((e) => e.method === '*' && pathMatches(e.path, apiPath));

    if (!match) {
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'not mocked' }),
      });
    }

    const out = typeof match.handler === 'function' ? await (match.handler as (c: MockContext) => unknown)(ctx) : match.handler;
    const { status, body } = isEnvelope(out) ? { status: out.status ?? 200, body: out.body } : { status: 200, body: out };
    return route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body ?? {}),
    });
  };

  await page.route('**/v1/**', fulfill);
}

/** Drop the `/v1` prefix so handler keys and requests share one shape. */
function stripVersion(path: string): string {
  if (path === '/v1') return '/';
  if (path.startsWith('/v1/')) return path.slice(3);
  return path;
}

function pathMatches(pattern: string, pathname: string): boolean {
  if (pattern.endsWith('*')) return pathname.startsWith(pattern.slice(0, -1));
  return pathname === pattern;
}

/**
 * Seed the client consent gate for specs that test a gated page directly.
 * Mirrors `storeConsent()` in frontend/web/src/lib/consent.ts.
 */
export async function grantClientConsent(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('angisoft.client-consent', JSON.stringify({
      version: '2026-11-21-privacy-terms',
      privacy: true,
      terms: true,
      acceptedAt: new Date().toISOString(),
    }));
  });
}
