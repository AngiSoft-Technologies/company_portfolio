import { getFingerprint } from './fingerprint';
import { toast } from '../utils/toast';

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

export const apiRequest = async (method, endpoint, data = null, token = null) => {
  try {
    // Prepend API origin if endpoint does not start with http
    const url = buildApiUrl(endpoint);
    const headers = { 'Content-Type': 'application/json' };
    
    // Add auth token if provided
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      // Try to get token from localStorage
      const storedToken = localStorage.getItem('adminToken');
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }
    }
    
    const options = {
      method,
      headers,
    };
    if (data) options.body = JSON.stringify(data);

    const response = await fetch(url, options);
    let result;
    try {
      result = await response.json();
    } catch {
      result = {};
    }

    if (!response.ok) {
      // Handle 401 unauthorized - clear token and redirect
      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        toast.error('Session expired. Please login again.');
        if (window.location.pathname.startsWith('/admin')) {
          setTimeout(() => {
            window.location.href = '/admin/login';
          }, 1500);
        }
      }
      // Centralized error handling
      const errorMessage = result.error || result.message || 'API Error';
      toast.error(errorMessage);
      if (notificationHandler) notificationHandler(errorMessage, 'error');
      throw new Error(errorMessage);
    }
    return result;
  } catch (error) {
    // Centralized logging
    console.error('API Error:', error);
    const errorMessage = error.message || 'Network error. Please check your connection.';
    toast.error(errorMessage);
    if (notificationHandler) notificationHandler(errorMessage, 'error');
    throw error;
  }
};

export const apiGet = (endpoint, token = null) => apiRequest('GET', endpoint, null, token);

// Non-throwing GET: returns { ok, status, data, error } instead of throwing,
// so hooks can branch on res.ok without try/catch. Used by data-driven
// public list/detail hooks (blog, etc.) that render dedicated error states.
export const safeGet = async (endpoint, token = null) => {
  try {
    const result = await apiRequest('GET', endpoint, null, token);
    return { ok: true, status: 200, data: result, error: null };
  } catch (error) {
    const message = error?.message || 'Failed to load data';
    // apiRequest throws a plain Error without .status; surface it if present.
    const status = typeof error?.status === 'number' ? error.status : 0;
    return { ok: false, status, data: null, error: message };
  }
};

export const apiPost = (endpoint, data, token = null) => apiRequest('POST', endpoint, data, token);
export const apiPut = (endpoint, data, token = null) => apiRequest('PUT', endpoint, data, token);
export const apiDelete = (endpoint, token = null) => apiRequest('DELETE', endpoint, null, token);
export const apiPatch = (endpoint, data, token = null) => apiRequest('PATCH', endpoint, data, token);

const getClientPortalToken = () => localStorage.getItem('clientPortalToken');

const clientPortalRequest = async (method, endpoint, data = null) => {
  try {
    return await apiRequest(method, endpoint, data, getClientPortalToken());
  } catch (error) {
    if (window.location.pathname.startsWith('/portal')) {
      localStorage.removeItem('clientPortalToken');
      if (!window.location.pathname.startsWith('/portal/request')) {
        setTimeout(() => {
          window.location.href = '/portal/request';
        }, 800);
      }
    }
    throw error;
  }
};

export const clientApiGet = (endpoint) => clientPortalRequest('GET', endpoint);
export const clientApiPost = (endpoint, data) => clientPortalRequest('POST', endpoint, data);
export const clientApiPatch = (endpoint, data) => clientPortalRequest('PATCH', endpoint, data);

/**
 * Upload a file to the backend. The endpoint should be like '/upload/image', '/upload/icon', '/upload/document'.
 * The '/api' prefix will be added automatically.
 * @param {string} endpoint - The upload endpoint (e.g. '/upload/image')
 * @param {File} file - The file to upload
 * @param {string|null} token - Optional auth token
 * @returns {Promise<object>} - The backend response (should include a 'url' field)
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
  });
  if (!res.ok) throw new Error('Upload failed');
  return await res.json();
};

export const logActivity = async ({ event, userType, userId, details }) => {
  const fingerprint = await getFingerprint();
  return apiPost('/logs/activity', { event, userType, userId, details, fingerprint });
};