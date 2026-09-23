// Hook for a single service's detail, loaded by slug from /api/services/:slug.
// Uses the same canonical API source as useServices — no About/CMS fallback.
import { useEffect, useState } from 'react';
import { apiGet } from '../js/httpClient';
import { normalizeService } from '../utils/services/normalizeService';

/**
 * @param {string} slug
 * @returns {{ service, loading, error, notFound }}
 */
export function useServiceDetail(slug) {
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!slug) {
            setService(null);
            setNotFound(true);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);
        setNotFound(false);

        apiGet(`/services/${encodeURIComponent(slug)}`)
            .then((raw) => {
                if (cancelled) return;
                const normalized = normalizeService(raw);
                if (!normalized) {
                    setNotFound(true);
                    setService(null);
                } else {
                    setService(normalized);
                }
            })
            .catch((err) => {
                if (cancelled) return;
                // 404 (or empty) => not found state; other errors are errors.
                if (err?.status === 404 || /not found/i.test(err?.message || '')) {
                    setNotFound(true);
                } else {
                    setError(err?.message || 'Failed to load service');
                }
                setService(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [slug]);

    return { service, loading, error, notFound };
}

export default useServiceDetail;
