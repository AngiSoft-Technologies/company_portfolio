import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '../js/httpClient';
import { normalizeContactData } from '../utils/contact/normalizeContactData';

/**
 * Fetches GET /api/site/contact and normalizes it.
 * Returns safe fallbacks so the form stays usable even while loading
 * or when contact data is missing — contact info / map / dynamic copy
 * are the only things gated on this data, not the form itself.
 */
export function useContactPage() {
    const [raw, setRaw] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiGet('/site/contact');
            const data = res && res.data ? res.data : res;
            setRaw(data || null);
        } catch (err) {
            setError(err?.message || 'Failed to load contact details.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let active = true;
        (async () => {
            setLoading(true);
            try {
                const res = await apiGet('/site/contact');
                const data = res && res.data ? res.data : res;
                if (active) setRaw(data || null);
            } catch (err) {
                if (active) setError(err?.message || 'Failed to load contact details.');
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, []);

    const contact = normalizeContactData(raw);
    return { contact, loading, error, refetch };
}

export default useContactPage;
