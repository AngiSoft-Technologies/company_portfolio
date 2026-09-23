import { getFingerprint } from './fingerprint';
import { toast } from '../utils/toast';

/**
 * Single source of truth for session/auth state on the frontend.
 *
 * Security model (Option A now, Option B later):
 *  - Access tokens live ONLY in memory (module scope). They are never written
 *    to localStorage/sessionStorage/indexedDB, so an XSS payload cannot
 *    exfiltrate a long-lived credential.
 *  - The refresh token is an httpOnly + SameSite=strict cookie set by the
 *    backend. It is invisible to JS and sent automatically by the browser on
 *    /api/auth/refresh (credentials: 'include').
 *  - On a 401 the client silently refreshes once, retries the original request,
 *    and only redirects to login if refresh fails.
 *  - On full page reload the in-memory token is gone; components call
 *    ensureSession() (or the route guards do) to rehydrate via /auth/refresh.
 *
 * Option B readiness: same-site rules treat *.angisoft.co.ke subdomains as one
 * site, so the SameSite=strict refresh cookie keeps working for admin/client/
 * public on different subdomains. Only a move to a totally different registrable
 * domain would require SameSite=None; Secure (not in scope).
 */

// ─── In-memory token store ────────────────────────────────────────────────
let adminAccessToken = null;
let clientAccessToken = null;
let refreshPromise = null; // in-flight /auth/refresh (dedupe concurrent 401s)

export const setAccessToken = (t) => { adminAccessToken = t || null; };
export const getAccessToken = () => adminAccessToken;
export const setClientAccessToken = (t) => { clientAccessToken = t || null; };
export const getClientAccessToken = () => clientAccessToken;

const clearSession = () => {
  adminAccessToken = null;
  clientAccessToken = null;
  refreshPromise = null;
};

// ─── CSRF double-submit helper (same-origin only) ─────────────────────────
const readCookie = (name) => {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
};

const normalizeOrigin = (origin) => {
  if (!origin) return origin;
  return origin.replace(/\/+$/, '').replace(/\/api$/, '');
};

const API_ORIGIN = normalizeOrigin(import.meta.env.VITE_API_BASE_URL) || (import.meta.env.PROD
  ? "https://api.angisoft.co.ke"
  : "");

const buildApiUrl = (endpoint) => {
  if (endpoint.startsWith('http')) return endpoint;
  const normalized = endpoint.startsWith('/api')
    ? endpoint
    : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  return API_ORIGIN ? `${API_ORIGIN}${normalized}` : normalized;
};

let notificationHandler = null;

export const setNotificationHandler = (handler) => {
  notificationHandler = handler;
};

// Attempt a silent refresh via the httpOnly refresh cookie. Deduplicated so a
// burst of 401s triggers exactly one refresh call.
const tryRefresh = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const url = buildApiUrl('/auth/refresh');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // send the httpOnly refresh cookie
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('refresh failed');
      const data = await res.json();
      if (!data.accessToken) throw new Error('no token in refresh response');
      adminAccessToken = data.accessToken;
      return data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

const redirectToLogin = () => {
  clearSession();
  const p = window.location.pathname;
  if (p.startsWith('/admin')) {
    toast.error('Session expired. Please login again.');
    setTimeout(() => { window.location.href = '/admin/login'; }, 1000);
  } else if (p.startsWith('/portal')) {
    toast.error('Session expired. Please request a new portal link.');
    setTimeout(() => { window.location.href = '/portal/request'; }, 800);
  }
};

// Resolve the bearer token for a request. Explicit token wins; otherwise use
// the in-memory admin or client-portal token (never localStorage).
const resolveToken = (token) => token || adminAccessToken || clientAccessToken;

const doFetch = async (method, url, headers, body, token) => {
  const options = { method, headers, credentials: 'include' };
  if (body !== undefined && body !== null) options.body = body;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Double-submit CSRF header for state-changing requests (same-origin only;
  // ignored cross-origin where SameSite=strict on the cookie is the defense).
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    const csrf = readCookie('csrfToken');
    if (csrf) headers['x-csrf-token'] = csrf;
  }

  return fetch(url, options);
};

