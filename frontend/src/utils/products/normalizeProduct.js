// Normalize a raw API Product record into a UI-ready shape.
//
// The backend returns Prisma Product objects with `features: Json, pricing: Json,
// faqs, screenshots, status (ProductStatus enum), demoUrl, category (a slug string)`,
// etc. This helper collapses that into the flat structure every Product UI
// component consumes, so UI code never reaches into Prisma specifics.
//
// No values are invented: optional rich fields are mapped when present and the
// UI renders them only when valid data exists.
import { resolveAssetUrl } from '../constants';
import { formatCurrency } from '../format';

// Product status enum -> friendly label + colour token.
const STATUS_META = {
    PLANNED: { label: 'Planned', className: 'status--planned' },
    DEVELOPMENT: { label: 'In Development', className: 'status--dev' },
    BETA: { label: 'Beta', className: 'status--beta' },
    LIVE: { label: 'Live', className: 'status--live' },
    MAINTENANCE: { label: 'Maintenance', className: 'status--maint' },
    DEPRECATED: { label: 'Deprecated', className: 'status--deprecated' },
};

export const getProductStatusMeta = (status) => STATUS_META[status] || STATUS_META.PLANNED;

function asArray(...candidates) {
    for (const c of candidates) {
        if (Array.isArray(c) && c.length) {
            return c
                .map((x) => (typeof x === 'string' ? x : x?.label || x?.title || x?.text || x))
                .filter(Boolean);
        }
        if (Array.isArray(c)) return [];
    }
    return [];
}

function asFaqs(...candidates) {
    for (const c of candidates) {
        if (!Array.isArray(c) || !c.length) continue;
        const items = c
            .map((f) => ({
                question: f?.question || f?.q || f?.title || f?.label || '',
                answer: f?.answer || f?.a || f?.response || f?.description || '',
            }))
            .filter((f) => f.question && f.answer);
        if (items.length) return items;
    }
    return [];
}

function truncate(text, max) {
    if (!text || text.length <= max) return text || '';
    return `${text.slice(0, max).trim()}…`;
}

/**
 * @param {object} raw - raw Product record from /api/products or /api/products/:slug
 * @returns {object|null} normalized product
 */
export function normalizeProduct(raw = {}) {
    if (!raw || typeof raw !== 'object') return null;

    const logoUrl = resolveAssetUrl(raw.logoUrl || null);
    const bannerUrl = resolveAssetUrl(raw.bannerUrl || null);
    const screenshots = Array.isArray(raw.screenshots)
        ? raw.screenshots.map((s) => (typeof s === 'string' ? resolveAssetUrl(s) : s)).filter(Boolean)
        : [];

    // Pricing may be a number, {amount,currency,label}, or {type,from,to}.
    let pricingLabel = '';
    let priceFrom = null;
    let currency = 'KES';
    const rawPricing = raw.pricing;
    if (typeof rawPricing === 'number') {
        priceFrom = rawPricing;
        pricingLabel = formatCurrency(rawPricing, currency);
    } else if (rawPricing && typeof rawPricing === 'object') {
        priceFrom = typeof rawPricing.amount === 'number' ? rawPricing.amount : (typeof rawPricing.from === 'number' ? rawPricing.from : null);
        currency = rawPricing.currency || 'KES';
        if (rawPricing.label) {
            pricingLabel = rawPricing.label;
        } else if (priceFrom != null) {
            pricingLabel = `From ${formatCurrency(priceFrom, currency)}`;
        } else if (rawPricing.type) {
            pricingLabel = String(rawPricing.type).replace(/_/g, ' ');
        }
    }

    const features = asArray(raw.features, raw.capabilities, raw.highlights);
    const faqs = asFaqs(raw.faqs);
    const screenshotsResolved = screenshots;

    const status = raw.status && STATUS_META[raw.status] ? raw.status : (raw.status || 'PLANNED');
    const statusMeta = getProductStatusMeta(status);

    const categorySlug = typeof raw.category === 'string' ? raw.category : (raw.categoryRef?.slug || '');
    const categoryLabel = typeof raw.category === 'string'
        ? raw.category.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : (raw.categoryRef?.name || 'General');

    const demoUrl = raw.demoUrl || raw.demo || '';

    return {
        id: raw.id,
        slug: raw.slug,
        name: raw.name || 'Untitled Product',
        tagline: raw.tagline || '',
        description: raw.description || '',
        shortDescription: raw.shortDescription || truncate(raw.description, 180),
        categorySlug,
        categoryLabel,
        logoUrl,
        bannerUrl,
        screenshots: screenshotsResolved,
        features,
        faqs,
        status,
        statusLabel: statusMeta.label,
        statusClassName: statusMeta.className,
        pricing: rawPricing || null,
        pricingLabel,
        priceFrom,
        currency,
        demoUrl,
        relatedServiceIds: asArray(raw.relatedServiceIds, raw.relatedServices),
        relatedProductSlugs: asArray(raw.relatedProductSlugs, raw.relatedProducts),
        seoTitle: raw.seoTitle || '',
        seoDesc: raw.seoDesc || '',
        published: raw.published !== false,
        sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : 0,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
    };
}
