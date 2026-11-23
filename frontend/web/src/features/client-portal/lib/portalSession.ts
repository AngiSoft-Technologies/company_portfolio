import { getClientAccessToken, setClientAccessToken } from '@angisoft/api-client';

/**
 * Client-portal session plumbing.
 *
 * `@angisoft/api-client` owns the in-memory token, but its automatic refresh
 * path is deliberately admin-only (`/v1/auth/refresh`). Client sessions use a
 * separate cookie (`clientRefreshToken`, scoped to `/v1/client-portal`) and a
 * rotating refresh endpoint, so the web app performs the refresh here and then
 * hands the new token back to the shared store.
 */

const API_ORIGIN = ((import.meta.env as Record<string, string | undefined>).VITE_API_BASE_URL || '')
  .replace(/\/+$/, '')
  .replace(/\/v1$/, '')
  .replace(/\/api$/, '');

const apiUrl = (endpoint: string): string => {
  if (endpoint.startsWith('http')) return endpoint;
  const path = endpoint.startsWith('/v1') ? endpoint : `/v1${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  return `${API_ORIGIN}${path}`;
};

const readCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
};

const csrfHeader = (): Record<string, string> => {
  const token = readCookie('csrfToken');
  return token ? { 'x-csrf-token': token } : {};
};

export class PortalSessionError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PortalSessionError';
    this.status = status;
  }
}

const errorMessage = (payload: unknown, fallback: string): string => {
  const body = payload as Record<string, unknown> | null;
  if (!body) return fallback;
  const error = body.error;
  if (typeof error === 'string' && error) return error;
  if (Array.isArray(error)) return error.map((item) => String((item as Record<string, unknown>)?.msg || item)).join(', ');
  return fallback;
};

const rawRequest = async (method: string, endpoint: string, data?: unknown, token?: string | null): Promise<Response> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...csrfHeader(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(apiUrl(endpoint), {
    method,
    headers,
    credentials: 'include',
    body: data === undefined ? undefined : JSON.stringify(data),
  });
};

const tokenExpiry = (token: string): number => {
  try {
    const part = token.split('.')[1];
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))) as { exp?: number };
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : 0;
  } catch {
    return 0;
  }
};

/** Decode failures count as "needs refresh" so a malformed token cannot wedge the UI. */
const isRefreshNeeded = (token: string | null): boolean => {
  if (!token) return true;
  const expiry = tokenExpiry(token);
  return !expiry || expiry - Date.now() < 60_000;
};

let refreshInFlight: Promise<boolean> | null = null;

const performRefresh = async (): Promise<boolean> => {
  try {
    const res = await rawRequest('POST', '/client-portal/refresh');
    if (!res.ok) {
      setClientAccessToken(null);
      return false;
    }
    const data = (await res.json()) as { accessToken?: string };
    if (!data.accessToken) {
      setClientAccessToken(null);
      return false;
    }
    setClientAccessToken(data.accessToken);
    return true;
  } catch {
    setClientAccessToken(null);
    return false;
  }
};

/** Single-flight refresh so parallel dashboard requests rotate the cookie once. */
export const refreshClientSession = (): Promise<boolean> => {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

/** Rehydrate after a reload, or refresh proactively when the JWT is about to expire. */
export const ensureClientSession = (): Promise<boolean> => {
  if (!isRefreshNeeded(getClientAccessToken())) return Promise.resolve(true);
  return refreshClientSession();
};

const portalRequest = async <T,>(method: string, endpoint: string, data?: unknown, allowRetry = true): Promise<T> => {
  await ensureClientSession();
  const token = getClientAccessToken();
  const res = await rawRequest(method, endpoint, data, token);
  if (res.status === 401 && allowRetry && (await refreshClientSession())) {
    return portalRequest<T>(method, endpoint, data, false);
  }
  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new PortalSessionError(errorMessage(payload, 'Client portal request failed'), res.status);
  return payload as T;
};

export const portalGet = <T,>(endpoint: string): Promise<T> => portalRequest<T>('GET', endpoint);
export const portalPost = <T,>(endpoint: string, data: unknown = {}): Promise<T> => portalRequest<T>('POST', endpoint, data);

const publicPost = async <T,>(endpoint: string, data: unknown): Promise<T> => {
  const res = await rawRequest('POST', endpoint, data);
  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new PortalSessionError(errorMessage(payload, 'Request failed'), res.status);
  return payload as T;
};

export const requestClientMagicLink = (email: string): Promise<{ ok: boolean }> =>
  publicPost('/client-portal/request-link', { email });

export const loginWithPassword = async (
  email: string,
  password: string,
  remember = true,
): Promise<{ accessToken: string; client?: { id: string; name: string; email: string } }> => {
  const result = await publicPost<{ accessToken: string; client?: { id: string; name: string; email: string } }>(
    '/client-portal/login',
    { email, password, remember },
  );
  if (result?.accessToken) setClientAccessToken(result.accessToken);
  return result;
};

export const loginWithMagicToken = async (token: string, remember = true): Promise<{ accessToken: string }> => {
  const result = await publicPost<{ accessToken: string }>('/client-portal/session', { token, remember });
  if (!result?.accessToken) throw new PortalSessionError('Invalid portal link', 401);
  setClientAccessToken(result.accessToken);
  return result;
};

/** Set or replace the password using an already authenticated client session. */
export const setClientPassword = async (password: string): Promise<{ ok: boolean }> => {
  const result = await portalPost<{ ok: boolean; accessToken?: string }>('/client-portal/password', { password });
  if (result?.accessToken) setClientAccessToken(result.accessToken);
  return { ok: !!result?.ok };
};

export const logoutClient = async (): Promise<void> => {
  try {
    await portalPost('/client-portal/logout');
  } finally {
    setClientAccessToken(null);
  }
};
