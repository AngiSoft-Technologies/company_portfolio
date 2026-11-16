import { apiRequest, ensureSession, getAccessToken } from '@angisoft/api-client';

/**
 * Admin API access layer.
 *
 * Delegates to the shared `@angisoft/api-client` so the admin app gets the
 * same security model as the public site:
 *
 *  - **Absolute API origin** — resolves `VITE_API_BASE_URL` in production and
 *    the Vite dev proxy in development, so requests never land on the Netlify
 *    SPA fallback (which used to return `200 text/html` for `/api/*`).
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

/** Resolves the absolute API origin exactly like `@angisoft/api-client`. */
function apiOrigin(): string {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (base) return base.replace(/\/+$/, '').replace(/\/api$/, '');
  return import.meta.env.PROD ? 'https://api.angisoft.co.ke' : '';
}

function buildApiUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const normalized = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? '' : '/'}${path}`;
  const origin = apiOrigin();
  return origin ? `${origin}${normalized}` : normalized;
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