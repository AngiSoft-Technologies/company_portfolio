// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- ambient import.meta.env typing for downstream packages
/// <reference path="./vite-env.d.ts" />

import { toast } from '@angisoft/utils';
import type { ApiError, ApiResponse } from '@angisoft/types';

/**
 * Single source of truth for session/auth state on the frontend.
 *
 * Security model:
 *  - Access tokens live ONLY in memory (module scope). They are never written
 *    to localStorage/sessionStorage/indexedDB, so an XSS payload cannot
 *    exfiltrate a long-lived credential.
 *  - The refresh token is an httpOnly + SameSite=strict cookie set by the
 *    backend. On a 401 the client silently refreshes once, retries, and only
 *    redirects to login if refresh fails.
 *  - On full page reload the in-memory token is gone; components call
 *    ensureSession() (or the route guards do) to rehydrate via /auth/refresh.
 */

// ─── In-memory token store ────────────────────────────────────────────────
let adminAccessToken: string | null = null;
let clientAccessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

export const setAccessToken = (t: string | null): void => {
  adminAccessToken = t || null;
};
export const getAccessToken = (): string | null => adminAccessToken;
export const setClientAccessToken = (t: string | null): void => {
  clientAccessToken = t || null;
};
export const getClientAccessToken = (): string | null => clientAccessToken;

const clearSession = (): void => {
  adminAccessToken = null;
  clientAccessToken = null;
  refreshPromise = null;
};

// ─── CSRF double-submit helper (same-origin only) ─────────────────────────
const readCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
};

const normalizeOrigin = (origin?: string): string => {
  if (!origin) return '';
  return origin.replace(/\/+$/, '').replace(/\/api$/, '');
};

const API_ORIGIN: string =
  normalizeOrigin(import.meta.env.VITE_API_BASE_URL as string) ||
  (import.meta.env.PROD ? 'https://api.angisoft.co.ke' : '');

const buildApiUrl = (endpoint: string): string => {
  if (endpoint.startsWith('http')) return endpoint;
  const normalized = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  return API_ORIGIN ? `${API_ORIGIN}${normalized}` : normalized;
};

let notificationHandler: ((message: string, type: 'error' | 'info') => void) | null = null;

export const setNotificationHandler = (handler: (message: string, type: 'error' | 'info') => void): void => {
  notificationHandler = handler;
};

const tryRefresh = async (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const url = buildApiUrl('/auth/refresh');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('refresh failed');
      const data = (await res.json()) as { accessToken?: string };
      if (!data.accessToken) throw new Error('no token in refresh response');
      adminAccessToken = data.accessToken;
      return data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

const redirectToLogin = (): void => {
  clearSession();
  const p = window.location.pathname;
  if (p.startsWith('/admin')) {
    toast.error('Session expired. Please login again.');
    setTimeout(() => {
      window.location.href = '/admin/login';
    }, 1000);
  } else if (p.startsWith('/portal')) {
    toast.error('Session expired. Please request a new portal link.');
    setTimeout(() => {
      window.location.href = '/portal/request';
    }, 800);
  }
};

const resolveToken = (token?: string | null): string | null => token || adminAccessToken || clientAccessToken;

const doFetch = async (
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: BodyInit | null,
  token?: string | null
): Promise<Response> => {
  const options: RequestInit = { method, headers, credentials: 'include' };
  if (body !== undefined && body !== null) options.body = body;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    const csrf = readCookie('csrfToken');
    if (csrf) headers['x-csrf-token'] = csrf;
  }

  return fetch(url, options);
};

const handleError = (message: string): void => {
  console.error('API Error:', message);
  toast.error(message);
  if (notificationHandler) notificationHandler(message, 'error');
};

