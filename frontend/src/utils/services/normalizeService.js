// Normalize a raw API Service record into a UI-ready shape.
//
// The backend returns Prisma Service objects with `images: string[]`,
// `categoryRef: ServiceCategory | null`, `priceFrom`, `currency`, etc.
// This helper collapses that into the flat structure every Services UI
// component consumes, so UI code never reaches into Prisma specifics.
import { resolveAssetUrl } from '../constants';
import { resolveIcon } from '../iconRegistry';

// --- small normalizers for optional rich fields -------------------------

/** Collect the first non-empty array from a set of candidate fields. */
function asArray(...candidates) {
    for (const c of candidates) {
        if (Array.isArray(c) && c.length) return c.map((x) => (typeof x === 'string' ? x : x?.label || x?.title || x)).filter(Boolean);
        if (Array.isArray(c)) return [];
    }
    return [];
}

/** Normalize FAQ input into [{ question, answer }] items. */
function asFaqs(...candidates) {
    for (const c of candidates) {
        if (!Array.isArray(c) || !c.length) continue;
        const items = c
            .map((f) => ({
                question: f?.question || f?.q || f?.title || '',
                answer: f?.answer || f?.a || f?.response || '',
            }))
            .filter((f) => f.question && f.answer);
        if (items.length) return items;
    }
    return [];
}

/** Tags may be string[] or [{ name }] / [{ label }] / { name: ... }. */
function asTags(raw) {
    if (Array.isArray(raw)) return raw.map((t) => (typeof t === 'string' ? t : t?.name || t?.label || '')).filter(Boolean);
    if (raw && typeof raw === 'object') return Object.values(raw).filter((v) => typeof v === 'string');
    return [];
}

function truncate(text, max) {
    if (!text || text.length <= max) return text || '';
    return `${text.slice(0, max).trim()}…`;
}

/**
 * @param {object} raw - raw Service record from /api/services or /api/services/:slug
 * @returns {object} normalized service
 */
export function normalizeService(raw = {}) {
    if (!raw || typeof raw !== 'object') return null;

    const images = Array.isArray(raw.images) ? raw.images : [];
    const resolvedImages = images.map((img) => resolveAssetUrl(img));

    const categoryRef = raw.categoryRef || null;
    const category = categoryRef
        ? {
              id: categoryRef.id,
              name: categoryRef.name,
              slug: categoryRef.slug,
              description: categoryRef.description,
              icon: resolveIcon(categoryRef.icon),
              iconName: categoryRef.icon || 'FaGlobe',
              order: categoryRef.order,
          }
        : {
              id: raw.categoryId || null,
              name: raw.category || 'General',
              slug: raw.categoryId ? String(raw.categoryId) : 'general',
              description: '',
              icon: resolveIcon('FaGlobe'),
              iconName: 'FaGlobe',
              order: 0,
          };

    const priceFrom = typeof raw.priceFrom === 'number' ? raw.priceFrom : null;
    const currency = raw.currency || 'KES';
    const priceLabel = formatPrice(priceFrom, currency);
    const scope = raw.scope || '';
    const targetAudience = raw.targetAudience || '';
    const features = Array.isArray(raw.features) ? raw.features : [];

    // Rich, detail-page fields. The backend may not populate every one of
    // these yet — we map them when present (forward-compatible) and let the
    // UI render them only when valid data exists. No values are invented here.
    const shortDescription = raw.shortDescription || '';
    const deliverables = asArray(raw.deliverables, raw.outputs, raw.whatYouGet);
    const outcomes = asArray(raw.outcomes, raw.benefits, raw.expectedResults, raw.goals);
    const process = asArray(raw.process, raw.steps, raw.workflow, raw.deliveryProcess);
    const faqs = asFaqs(raw.faqs, raw.questions, raw.serviceFaqs);
    const tags = asTags(raw.tags);
    const relatedServiceIds = asArray(raw.relatedServiceIds, raw.relatedServices);
    const pricingFactors = asArray(raw.pricingFactors);
    const pricingNote = raw.pricingNote || '';
    const pricingType = raw.pricingType || (priceFrom != null ? 'starting_from' : 'custom_quote');
    // Timeline: prefer a dedicated field, otherwise derive a safe note from
    // `scope` (which the backend currently uses for duration/scope text).
    const timeline = raw.timeline || raw.estimatedDuration || raw.deliveryTime || raw.turnaround || '';
    const deliveryType = raw.deliveryType || '';
    const supportModel = raw.supportModel || '';

    return {
        id: raw.id,
        slug: raw.slug,
        title: raw.title || 'Untitled Service',
        description: raw.description || '',
        shortDescription: shortDescription || truncate(raw.description, 160),
        category,
        categoryName: category.name,
        categorySlug: category.slug,
        priceFrom,
        currency,
        priceLabel,
        pricingType,
        pricingNote,
        pricingFactors,
        targetAudience,
        scope,
        timeline,
        deliveryType,
        supportModel,
        features,
        deliverables,
        outcomes,
        process,
        faqs,
        tags,
        relatedServiceIds,
        images: resolvedImages,
        image: resolvedImages[0] || null,
        seoTitle: raw.seoTitle || '',
        seoDesc: raw.seoDesc || '',
        published: raw.published !== false,
        featured: Boolean(raw.featured),
        author: raw.author || null,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
    };
}

/**
 * Format a numeric price with the active currency. Returns null when no price.
 * @param {number|null} amount
 * @param {string} currency
 * @returns {string|null}
 */
export function formatPrice(amount, currency = 'KES') {
    if (amount == null || Number.isNaN(amount)) return null;
    try {
        const formatted = new Intl.NumberFormat('en-KE', {
            maximumFractionDigits: 0,
        }).format(amount);
        return `From KES ${formatted}`;
    } catch {
        return `From ${currency} ${amount}`;
    }
}

/**
 * Normalize an array of raw services, dropping any that fail to normalize.
 * @param {object[]} list
 * @returns {object[]}
 */
export function normalizeServices(list = []) {
    if (!Array.isArray(list)) return [];
    return list.map(normalizeService).filter(Boolean);
}
