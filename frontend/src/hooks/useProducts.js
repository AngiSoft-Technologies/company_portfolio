import { useEffect, useMemo, useState } from 'react';
import { safeGet } from '../js/httpClient';
import { normalizeProduct } from '../utils/products/normalizeProduct';

// Data-driven product list. Mirrors useProductDetail: fetches /products,
// normalizes each record, and filters out unpublished products so the grid
// always reflects the live CMS (same source as the ProductDetail pages).
export const useProducts = () => {
    const [raw, setRaw] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refetchToken, setRefetchToken] = useState(0);

    useEffect(() => {
        let active = true;
        const fetchProducts = async () => {
            setLoading(true);
            setError('');
            const res = await safeGet('/products');
            if (!active) return;
            if (!res.ok) {
                setError(res.error || 'Failed to load products');
                setRaw([]);
            } else {
                const list = Array.isArray(res.data) ? res.data : [];
                const normalized = list
                    .map((p) => normalizeProduct(p))
                    .filter((p) => p && p.published !== false);
                normalized.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
                setRaw(normalized);
            }
            setLoading(false);
        };
        fetchProducts();
        return () => {
            active = false;
        };
    }, [refetchToken]);

    const refetch = useMemo(() => () => setRefetchToken((t) => t + 1), []);

    return { products: raw, loading, error, refetch };
};
