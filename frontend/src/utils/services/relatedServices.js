// Select related services for a detail page using a priority cascade:
//   1. explicitly configured relatedServiceIds
//   2. same category
//   3. shared tags
//   4. shared target audience
//   5. featured services (fallback)
// Duplicates are removed and the current service is always excluded.

function sameSet(a = [], b = []) {
    const set = new Set(a.map((x) => String(x).toLowerCase()));
    return b.some((x) => set.has(String(x).toLowerCase()));
}

/**
 * @param {object} opts
 * @param {object} opts.service - the current (normalized) service
 * @param {object[]} opts.services - all (normalized) services
 * @param {number} [opts.limit=4]
 * @returns {object[]} ordered, de-duplicated related services
 */
export function getRelatedServices({ service, services = [], limit = 4 } = {}) {
    if (!service || !Array.isArray(services) || !services.length) return [];

    const currentSlug = service.slug;
    const pool = services.filter((s) => s.slug !== currentSlug && s.published !== false);

    const byId = new Map();
    const push = (s) => {
        if (s && s.slug !== currentSlug && !byId.has(s.slug)) byId.set(s.slug, s);
    };

    // 1. Configured related IDs (order preserved)
    const relatedIds = Array.isArray(service.relatedServiceIds) ? service.relatedServiceIds : [];
    for (const id of relatedIds) {
        const match = pool.find((s) => s.id === id || s.slug === id);
        if (match) push(match);
    }

    // 2. Same category
    for (const s of pool) {
        if (service.categorySlug && s.categorySlug === service.categorySlug) push(s);
    }

    // 3. Shared tags
    if (Array.isArray(service.tags) && service.tags.length) {
        for (const s of pool) {
            if (sameSet(service.tags, s.tags || [])) push(s);
        }
    }

    // 4. Shared audience keywords
    const currentAudience = (service.targetAudience || '').toLowerCase();
    if (currentAudience) {
        for (const s of pool) {
            const other = (s.targetAudience || '').toLowerCase();
            const overlap = ['business', 'individual', 'organisation', 'student', 'startup']
                .some((w) => currentAudience.includes(w) && other.includes(w));
            if (overlap) push(s);
        }
    }

    let results = [...byId.values()];

    // 5. Featured fallback (only if we still need more)
    if (results.length < limit) {
        for (const s of pool) {
            if (s.featured) push(s);
        }
        results = [...byId.values()];
    }

    return results.slice(0, limit);
}
