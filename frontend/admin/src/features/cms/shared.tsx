import type { ReactNode } from 'react';

export function formatDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

export function truncate(value: unknown, len = 60): string {
  const s = String(value ?? '');
  return s.length > len ? `${s.slice(0, len)}…` : s;
}

export function StatusBadge({
  on,
  onLabel = 'Active',
  offLabel = 'Inactive',
}: {
  on: unknown;
  onLabel?: string;
  offLabel?: string;
}) {
  return on ? (
    <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
      {onLabel}
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
      {offLabel}
    </span>
  );
}

export function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2.5 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export async function saveJson(
  method: 'POST' | 'PUT',
  endpoint: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`/api${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(String(json.error ?? json.message ?? 'Save failed'));
  return json;
}

export function SaveStatus({ error, success }: { error: string | null; success: boolean }) {
  if (success) {
    return <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Saved successfully.</p>;
  }
  if (error) {
    return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  }
  return null;
}