import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../js/httpClient';
import { normalizeIndustries } from '../utils/industries/industryHelpers';

/**
 * Resolves a single industry by slug from the /api/site/industries payload.
 * The payload is a flat list, so we load the whole collection (cache-backed)
 * and pick the matching slug. Exposes loading/notFound/error states.
 */
export function useIndustryDetail(slug) {
    const [industry, setIndustry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notFound, setNotFound] = useState(false);

    const fetchDetail = useCallback(async () => {
        if (!slug) {
            setNotFound(true);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        setNotFound(false);
        try {
            const res = await apiGet('/site/industries');
            const list = normalizeIndustries(res);
            const match = list.find((i) => i.slug === slug);
            if (!match) {
                setIndustry(null);
                setNotFound(true);
            } else {
                setIndustry(match);
                setNotFound(false);
            }
        } catch (err) {
            setError(err);
            console.error('[useIndustryDetail] failed to load:', err);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    return { industry, loading, error, notFound, refetch: fetchDetail };
}
