import { useState, useEffect, type ReactNode } from 'react';
import { toast } from '@angisoft/utils';
import { apiFetch } from '@/lib/adminApi';

/**
 * Shared admin primitives — data fetching + tailwind UI building blocks.
 * Admin screens compose these; no external table/form lib needed for v1.
 */

export interface CrudConfig<T> {
  endpoint: string;
  transform?: (rows: unknown) => T[];
}

export interface CrudState<T> {
  rows: T[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  remove: (id: string) => Promise<boolean>;
}

export function normalizeRows<T>(data: unknown, transform?: (rows: unknown) => T[]): T[] {
  if (transform) return transform(data);
  const d = data as Record<string, unknown>;
  if (Array.isArray(d)) return d as T[];
  if (Array.isArray(d?.data)) return d.data as T[];
  if (Array.isArray(d?.items)) return d.items as T[];
  if (Array.isArray(d?.results)) return d.results as T[];
  return [];
}

/**
 * All admin data access goes through `apiFetch`, which uses the same-origin
 * `/api/*` proxy, the in-memory Bearer token, the CSRF double-submit header,
 * and the 401 refresh retry. A raw `fetch` here silently produced anonymous
 * requests that every guarded endpoint rejected.
 */
export function adminHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
}

export function useCrud<T, C extends CrudConfig<T> = CrudConfig<T>>(config: C): CrudState<T> {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const json = await apiFetch(`/api${config.endpoint}`);
      setRows(normalizeRows<T>(json, config.transform));
      setError(null);
    } catch (e) {
      setError((e as Error).message || 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string): Promise<boolean> => {
    try {
      await apiFetch(`/api${config.endpoint}/${id}`, { method: 'DELETE' });
      toast.success('Deleted successfully');
      await refresh();
      return true;
    } catch (e) {
      toast.error((e as Error).message || 'Delete failed');
      return false;
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { rows, loading, error, refresh, remove };
}

// ─── UI primitives ─────────────────────────────────────────────────────────

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm ${className}`}>{children}</div>;
}

export function Spinner({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div
        className="animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent"
        style={{ width: size, height: size }}
      />
    </div>
  );
}

export function EmptyState({ title = 'No records found' }: { title?: string }) {
  return (
    <div className="py-16 text-center text-sm text-[var(--text-muted)]">
      <p className="mb-2 text-2xl">🗂</p>
      {title}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  className = '',
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  type?: 'button' | 'submit';
  className?: string;
  disabled?: boolean;
}) {
  const styles: Record<string, string> = {
    primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-light)]',
    outline: 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    ghost: 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Table<T extends { id: string | number }>({
  columns,
  rows,
  onEdit,
  onDelete,
}: {
  columns: { key: string; header: string; render?: (row: T) => ReactNode }[];
  rows: T[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-primary)] text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 font-semibold">
                {c.header}
              </th>
            ))}
            {(onEdit || onDelete) && <th className="px-4 py-3 text-right font-semibold">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[var(--border-light)] last:border-0 hover:bg-[var(--bg-primary)]">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3">
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="py-10 text-center text-sm text-[var(--text-muted)]">No records.</div>}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20';