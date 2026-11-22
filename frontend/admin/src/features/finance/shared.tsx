/* eslint-disable @typescript-eslint/no-explicit-any -- provider payloads are heterogeneous by design */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { Button, Card, EmptyState, Spinner } from '@/components';
import { Badge } from '@/lib/Badge';
import { formatDateTime, formatKsh } from '@/lib/format';

export type ApiRow = { id: string | number; [key: string]: any };

export const inputClass =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20';

/** Accepts bare arrays and any named array wrapper used by finance endpoints. */
export function listFrom(data: unknown, ...keys: string[]): ApiRow[] {
  if (Array.isArray(data)) return data as unknown as ApiRow[];
  if (!data || typeof data !== 'object') return [];
  const obj = data as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(obj[key])) return obj[key] as unknown as ApiRow[];
  }
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) return value as unknown as ApiRow[];
  }
  return [];
}

export function recordFrom(data: unknown, ...keys: string[]): ApiRow {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {} as ApiRow;
  const obj = data as Record<string, unknown>;
  for (const key of keys) {
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as unknown as ApiRow;
  }
  return obj as unknown as ApiRow;
}

export function valueFrom(data: unknown, key: string, fallback: unknown = null): any {
  if (!data || typeof data !== 'object') return fallback;
  const value = (data as Record<string, unknown>)[key];
  return value === undefined || value === null ? fallback : value;
}

export function money(row: ApiRow | undefined | null, ...keys: string[]): string {
  if (!row) return '—';
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      return formatKsh(row[key]);
    }
  }
  return '—';
}

/** Secrets are shown as masked envelopes only — never decrypted in the UI. */
export function SecretList({ secrets }: { secrets?: ApiRow[] | null }) {
  const rows = secrets ?? [];
  if (rows.length === 0) return <span className="text-xs text-[var(--text-muted)]">No stored secrets</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {rows.map((secret, index) => (
        <span
          key={String(secret.id ?? index)}
          className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
          title={secret.rotatedAt ? `Rotated ${formatDateTime(secret.rotatedAt)}` : undefined}
        >
          •••••• {String(secret.kind ?? secret.keyVersion ?? 'SECRET')}
        </span>
      ))}
    </span>
  );
}

export function CapabilityBadge({
  label,
  state,
  reason,
}: {
  label: string;
  state?: 'available' | 'limited' | 'unavailable' | boolean | null;
  reason?: unknown;
}) {
  const resolved = state === true || state === 'available' ? 'available'
    : state === 'limited' ? 'limited'
    : state === false || state === 'unavailable' ? 'unavailable'
    : 'unknown';
  const tone = resolved === 'available' ? 'green' : resolved === 'limited' ? 'amber' : resolved === 'unavailable' ? 'red' : 'slate';
  const text = resolved === 'available' ? 'Available' : resolved === 'limited' ? 'Limited' : resolved === 'unavailable' ? 'Unavailable' : 'Not configured';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]" title={reason ? String(reason) : undefined}>
      <Badge tone={tone}>{text}</Badge>
      {label}
    </span>
  );
}

export function capabilityState(capabilities: ApiRow | null | undefined, ...keys: string[]): 'available' | 'limited' | 'unavailable' | null {
  if (!capabilities) return null;
  for (const key of keys) {
    const raw = capabilities[key];
    if (typeof raw === 'boolean') return raw ? 'available' : 'unavailable';
    if (raw && typeof raw === 'object') {
      const obj = raw as ApiRow;
      if (obj.enabled === false || obj.available === false || obj.supported === false) return 'unavailable';
      if (obj.readOnly === true || obj.limited === true || obj.requiresApproval === true) return 'limited';
      if (obj.enabled === true || obj.available === true || obj.supported === true) return 'available';
    }
    if (typeof raw === 'string') {
      if (/enabled|available|supported|active/i.test(raw)) return 'available';
      if (/readonly|limited|approval/i.test(raw)) return 'limited';
      if (/disabled|unavailable|unsupported/i.test(raw)) return 'unavailable';
    }
  }
  return null;
}

export function ErrorNotice({ error, onRetry }: { error: string | null; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 border-red-300 text-sm text-[var(--text-secondary)]">
      <span>{error}</span>
      {onRetry ? <Button variant="outline" onClick={onRetry}>Retry</Button> : null}
    </Card>
  );
}

export function ResourceState({
  loading,
  error,
  empty,
  onRetry,
  children,
  emptyLabel = 'No records yet',
}: {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  onRetry?: () => void;
  children: ReactNode;
  emptyLabel?: string;
}) {
  if (loading) return <Spinner />;
  if (error) return <ErrorNotice error={error} onRetry={onRetry} />;
  if (empty) return <Card><EmptyState title={emptyLabel} /></Card>;
  return <>{children}</>;
}

export function useResource<T = ApiRow>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setData(await apiFetch(path) as T);
      setError(null);
    } catch (e) {
      setError((e as Error).message || 'Failed to load data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, setData, loading, error, reload };
}

/** Download a JSON/CSV export returned by an authenticated admin endpoint. */
export async function downloadPayload(path: string, filename: string): Promise<void> {
  const payload = await apiFetch(path);
  let blob: Blob;
  if (typeof payload === 'string') {
    blob = new Blob([payload], { type: 'text/csv;charset=utf-8' });
  } else {
    const obj = (payload ?? {}) as ApiRow;
    const content = obj.csv ?? obj.content ?? obj.data ?? obj.rows ?? obj;
    const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    blob = new Blob([text], { type: typeof content === 'string' ? 'text/csv;charset=utf-8' : 'application/json' });
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
