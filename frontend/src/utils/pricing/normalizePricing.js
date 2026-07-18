// Normalizes the Pricing page data sources into a flat, UI-ready shape.
//
// Two real backend sources feed the page:
//   1. /api/site/pricing  -> a `Setting` (site_pricing) with rich editorial
//      content: badge, title, subtitle, intro, pricingFactors[], estimatedRanges[],
//      engagementModels[], process[], faq[], cta.
//   2. /api/services      -> normalized Service records (each with priceFrom,
//      currency, scope, features[], pricingType, pricingFactors[], etc.).
//
// Nothing is invented here. Every field rendered by the UI comes from one of
// these two sources. When a field is absent the corresponding section simply
// renders nothing.

import { formatKsh, formatFrom } from './pricingFormatters';

/** Collect the first non-empty array from candidate fields. */
function asArray(...candidates) {
    for (const c of candidates) {
        if (Array.isArray(c) && c.length) return c;
        if (Array.isArray(c)) return [];
    }
    return [];
}

/** Normalize one estimated-range entry from the site_pricing setting. */
function normalizeRange(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const startingFrom = raw.startingFrom ?? raw.priceFrom ?? raw.from ?? null;
    const label = formatKsh(startingFrom);
    return {
        category: raw.category || raw.title || '',
        startingFrom: typeof startingFrom === 'number' ? startingFrom : null,
        startingLabel: label,
        currency: raw.currency || 'KES',
        description: raw.description || '',
        includes: asArray(raw.includes, raw.features, raw.whatYouGet).map((x) =>
            typeof x === 'string' ? x : x?.label || x?.title || ''
        ),
    };
}

/** Normalize the site_pricing setting into UI sections (or null if absent). */
export function normalizeSitePricing(raw) {
    if (!raw || typeof raw !== 'object') return null;
    return {
        badge: raw.badge || '',
        title: raw.title || '',
        subtitle: raw.subtitle || '',
        intro: raw.intro && (raw.intro.title || raw.intro.description)
            ? { title: raw.intro.title || '', description: raw.intro.description || '' }
            : null,
        pricingFactors: asArray(raw.pricingFactors).map((f) => ({
            title: f?.title || '',
            description: f?.description || '',
            examples: asArray(f?.examples).map((x) => (typeof x === 'string' ? x : x?.label || x?.title || '')),
        })),
        estimatedRanges: asArray(raw.estimatedRanges).map(normalizeRange).filter(Boolean),
        engagementModels: asArray(raw.engagementModels).map((m) => ({
            title: m?.title || '',
            description: m?.description || '',
        })),
        process: asArray(raw.process).map((p) => ({
            step: p?.step ?? p?.number ?? '',
            title: p?.title || '',
            description: p?.description || '',
        })),
        faq: asArray(raw.faq).map((f) => ({
            question: f?.question || f?.q || '',
            answer: f?.answer || f?.a || '',
        })).filter((f) => f.question && f.answer),
        cta: raw.cta && (raw.cta.title || raw.cta.primaryButton || raw.cta.secondaryButton)
            ? {
                  title: raw.cta.title || '',
                  subtitle: raw.cta.subtitle || '',
                  primaryButton: raw.cta.primaryButton
                      ? { url: raw.cta.primaryButton.url || '/booking', label: raw.cta.primaryButton.label || 'Request a quote' }
                      : null,
                  secondaryButton: raw.cta.secondaryButton
                      ? { url: raw.cta.secondaryButton.url || '/services', label: raw.cta.secondaryButton.label || 'Explore services' }
                      : null,
              }
            : null,
        note: raw.note || '',
    };
}

/**
 * Augment a normalized service with the price label used on the pricing grid.
 * `baseService` is a normalized Service (see normalizeService).
 * @param {object} baseService
 * @returns {object}
 */
export function withPricing(service) {
    if (!service) return null;
    const priceLabel = formatFrom(service.priceFrom, service.currency);
    return {
        ...service,
        priceLabel,
        hasPrice: Boolean(priceLabel),
        priceFromLabel: formatKsh(service.priceFrom),
    };
}

/**
 * Build the complete Pricing view model.
 * @param {{ sitePricing?: object|null, services?: object[] }} input
 * @returns {{
 *   content: object|null,
 *   services: object[],
 *   pricedServices: object[],
 *   unpricedServices: object[],
 *   loadingRanges: boolean,
 *   hasServiceData: boolean
 * }}
 */
export function buildPricingModel({ sitePricing, services = [] } = {}) {
    const content = normalizeSitePricing(sitePricing);
    const priced = services.map(withPricing);

    return {
        content,
        services: priced,
        pricedServices: priced.filter((s) => s.hasPrice),
        unpricedServices: priced.filter((s) => !s.hasPrice),
        hasContent: Boolean(content),
        hasServiceData: Boolean(services.length),
    };
}

export default buildPricingModel;
