// @ts-nocheck
import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/lib/httpClient';
import { normalizeSolutions, type ApiSolutionCategory, type NormalizedSolution } from '@/lib/marketing/solutions/solutionData';

export function useSolutionDetail(slug?: string) {
  const [solution, setSolution] = useState<NormalizedSolution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
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
      const data = await apiGet<{ solutions?: ApiSolutionCategory[] }>('/site/home-content');
      const match = normalizeSolutions(data?.solutions || []).find((item) => item.slug === slug);
      if (!match) {
        setSolution(null);
        setNotFound(true);
      } else {
        setSolution(match);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  return { solution, loading, error, notFound, refetch: fetchDetail };
}
