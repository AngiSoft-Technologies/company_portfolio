import { apiRequest, ensureSession, getAccessToken } from '@angisoft/api-client';

/**
 * Admin API access layer.
 *
 * Delegates to the shared `@angisoft/api-client` so the admin app gets the
 * same security model as the public site:
 *
 *  - **Same-origin API URL** — every call uses a relative `/v1/*` path. Netlify
 *    proxies it to the backend, so the host-only `SameSite=Strict` refresh cookie
 *    and the readable `csrfToken` cookie stay on the app's own origin. An
 *    absolute API origin makes the browser call the API host directly, where JS
 *    cannot read the CSRF cookie and login fails with 403.
 *  - **Bearer token in memory** — the access token is attached from the
 *    in-memory store instead of being (re)read from `localStorage`, so it can
 *    never be exfiltrated by an injected script.
 *  - **CSRF double-submit** — the `x-csrf-token` header is echoed from the
 *    `csrfToken` cookie on every state-changing request, as required by the
 *    backend `csrfProtect` middleware.
 *  - **Silent refresh** — a 401 triggers one `/auth/refresh` retry before the
 *    user is redirected to login.
 */

/** Reads the shared client's `csrfToken` cookie for the double-submit header. */
function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )csrfToken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Normalizes an admin endpoint to a same-origin `/v1/*` path. */
function buildApiUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const versionless = path.startsWith('/api/')
    ? path.slice(4)
    : path === '/api' ? '/' : path;
  return versionless.startsWith('/v1')
    ? versionless
    : `/v1${versionless.startsWith('/') ? '' : '/'}${versionless}`;
}

/**
 * Multipart upload. Kept local because the shared client's `apiUpload` only
 * accepts a single `File`, while admin screens send rich `FormData`.
 */
async function uploadForm(path: string, method: string, form: FormData): Promise<unknown> {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const csrf = readCsrfCookie();
  if (csrf && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    headers['x-csrf-token'] = csrf;
  }

  const res = await fetch(buildApiUrl(path), {
    method,
    credentials: 'include',
    headers,
    body: form,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const rec = (json ?? {}) as Record<string, unknown>;
    throw new Error(
      (typeof rec.error === 'string' && rec.error) ||
        (typeof rec.message === 'string' && rec.message) ||
        `Request failed (${res.status})`,
    );
  }
  return json;
}

export async function apiFetch(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<unknown> {
  const { method = 'GET', body } = options;

  // A full page reload clears the in-memory token; rehydrate from the
  // httpOnly refresh cookie before issuing the first request so the very
  // first call after a reload is already authenticated.
  await ensureSession();

  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return uploadForm(path, method, body);
  }

  return apiRequest(method, path, body === undefined ? null : body);
}

export { setAccessToken, getAccessToken } from '@angisoft/api-client';