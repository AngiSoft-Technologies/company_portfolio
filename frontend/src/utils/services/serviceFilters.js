// Pure filter + search helpers for the Services experience.
// Kept side-effect free so they are trivial to unit test.

/**
 * Filter services by category slug. 'all' (or empty) returns everything.
 * @param {object[]} services
 * @param {string} categorySlug
 * @returns {object[]}
 */
export function filterByCategory(services = [], categorySlug = 'all') {
    if (!categorySlug || categorySlug === 'all') return services;
    return services.filter((s) => s.categorySlug === categorySlug);
}

/**
 * Case-insensitive search across title, description, category, and features.
 * @param {object[]} services
 * @param {string} query
 * @returns {object[]}
 */
export function searchServices(services = [], query = '') {
    const q = (query || '').trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => {
        const haystack = [
            s.title,
            s.description,
            s.categoryName,
            s.scope,
            s.targetAudience,
            ...(s.features || []),
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        return haystack.includes(q);
    });
}

/**
 * Combined filter: category + search query.
 * @param {object[]} services
 * @param {object} opts - { categorySlug, query }
 * @returns {object[]}
 */
export function filterServices(services = [], opts = {}) {
    const { categorySlug = 'all', query = '' } = opts;
    return searchServices(filterByCategory(services, categorySlug), query);
}

/**
 * Derive unique categories (in display order) from a service list.
 * Always prepends an "All" pseudo-category.
 * @param {object[]} services
 * @returns {Array<{slug, name, count}>}
 */
export function deriveCategories(services = []) {
    const map = new Map();
    for (const s of services) {
        const slug = s.categorySlug || 'general';
        const name = s.categoryName || 'General';
        if (!map.has(slug)) map.set(slug, { slug, name, count: 0, order: s.category?.order ?? 999 });
        map.get(slug).count += 1;
    }
    const items = Array.from(map.values()).sort((a, b) => a.order - b.order);
    return [{ slug: 'all', name: 'All Services', count: services.length, order: -1 }, ...items];
}

/**
 * Split services into featured vs the rest.
 * @param {object[]} services
 * @returns {{ featured: object[], rest: object[] }}
 */
export function splitFeatured(services = []) {
    const featured = services.filter((s) => s.featured);
    const rest = services.filter((s) => !s.featured);
    return { featured, rest };
}
