// Hook for a single product's detail, loaded by slug from /api/products/:slug.
// Uses the canonical API source — no CMS fallback.
import { useEffect, useState } from 'react';
import { apiGet } from '../js/httpClient';
import { normalizeProduct } from '../utils/products/normalizeProduct';

/**
 * @param {string} slug
 * @returns {{ product, loading, error, notFound }}
 */
export function useProductDetail(slug) {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!slug) {
            setProduct(null);
            setNotFound(true);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);
        setNotFound(false);

        apiGet(`/products/${encodeURIComponent(slug)}`)
            .then((raw) => {
                if (cancelled) return;
                const normalized = normalizeProduct(raw);
                if (!normalized) {
                    setNotFound(true);
                    setProduct(null);
                } else {
                    setProduct(normalized);
                }
            })
            .catch((err) => {
                if (cancelled) return;
                // apiGet returns { ok:false, status, error } on failure.
                const status = err?.status;
                if (status === 404) {
                    setNotFound(true);
                    setProduct(null);
                } else {
                    setError(err?.error || err?.message || 'Failed to load product');
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [slug]);

    return { product, loading, error, notFound };
}
