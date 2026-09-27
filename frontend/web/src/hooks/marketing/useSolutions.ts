// @ts-nocheck
import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/lib/httpClient';
import { normalizeSolutions, type ApiSolutionCategory, type NormalizedSolution } from '@/lib/marketing/solutions/solutionData';

export function useSolutions() {
  const [solutions, setSolutions] = useState<NormalizedSolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const fetchSolutions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ solutions?: ApiSolutionCategory[] }>('/site/home-content');
      setSolutions(normalizeSolutions(data?.solutions || []));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSolutions();
  }, [fetchSolutions]);

  return { solutions, loading, error, refetch: fetchSolutions };
}
