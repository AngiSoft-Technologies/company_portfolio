// Application constants
export const APP_NAME = 'AngiSoft Technologies';
export const APP_TAGLINE = 'Innovative Software Solutions';

// API Configuration
const normalizeOrigin = (origin) => {
    if (!origin) return origin;
    return origin.replace(/\/+$/, '').replace(/\/api$/, '');
};

const API_ORIGIN = normalizeOrigin(import.meta.env.VITE_API_BASE_URL) || (import.meta.env.PROD
    ? 'https://api.angisoft.co.ke'
    : 'http://localhost:5000');
export const API_BASE_URL = `${API_ORIGIN.replace(/\/+$/, '')}/api`;

// File Upload Limits
export const FILE_LIMITS = {
    AVATAR: { maxSize: 2 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp'] },
    CV: { maxSize: 10 * 1024 * 1024, types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
    IMAGE: { maxSize: 5 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] },
    DOCUMENT: { maxSize: 10 * 1024 * 1024, types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'] },
    GENERAL: { maxSize: 10 * 1024 * 1024, types: ['*/*'] }
};

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// Booking Status Colors
export const BOOKING_STATUS_COLORS = {
    SUBMITTED: 'bg-yellow-500',
    UNDER_REVIEW: 'bg-blue-500',
    ACCEPTED: 'bg-green-500',
    REJECTED: 'bg-red-500',
    TERMS_ACCEPTED: 'bg-purple-500',
    DEPOSIT_PAID: 'bg-green-600',
    IN_PROGRESS: 'bg-indigo-500',
    DELIVERED: 'bg-teal-500',
    COMPLETED: 'bg-green-700',
    CANCELLED: 'bg-gray-500'
};

// Brand Colors
export const BRAND_COLORS = {
    primary: '#14B8A6', // Teal
    secondary: '#0D9488',
    accent: '#FFB6A3', // Peach
    dark: '#0F172A',
    light: '#F8FAFC'
};

