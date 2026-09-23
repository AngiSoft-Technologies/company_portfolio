// Search + filter hook for the Services List toolbar.
// Keeps search/category state and returns the filtered + derived view.
import { useMemo, useState } from 'react';
import { filterServices, deriveCategories } from '../utils/services/serviceFilters';

/**
 * @param {object[]} services - normalized services from useServices()
 * @returns {{ query, setQuery, category, setCategory, results, categories, isFiltering }}
 */
export function useServiceSearch(services = []) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('all');

    const results = useMemo(
        () => filterServices(services, { categorySlug: category, query }),
        [services, category, query]
    );

    const categories = useMemo(() => deriveCategories(services), [services]);

    const isFiltering = Boolean(query.trim()) || category !== 'all';

    const clearFilters = () => {
        setQuery('');
        setCategory('all');
    };

    return { query, setQuery, category, setCategory, results, categories, isFiltering, clearFilters };
}

export default useServiceSearch;
