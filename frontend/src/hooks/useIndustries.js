import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../js/httpClient';
import { normalizeIndustries } from '../utils/industries/industryHelpers';

const CACHE_TTL = 5 * 60 * 1000;
let cache = { industries: null, timestamp: 0 };

function readCache() {
    if (!cache.industries) return null;
    if (Date.now() - cache.timestamp > CACHE_TTL) return null;
    return cache.industries;
}
function writeCache(industries) {
    cache = { industries, timestamp: Date.now() };
}

/**
 * Loads the industries collection from /api/site/industries.
 * Keeps a short in-memory cache so repeat navigations paint instantly.
 */
export function useIndustries() {
    const initial = readCache();
    const [industries, setIndustries] = useState(initial || []);
    const [loading, setLoading] = useState(!initial);
    const [error, setError] = useState(null);

    const fetchIndustries = useCallback(async ({ force = false } = {}) => {
        if (!force && readCache()) {
            const cached = readCache();
            try {
                const res = await apiGet('/site/industries');
                const normalized = normalizeIndustries(res);
                writeCache(normalized);
                setIndustries(normalized);
                setLoading(false);
                setError(null);
            } catch {
                setIndustries(cached);
                setLoading(false);
            }
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await apiGet('/site/industries');
            const normalized = normalizeIndustries(res);
            writeCache(normalized);
            setIndustries(normalized);
        } catch (err) {
            setError(err);
            console.error('[useIndustries] failed to load:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!initial) fetchIndustries();
    }, [initial, fetchIndustries]);

    return { industries, loading, error, refetch: () => fetchIndustries({ force: true }) };
}
