// Filtering + deep-linking for the Pricing page service grid.
//
// The page supports a query-param deep link: /pricing?service=<slug>
// - Selecting a service highlights it and scrolls/pins its card.
// - A category chip filter narrows the visible services (multi-select safe).
//
// All filtering is derived from real service data; nothing is invented.

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPricingRoute } from '../utils/pricing/pricingRoutes';

/**
 * @param {object[]} services normalized (priced) services
 */
export function usePricingFilters(services = []) {
    const [searchParams, setSearchParams] = useSearchParams();

    const deepLinkSlug = searchParams.get('service') || '';
    const activeCategories = useMemo(() => {
        const raw = searchParams.get('categories');
        return raw ? raw.split(',').filter(Boolean) : [];
    }, [searchParams]);

    // Derive the full set of categories present in the data (preserves order
    // of first appearance). Each entry: { name, slug, count }.
    const categories = useMemo(() => {
        const order = [];
        const map = new Map();
        for (const s of services) {
            const name = s.category?.name || s.category || 'General';
            const slug = s.category?.slug || (s.categoryId ? String(s.categoryId) : 'general');
            if (!map.has(slug)) {
                map.set(slug, { name, slug, count: 0 });
                order.push(slug);
            }
            map.get(slug).count += 1;
        }
        return order.map((k) => map.get(k));
    }, [services]);

    // The service referenced by the deep link (if it exists in the data).
    const deepLinkedService = useMemo(
        () => (deepLinkSlug ? services.find((s) => s.slug === deepLinkSlug) : null),
        [services, deepLinkSlug]
    );

    // Apply category filter (empty filter = show all).
    const visibleServices = useMemo(() => {
        if (!activeCategories.length) return services;
        return services.filter((s) => {
            const slug = s.category?.slug || (s.categoryId ? String(s.categoryId) : 'general');
            return activeCategories.includes(slug);
        });
    }, [services, activeCategories]);

    const setDeepLink = useCallback(
        (slug) => {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    if (slug) next.set('service', slug);
                    else next.delete('service');
                    return next;
                },
                { replace: true }
            );
        },
        [setSearchParams]
    );

    const toggleCategory = useCallback(
        (slug) => {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    const current = next.get('categories');
                    const list = current ? current.split(',').filter(Boolean) : [];
                    const idx = list.indexOf(slug);
                    if (idx >= 0) list.splice(idx, 1);
                    else list.push(slug);
                    if (list.length) next.set('categories', list.join(','));
                    else next.delete('categories');
                    return next;
                },
                { replace: true }
            );
        },
        [setSearchParams]
    );

    const clearCategory = useCallback(
        (slug) => toggleCategory(slug),
        [toggleCategory]
    );

    const clearAll = useCallback(() => {
        setSearchParams(new URLSearchParams(), { replace: true });
    }, [setSearchParams]);

    return {
        deepLinkSlug,
        deepLinkedService,
        activeCategories,
        categories,
        visibleServices,
        setDeepLink,
        toggleCategory,
        clearCategory,
        clearAll,
        buildPricingHref: getPricingRoute,
    };
}

export default usePricingFilters;
