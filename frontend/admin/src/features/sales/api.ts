import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { normalizeRows } from '@/components/AdminUI';

/** GET a pipeline collection with optional query params; rows come back as a bare array. */
export function usePipelineResource<T>(endpoint: string, params?: Record<string, string | undefined>) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = params
    ? Object.entries(params)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
        .join('&')
    : '';

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const json = await apiFetch(`/api${endpoint}${query ? `?${query}` : ''}`);
      setRows(normalizeRows<T>(json));
      setError(null);
    } catch (e) {
      setError((e as Error).message || 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, loading, error, refresh };
}

export function createRecord(endpoint: string, body: unknown) {
  return apiFetch(`/api${endpoint}`, { method: 'POST', body }) as Promise<Record<string, unknown>>;
}

export function updateRecord(endpoint: string, id: string, body: unknown) {
  return apiFetch(`/api${endpoint}/${id}`, { method: 'PATCH', body }) as Promise<Record<string, unknown>>;
}

export function deleteRecord(endpoint: string, id: string) {
  return apiFetch(`/api${endpoint}/${id}`, { method: 'DELETE' });
}

export function actionRecord(endpoint: string, id: string, action: string, body?: unknown) {
  return apiFetch(`/api${endpoint}/${id}/${action}`, { method: 'POST', body: body ?? {} }) as Promise<
    Record<string, unknown>
  >;
}

/** Best-effort fetch of a secondary collection (e.g. leads for a select). Returns [] on failure. */
export async function fetchOptions<T>(endpoint: string): Promise<T[]> {
  try {
    const json = await apiFetch(`/api${endpoint}`);
    return normalizeRows<T>(json);
  } catch {
    return [];
  }
}
