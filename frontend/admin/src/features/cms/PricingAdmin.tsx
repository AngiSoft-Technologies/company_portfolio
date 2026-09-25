import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useCrud, Card, Spinner, EmptyState, PageHeader, Button, Table, Field, inputClass, type CrudConfig } from '@/components';
import { formatDate, truncate, ModalShell, saveJson, SaveStatus } from './shared';

interface Row {
  id: string;
  title: string;
  pricing: string | Record<string, unknown>;
  displayPricing?: string;
  createdAt?: string;
  updatedAt?: string;
}

const ENDPOINT = '/services/admin/pricing';

function pricingText(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return truncate(value, 40);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function PricingAdmin() {
  const { rows, loading, error, refresh } = useCrud<Row, CrudConfig<Row>>({ endpoint: ENDPOINT });
  const [editing, setEditing] = useState<Row | null>(null);

  return (
    <div>
      <PageHeader title="Pricing" subtitle="Edit the pricing shown on services" />
      {loading ? (
        <Spinner />
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <Table<Row>
          rows={rows}
          onEdit={setEditing}
          columns={[
            { key: 'title', header: 'Service', render: (r) => <span className="font-medium">{truncate(r.title)}</span> },
            {
              key: 'pricing',
              header: 'Pricing',
              render: (r) => <span className="text-slate-500">{pricingText(r.pricing ?? r.displayPricing)}</span>,
            },
            { key: 'updatedAt', header: 'Updated', render: (r) => formatDate(r.updatedAt ?? r.createdAt) },
          ]}
        />
      )}
      {editing && <PricingFormModal row={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}

function PricingFormModal({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Record<string, string>>(() => ({
    title: String(row.title ?? ''),
    pricing:
      typeof row.pricing === 'string'
        ? row.pricing
        : row.pricing
          ? JSON.stringify(row.pricing, null, 2)
          : String(row.displayPricing ?? ''),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = (key: string) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    let pricing: unknown = form.pricing;
    if (form.pricing.trim().startsWith('{') || form.pricing.trim().startsWith('[')) {
      try {
        pricing = JSON.parse(form.pricing);
      } catch {
        setError('Pricing is not valid JSON — fix the error or clear the value.');
        setSaving(false);
        return;
      }
    }
    try {
      await saveJson('PUT', `/services/${row.id}`, { title: form.title, pricing });
      setSuccess(true);
      onSaved();
    } catch (err) {
      setError((err as Error).message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Edit Pricing" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Service Title">
          <input className={inputClass} value={form.title} onChange={set('title')} required />
        </Field>
        <Field label="Pricing">
          <textarea
            className={inputClass}
            rows={5}
            value={form.pricing}
            onChange={set('pricing')}
            placeholder={'KES 2,500 / month\nor JSON: {"basic": "KES 2,500", "pro": "KES 5,000"}'}
          />
          <span className="mt-1 block text-xs text-slate-400">Plain text or JSON object/array.</span>
        </Field>
        <SaveStatus error={error} success={success} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className={saving ? 'opacity-60' : ''}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

export default PricingAdmin;