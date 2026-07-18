// Application constants
export const APP_NAME = 'AngiSoft Technologies';
export const APP_MOTTO = 'Innovate • Build • Empower';
export const APP_TAGLINE = 'Innovative Software Solutions';

// API Configuration
const normalizeOrigin = (origin) => {
    if (!origin) return origin;
    return origin.replace(/\/+$/, '').replace(/\/api$/, '');
};

const API_ORIGIN = normalizeOrigin(import.meta.env.VITE_API_BASE_URL) || (import.meta.env.PROD
    ? 'https://api.angisoft.co.ke'
    : '');
export const API_BASE_URL = API_ORIGIN ? `${API_ORIGIN.replace(/\/+$/, '')}/api` : '/api';
export const ASSET_BASE_URL = normalizeOrigin(import.meta.env.VITE_ASSET_BASE_URL) || API_ORIGIN;

// Assets are served from `/uploads/public/...` (see backend express.static
// mount). Older DB rows / CMS entries sometimes store the same file under a
// legacy prefix (`/images/...` or `/uploads/images/...`) that has no static
// handler — the request then falls through to the SPA catch-all and returns
// index.html instead of the image. Normalize those known-bad prefixes to the
// path the server actually serves, so stored URLs don't need manual fixes.
const normalizeAssetPath = (p) => {
    if (p.startsWith('/images/')) return `/uploads/public${p}`;
    if (p.startsWith('/uploads/images/')) return p.replace('/uploads/images/', '/uploads/public/images/');
    return p;
};

export const resolveAssetUrl = (value) => {
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

// Product Ecosystem
export const PRODUCTS = [
  {
    name: 'PetroFlow',
    slug: 'petroflow',
    tagline: 'Fuel Station Automation Platform',
    description: 'Complete fuel station management with pump control, inventory tracking, analytics, and staff management.',
    icon: 'FaGasPump',
    gradient: 'linear-gradient(135deg, #0A3DFF 0%, #00C2FF 100%)',
    features: ['Fuel Management', 'Pump Control', 'Inventory Tracking', 'Analytics Dashboard', 'Staff Management'],
  },
  {
    name: 'DukaFlow',
    slug: 'dukaflow',
    tagline: 'POS & ERP Platform',
    description: 'All-in-one point-of-sale and ERP system for retail, wholesale, and restaurant businesses.',
    icon: 'FaStore',
    gradient: 'linear-gradient(135deg, #8A2BE2 0%, #00C2FF 100%)',
    features: ['Sales Management', 'Inventory', 'Customer CRM', 'Supplier Management', 'Multi-branch'],
  },
  {
    name: 'KejaLink',
    slug: 'kejalink',
    tagline: 'Property Discovery Platform',
    description: 'Modern property discovery platform connecting tenants with landlords through smart search and booking.',
    icon: 'FaHome',
    gradient: 'linear-gradient(135deg, #39FF6A 0%, #00C2FF 100%)',
    features: ['House Hunting', 'Property Listings', 'Landlord Management', 'Maps Integration', 'Booking'],
  },
  {
    name: 'AngiTunes',
    slug: 'angitunes',
    tagline: 'Music Streaming & Distribution',
    description: 'Music platform for streaming, artist promotion, uploads, and monetization.',
    icon: 'FaMusic',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #8A2BE2 100%)',
    features: ['Music Streaming', 'Artist Pages', 'Uploads', 'Monetization', 'Playlists'],
  },
];

// Brand Colors — AngiSoft Official Palette
export const BRAND_COLORS = {
    primary: '#0A3DFF',
    primaryLight: '#3B6FFF',
    primaryDark: '#0029CC',
    secondary: '#00C2FF',
    secondaryLight: '#5DD8FF',
    secondaryDark: '#0099CC',
    accent: '#8A2BE2',
    success: '#39FF6A',
    successDark: '#16C95B',
    warning: '#F59E0B',
    error: '#EF4444',
    navy: '#07142B',
    navyLight: '#0B1E3D',
    offWhite: '#F5F7FA',
    text: '#07142B',
    textSecondary: '#334155',
};