const handleError = (message) => {
  console.error('API Error:', message);
  toast.error(message);
  if (notificationHandler) notificationHandler(message, 'error');
};

export const apiRequest = async (method, endpoint, data = null, token = null) => {
  const url = buildApiUrl(endpoint);
  const headers = { 'Content-Type': 'application/json' };
  let body = data !== null && data !== undefined ? JSON.stringify(data) : null;

  // First attempt (with silent-refresh retry on 401).
  try {
    let response = await doFetch(method, url, headers, body, resolveToken(token));
    if (response.status === 401 && adminAccessToken) {
      // Token may be expired; try one silent refresh then retry once.
      try {
        await tryRefresh();
        response = await doFetch(method, url, headers, body, resolveToken(token));
      } catch {
        redirectToLogin();
        throw new Error('Session expired');
      }
    }

    let result;
    try {
      result = await response.json();
    } catch {
      result = {};
    }

    if (!response.ok) {
      const errorMessage = result.error || result.message || 'API Error';
      if (response.status === 401) redirectToLogin();
      handleError(errorMessage);
      const err = new Error(errorMessage);
      err.status = response.status;
      throw err;
    }
    return result;
  } catch (error) {
    if (error.status) throw error; // already handled
    handleError(error.message || 'Network error. Please check your connection.');
    throw error;
  }
};

export const apiGet = (endpoint, token = null) => apiRequest('GET', endpoint, null, token);

// Non-throwing GET: returns { ok, status, data, error } instead of throwing,
// so hooks can branch on res.ok without try/catch.
export const safeGet = async (endpoint, token = null) => {
  try {
    const result = await apiRequest('GET', endpoint, null, token);
    return { ok: true, status: 200, data: result, error: null };
  } catch (error) {
    const message = error?.message || 'Failed to load data';
    const status = typeof error?.status === 'number' ? error.status : 0;
    return { ok: false, status, data: null, error: message };
  }
};

export const apiPost = (endpoint, data, token = null) => apiRequest('POST', endpoint, data, token);
export const apiPut = (endpoint, data, token = null) => apiRequest('PUT', endpoint, data, token);
export const apiDelete = (endpoint, token = null) => apiRequest('DELETE', endpoint, null, token);
export const apiPatch = (endpoint, data, token = null) => apiRequest('PATCH', endpoint, data, token);

// ─── Client portal (separate token, no refresh — magic-link sessions) ─────
const clientPortalRequest = async (method, endpoint, data = null) => {
  try {
    return await apiRequest(method, endpoint, data, getClientAccessToken());
  } catch (error) {
    if (error?.status === 401) redirectToLogin();
    throw error;
  }
};

export const clientApiGet = (endpoint) => clientPortalRequest('GET', endpoint);
export const clientApiPost = (endpoint, data) => clientPortalRequest('POST', endpoint, data);
export const clientApiPatch = (endpoint, data) => clientPortalRequest('PATCH', endpoint, data);

/**
 * Rehydrate the admin session after a full page reload. Route guards call this;
 * it silently refreshes if a refresh cookie exists. Returns true when an access
 * token is available.
 */
export const ensureSession = async () => {
  if (adminAccessToken) return true;
  if (clientAccessToken) return true;
  try {
    await tryRefresh();
    return !!adminAccessToken;
  } catch {
    return false;
  }
};

/**
 * Upload a file to the backend. The endpoint should be like '/upload/image',
 * '/upload/icon', '/upload/document'. The '/api' prefix is added automatically.
 */
export const apiUpload = async (endpoint, file, token = null, metadata = {}) => {
  const url = buildApiUrl(endpoint);
  const formData = new FormData();
  Object.entries(metadata).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });
  formData.append('file', file);
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Upload failed');
  return await res.json();
};

export const logActivity = async ({ event, userType, userId, details }) => {
  const fingerprint = await getFingerprint();
  return apiPost('/logs/activity', { event, userType, userId, details, fingerprint });
};
