import { resolveIcon as resolveByName } from '../../utils/iconRegistry';
import { resolveAssetUrl } from '../../utils/constants';

// Industry cards key off a slug derived from `name` (the API does not return
// a slug). We derive it client-side so the index grid and detail route stay
// in sync. Must match the slugs used in Footer/Header (e.g. "Healthcare" →
// "healthcare", "Retail & eCommerce" → "retail-ecommerce").
export function getIndustrySlug(value = '') {
    return String(value)
        .toLowerCase()
        .trim()
        .replace(/&/g, ' ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `industry-${Math.random().toString(36).slice(2, 8)}`;
}

export function resolveIcon(iconName, fallback = 'FaBriefcase') {
    return resolveByName(iconName) || resolveByName(fallback);
}

export function getIndustryRoute(slugOrIndustry) {
    const slug = typeof slugOrIndustry === 'string'
        ? slugOrIndustry
        : getIndustrySlug(slugOrIndustry?.name || slugOrIndustry?.slug);
    if (!slug) return '/industries';
    return `/industries/${encodeURIComponent(slug)}`;
}

const DEFAULT_BG = '/uploads/public/images/services/it-consulting.jpg';

// Normalize one raw industry record from /api/site/industries.
export function normalizeIndustry(raw, index = 0) {
    if (!raw || typeof raw !== 'object') return null;

    const name = raw.name || `Industry ${index + 1}`;
    const slug = raw.slug ? getIndustrySlug(raw.slug) : getIndustrySlug(name);

    const services = (raw.services || raw.capabilities || [])
        .filter(Boolean)
        .map((svc, i) => {
            const s = typeof svc === 'string' ? { name: svc } : svc;
            return {
                id: s.id || `${slug}-svc-${i}`,
                name: s.name || s.title || '',
                icon: resolveIcon(s.icon),
            };
        })
        .filter((s) => s.name);

    return {
        id: raw.id || slug,
        slug,
        name,
        icon: resolveIcon(raw.icon),
        bgImage: resolveAssetUrl(raw.bgImage || raw.imageUrl || DEFAULT_BG),
        description: raw.description || raw.desc || '',
        services,
    };
}

// Normalize the whole payload (array OR { industries: [...] } shape).
export function normalizeIndustries(data) {
    const list = Array.isArray(data)
        ? data
        : (data && Array.isArray(data.industries) ? data.industries : []);
    return list.map(normalizeIndustry).filter(Boolean);
}