export const apiRequest = async <T = unknown>(
  method: string,
  endpoint: string,
  data: unknown = null,
  token?: string | null
): Promise<T> => {
  const url = buildApiUrl(endpoint);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const body: string | null = data !== null && data !== undefined ? JSON.stringify(data) : null;

  try {
    let response = await doFetch(method, url, headers, body, resolveToken(token));
    if (response.status === 401 && adminAccessToken) {
      try {
        await tryRefresh();
        response = await doFetch(method, url, headers, body, resolveToken(token));
      } catch {
        redirectToLogin();
        throw new Error('Session expired');
      }
    }

    let result: Record<string, unknown>;
    try {
      result = (await response.json()) as Record<string, unknown>;
    } catch {
      result = {};
    }

    if (!response.ok) {
      const errorMessage = (result.error as string) || (result.message as string) || 'API Error';
      if (response.status === 401) redirectToLogin();
      handleError(errorMessage);
      const err = new Error(errorMessage) as unknown as ApiError;
      err.status = response.status;
      throw err;
    }
    return result as T;
  } catch (error) {
    if ((error as ApiError)?.status) throw error;
    handleError((error as Error).message || 'Network error. Please check your connection.');
    throw error;
  }
};

export const apiGet = <T = unknown>(endpoint: string, token?: string | null): Promise<T> =>
  apiRequest<T>('GET', endpoint, null, token);

export interface SafeResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

export const safeGet = async <T = unknown>(endpoint: string, token?: string | null): Promise<SafeResult<T>> => {
  try {
    const result = await apiRequest<T>('GET', endpoint, null, token);
    return { ok: true, status: 200, data: result, error: null };
  } catch (error) {
    const message = (error as ApiError)?.message || (error as Error)?.message || 'Failed to load data';
    const status = typeof (error as ApiError)?.status === 'number' ? (error as ApiError).status : 0;
    return { ok: false, status, data: null, error: message };
  }
};

export const apiPost = <T = unknown>(endpoint: string, data: unknown, token?: string | null): Promise<T> =>
  apiRequest<T>('POST', endpoint, data, token);
export const apiPut = <T = unknown>(endpoint: string, data: unknown, token?: string | null): Promise<T> =>
  apiRequest<T>('PUT', endpoint, data, token);
export const apiDelete = <T = unknown>(endpoint: string, token?: string | null): Promise<T> =>
  apiRequest<T>('DELETE', endpoint, null, token);
export const apiPatch = <T = unknown>(endpoint: string, data: unknown, token?: string | null): Promise<T> =>
  apiRequest<T>('PATCH', endpoint, data, token);

// ─── Client portal (separate token, no refresh — magic-link sessions) ─────
const clientPortalRequest = async <T = unknown>(method: string, endpoint: string, data: unknown = null): Promise<T> => {
  try {
    return await apiRequest<T>(method, endpoint, data, getClientAccessToken());
  } catch (error) {
    if ((error as ApiError)?.status === 401) redirectToLogin();
    throw error;
  }
};

export const clientApiGet = <T = unknown>(endpoint: string): Promise<T> => clientPortalRequest<T>('GET', endpoint);
export const clientApiPost = <T = unknown>(endpoint: string, data: unknown): Promise<T> => clientPortalRequest<T>('POST', endpoint, data);
export const clientApiPatch = <T = unknown>(endpoint: string, data: unknown): Promise<T> => clientPortalRequest<T>('PATCH', endpoint, data);

/**
 * Rehydrate the admin session after a full page reload. Route guards call this;
 * it silently refreshes if a refresh cookie exists. Returns true when an access
 * token is available.
 */
export const ensureSession = async (): Promise<boolean> => {
  if (adminAccessToken) return true;
  if (clientAccessToken) return true;
  try {
    await tryRefresh();
    return !!adminAccessToken;
  } catch {
    return false;
  }
};

export const apiUpload = async <T = unknown>(
  endpoint: string,
  file: File,
  token?: string | null,
  metadata: Record<string, unknown> = {}
): Promise<T> => {
  const url = buildApiUrl(endpoint);
  const formData = new FormData();
  Object.entries(metadata).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, String(value));
  });
  formData.append('file', file);
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Upload failed');
  return (await res.json()) as T;
};

export const logActivity = async (payload: {
  event: string;
  userType?: string;
  userId?: string;
  details?: Record<string, unknown>;
}): Promise<unknown> => {
  return apiPost('/logs/activity', payload);
};

export type { ApiResponse as ApiResponseType } from '@angisoft/types';

export default apiRequest;