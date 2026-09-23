import { useCallback, useEffect, useState } from 'react';
import { solutionsList } from '../utils/solutions/solutionData';

// Resolves a single solution by slug from the static solution list. Exposes
// loading/notFound/error states so pages can render skeleton/error/not-found.
export function useSolutionDetail(slug) {
    const [solution, setSolution] = useState(null);
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
            const match = solutionsList.find((s) => s.slug === slug);
            if (!match) {
                setSolution(null);
                setNotFound(true);
            } else {
                setSolution(match);
                setNotFound(false);
            }
        } catch (err) {
            setError(err);
            console.error('[useSolutionDetail] failed to load:', err);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    return { solution, loading, error, notFound, refetch: fetchDetail };
}
