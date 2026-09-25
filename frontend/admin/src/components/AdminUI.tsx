import { useState, useEffect, type ReactNode } from 'react';
import { toast } from '@angisoft/utils';

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
      const res = await fetch(`/api${config.endpoint}`, { headers: adminHeaders(), credentials: 'include' });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error((json.error as string) || (json.message as string) || 'Failed to load');
      }
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
      const res = await fetch(`/api${config.endpoint}/${id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Delete failed');
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
  }, []);

  return { rows, loading, error, refresh, remove };
}

// ─── UI primitives ─────────────────────────────────────────────────────────

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function Spinner({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div
        className="animate-spin rounded-full border-4 border-[#0875FF] border-t-transparent"
        style={{ width: size, height: size }}
      />
    </div>
  );
}

export function EmptyState({ title = 'No records found' }: { title?: string }) {
  return (
    <div className="py-16 text-center text-sm text-slate-400">
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
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
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
    primary: 'bg-[#0875FF] text-white hover:bg-[#3B9AFF]',
    outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    ghost: 'text-slate-600 hover:bg-slate-100',
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
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
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
            <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
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
                        className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
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
      {rows.length === 0 && <div className="py-10 text-center text-sm text-slate-400">No records.</div>}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-[#0875FF] focus:ring-2 focus:ring-[#0875FF]/20';