// @ts-nocheck
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/httpClient';

/**
 * Fetches GET /v1/offices (published offices only).
 * Returns [] on failure so the contact page degrades gracefully.
 */
export function useOffices() {
    const [offices, setOffices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await apiGet('/offices');
                const data = Array.isArray(res) ? res : (res?.offices || []);
                if (active) setOffices(Array.isArray(data) ? data : []);
            } catch {
                if (active) setOffices([]);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, []);

    return { offices, loading };
}

export default useOffices;
