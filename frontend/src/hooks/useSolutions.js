import { useEffect, useState } from 'react';
import { solutionsList } from '../utils/solutions/solutionData';

// Solutions are sourced from a static module (no backend model exists for them),
// so we resolve synchronously with a brief loading state to mirror the data-driven
// hooks used elsewhere (useIndustries, etc.) and keep pages consistent.
export function useSolutions() {
    const [solutions, setSolutions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        try {
            setSolutions(solutionsList);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    return { solutions, loading, error };
}
