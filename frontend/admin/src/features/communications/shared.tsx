/* eslint-disable @typescript-eslint/no-explicit-any -- provider payloads are heterogeneous by design */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { Button, Card, EmptyState, Spinner } from '@/components';
import { Badge } from '@/lib/Badge';
import { formatDateTime } from '@/lib/format';

/** Loose API row — Phase 7 providers expose slightly different field names. */
export type ApiRow = { id: string | number; [key: string]: any };

/** Shared field styling (theme-aware, no literal colours). */
export const inputClass =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20';

/**
 * Phase 7 endpoints wrap arrays in named keys (`accounts`, `grants`, …).
 * Accept any of those keys, a bare array, or the first array in the payload so
 * a UI screen keeps working while provider adapters land.
 */
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

export function countOf(value: unknown): number {
  if (typeof value === 'number') return value;
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of ['total', 'count', 'value']) {
      if (typeof obj[key] === 'number') return obj[key] as number;
    }
  }
  return 0;
}

export function shortId(value: unknown): string {
  const text = String(value ?? '—');
  return text.length > 10 ? `${text.slice(0, 8)}…` : text;
}

export function displayName(row: ApiRow | undefined | null): string {
  if (!row) return '—';
  return String(row.name ?? row.displayName ?? row.subject ?? row.email ?? row.address ?? row.id ?? '—');
}

/** Secrets are never rendered in clear text — only their envelope metadata. */
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

/** Reads capability maps which may be boolean flags or nested objects. */
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

/** Consistent loading / error / empty handling for data-driven panels. */
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

/** Simple GET resource with explicit reload; path is a same-origin /admin/... URL. */
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
      const result = await apiFetch(path);
      setData(result as T);
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

/** Small JSON text-area helper for provider-specific condition/action payloads. */
export function parseJson(text: string, label: string): unknown {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
}

export function stringifyJson(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

/** Export JSON/CSV payloads returned by the audit/export endpoints. */
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
