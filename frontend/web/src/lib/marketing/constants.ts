// @ts-nocheck
const normalizeOrigin = (origin?: string) => {
  if (!origin) return '';
  return origin.replace(/\/+$/, '').replace(/\/api$/, '');
};

const API_ORIGIN = normalizeOrigin(import.meta.env.VITE_API_BASE_URL as string) ||
  (import.meta.env.PROD ? 'https://api.angisoft.co.ke' : '');
const CDN_ORIGIN = normalizeOrigin(import.meta.env.VITE_CDN_BASE_URL as string) ||
  (import.meta.env.PROD ? 'https://cdn.angisoft.co.ke' : API_ORIGIN);

export const API_BASE_URL = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';
export const ASSET_BASE_URL = CDN_ORIGIN;

const normalizeAssetPath = (value: string) => {
  if (value.startsWith('/images/')) return `/uploads/public${value}`;
  if (value.startsWith('/uploads/images/')) return value.replace('/uploads/images/', '/uploads/public/images/');
  return value;
};

export const resolveAssetUrl = (value: string): string => {
  if (!value) return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  const normalized = normalizeAssetPath(value);
  if (normalized.startsWith('/uploads/public/')) {
    return CDN_ORIGIN ? `${CDN_ORIGIN}/${normalized.replace(/^\/uploads\//, '')}` : normalized;
  }
  if (normalized.startsWith('/uploads/')) {
    return API_ORIGIN ? `${API_ORIGIN}${normalized}` : normalized;
  }
  if (normalized.startsWith('/api/uploads/')) {
    return API_ORIGIN ? `${API_ORIGIN}${normalized}` : normalized;
  }
  return normalized;
};

export const APP_NAME = 'AngiSoft Technologies';
export const APP_MOTTO = 'Innovate • Build • Empower';
export const APP_TAGLINE = 'Innovative Software Solutions';
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
/**
 * Re-exported from @angisoft/ui so there is exactly ONE brand palette.
 * This used to be a hand-copied duplicate of packages/ui/src/tokens, which had
 * already drifted (it was missing royalBlue/indigo/blueBright/cyanBright/abyss).
 */
export { colors as BRAND_COLORS, brandGradients } from '@angisoft/ui';
