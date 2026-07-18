// Hook that exposes the service category taxonomy. Derived from the loaded
// service list so it stays in sync with whatever the API returns. A static
// fallback is provided so the toolbar can render before/without data.
import { useMemo } from 'react';
import { useServices } from './useServices';

/**
 * @returns {{ categories, loading, error }}
 */
export function useServiceCategories() {
    const { services, loading, error } = useServices();

    const categories = useMemo(() => {
        const map = new Map();
        for (const s of services) {
            const slug = s.categorySlug || 'general';
            const name = s.categoryName || 'General';
            if (!map.has(slug)) map.set(slug, { slug, name, count: 0, order: s.category?.order ?? 999 });
            map.get(slug).count += 1;
        }
        const items = Array.from(map.values()).sort((a, b) => a.order - b.order);
        return [{ slug: 'all', name: 'All Services', count: services.length, order: -1 }, ...items];
    }, [services]);

    return { categories, loading, error };
}

export default useServiceCategories;
