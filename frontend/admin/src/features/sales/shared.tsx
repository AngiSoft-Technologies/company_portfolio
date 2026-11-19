import type { ReactNode } from 'react';
import { Badge } from '@/lib/Badge';
import { formatKsh } from '@/lib/format';
import { Button, Field, inputClass } from '@/components';

export function StageBadge({ value }: { value?: string | null }) {
  const v = String(value ?? '');
  const tone =
    /won|paid|accepted|qualified/.test(v) ? 'green'
    : /lost|rejected|void|expired/.test(v) ? 'red'
    : /negotiation|proposal|sent|partially/.test(v) ? 'purple'
    : /new|draft/.test(v) ? 'blue'
    : undefined;
  return <Badge tone={tone}>{v ? v.replace(/_/g, ' ') : '—'}</Badge>;
}

export function Money({ value, currency }: { value?: string | number | null; currency?: string | null }) {
  if (value === null || value === undefined || value === '') return <span>—</span>;
  const n = typeof value === 'number' ? value : Number(String(value));
  if (!Number.isFinite(n)) return <span>{String(value)}</span>;
  const prefix = currency && currency !== 'KES' ? `${currency} ` : '';
  return <span>{prefix}{formatKsh(n)}</span>;
}

export interface EditableLineItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

export function emptyLineItem(): EditableLineItem {
  return { description: '', quantity: '1', unitPrice: '' };
}

export function lineItemsFromApi(items?: { description?: string; quantity?: number; unitPrice?: string | number }[]): EditableLineItem[] {
  if (!items?.length) return [emptyLineItem()];
  return items.map((i) => ({
    description: i.description ?? '',
    quantity: String(i.quantity ?? 1),
    unitPrice: String(i.unitPrice ?? ''),
  }));
}

export function lineItemsToApi(items: EditableLineItem[]) {
  return items
    .filter((i) => i.description.trim())
    .map((i, idx) => ({
      description: i.description.trim(),
      quantity: Math.max(1, Math.floor(Number(i.quantity) || 1)),
      unitPrice: Number(i.unitPrice) || 0,
      sortOrder: idx,
    }));
}

export function lineItemsSubtotal(items: EditableLineItem[]): number {
  return items.reduce((sum, i) => {
    const q = Math.max(1, Math.floor(Number(i.quantity) || 1));
    const p = Number(i.unitPrice);
    return sum + (Number.isFinite(p) ? p * q : 0);
  }, 0);
}

/** Editable line-item grid shared by the quote and invoice forms. */
export function LineItemsEditor({
  items,
  onChange,
}: {
  items: EditableLineItem[];
  onChange: (items: EditableLineItem[]) => void;
}) {
  const set = (idx: number, patch: Partial<EditableLineItem>) =>
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_5rem_7rem_2rem] gap-2 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
        <span>Description</span>
        <span>Qty</span>
        <span>Unit price</span>
        <span />
      </div>
      {items.map((item, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_5rem_7rem_2rem] gap-2">
          <input
            className={inputClass}
            placeholder="Line item description"
            value={item.description}
            onChange={(e) => set(idx, { description: e.target.value })}
          />
          <input
            className={inputClass}
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => set(idx, { quantity: e.target.value })}
          />
          <input
            className={inputClass}
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={item.unitPrice}
            onChange={(e) => set(idx, { unitPrice: e.target.value })}
          />
          <button
            type="button"
            aria-label="Remove line"
            className="rounded-lg text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500"
            onClick={() => onChange(items.filter((_, i) => i !== idx))}
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1">
        <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => onChange([...items, emptyLineItem()])}>
          + Add line
        </Button>
        <span className="text-sm text-[var(--text-muted)]">
          Subtotal: <strong>{formatKsh(lineItemsSubtotal(items))}</strong>
        </span>
      </div>
    </div>
  );
}

export function LineItemsSummary({ items }: { items?: { id?: string; description?: string; quantity?: number; unitPrice?: string | number; lineTotal?: string | number }[] }) {
  if (!items?.length) return <p className="text-sm text-[var(--text-muted)]">No line items.</p>;
  return (
    <table className="w-full text-sm">
      <tbody>
        {items.map((li, i) => (
          <tr key={li.id ?? i} className="border-b border-[var(--border-light)] last:border-0">
            <td className="py-2 pr-3">{li.description}</td>
            <td className="py-2 pr-3 text-[var(--text-muted)]">×{li.quantity ?? 1}</td>
            <td className="py-2 pr-3 text-right text-[var(--text-muted)]">{formatKsh(li.unitPrice)}</td>
            <td className="py-2 text-right font-medium">{formatKsh(li.lineTotal)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FilterTabs({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            value === o.value
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

export { Field };
