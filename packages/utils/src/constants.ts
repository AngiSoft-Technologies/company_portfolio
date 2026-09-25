// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- ambient import.meta.env typing for downstream packages
/// <reference path="./vite-env.d.ts" />

export const APP_NAME = 'AngiSoft Technologies';
export const APP_MOTTO = 'Innovate • Build • Empower';
export const APP_TAGLINE = 'Innovative Software Solutions';

const normalizeOrigin = (origin?: string): string => {
  if (!origin) return origin as string;
  return origin.replace(/\/+$/, '').replace(/\/api$/, '');
};

const API_ORIGIN =
  normalizeOrigin(import.meta.env.VITE_API_BASE_URL as string) ||
  (import.meta.env.PROD ? 'https://api.angisoft.co.ke' : '');
export const API_BASE_URL = API_ORIGIN ? `${API_ORIGIN.replace(/\/+$/, '')}/api` : '/api';
export const ASSET_BASE_URL = normalizeOrigin(import.meta.env.VITE_ASSET_BASE_URL as string) || API_ORIGIN;

const normalizeAssetPath = (p: string): string => {
  if (p.startsWith('/images/')) return `/uploads/public${p}`;
  if (p.startsWith('/uploads/images/')) return p.replace('/uploads/images/', '/uploads/public/images/');
  return p;
};

export const resolveAssetUrl = (value?: string | null): string | null | undefined => {
  if (!value || typeof value !== 'string') return value;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  const normalized = normalizeAssetPath(value);
  if (normalized.startsWith('/uploads/')) {
    return ASSET_BASE_URL ? `${ASSET_BASE_URL}${normalized}` : normalized;
  }
  if (normalized.startsWith('/api/uploads/')) {
    return API_ORIGIN ? `${API_ORIGIN}${normalized}` : normalized;
  }
  return normalized;
};

export const FILE_LIMITS = {
  AVATAR: { maxSize: 2 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp'] },
  CV: { maxSize: 10 * 1024 * 1024, types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
  IMAGE: { maxSize: 5 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] },
  DOCUMENT: { maxSize: 10 * 1024 * 1024, types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'] },
  GENERAL: { maxSize: 10 * 1024 * 1024, types: ['*/*'] },
} as const;

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-yellow-500',
  UNDER_REVIEW: 'bg-blue-500',
  ACCEPTED: 'bg-green-500',
  REJECTED: 'bg-red-500',
  TERMS_ACCEPTED: 'bg-purple-500',
  DEPOSIT_PAID: 'bg-green-600',
  IN_PROGRESS: 'bg-indigo-500',
  DELIVERED: 'bg-teal-500',
  COMPLETED: 'bg-green-700',
  CANCELLED: 'bg-gray-500',
};

export const BRAND_COLORS = {
  primary: '#0875FF',
  primaryLight: '#3B9AFF',
  primaryDark: '#003BCE',
  secondary: '#00AFFF',
  secondaryLight: '#18D8FF',
  secondaryDark: '#0088CC',
  accent: '#18D8FF',
  success: '#27D94B',
  successDark: '#1EB83D',
  warning: '#F59E0B',
  error: '#EF4444',
  navy: '#07142B',
  navyLight: '#0B1E3D',
  offWhite: '#F5F7FA',
  text: '#07142B',
  textSecondary: '#334155',
} as const;