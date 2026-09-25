import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useCrud, Card, Spinner, EmptyState, PageHeader, Button, Table, Field, inputClass, type CrudConfig } from '@/components';
import { formatDate, truncate, StatusBadge, ModalShell, saveJson, SaveStatus } from './shared';

interface Row {
  id: string;
  name: string;
  slug: string;
  title: string;
  description: string;
  features: string[];
  pricing: string;
  icon: string;
  image: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const ENDPOINT = '/products/admin';

export function ProductsAdmin() {
  const { rows, loading, error, refresh, remove } = useCrud<Row, CrudConfig<Row>>({ endpoint: ENDPOINT });
  const [editing, setEditing] = useState<Row | null>(null);

  const handleDelete = (r: Row) => {
    if (window.confirm(`Delete product "${r.name || r.title || r.slug || r.id}"?`)) void remove(String(r.id));
  };

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage products shown on the site"
        actions={<Button onClick={() => setEditing({} as Row)}>New Product</Button>}
      />
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
          onDelete={handleDelete}
          columns={[
            { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{truncate(r.name)}</span> },
            { key: 'slug', header: 'Slug', render: (r) => <span className="text-slate-500">{truncate(r.slug, 30)}</span> },
            { key: 'active', header: 'Status', render: (r) => <StatusBadge on={r.active} /> },
            { key: 'updatedAt', header: 'Updated', render: (r) => formatDate(r.updatedAt ?? r.createdAt) },
          ]}
        />
      )}
      {editing && <ProductFormModal row={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}

function ProductFormModal({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(row.id);
  const [form, setForm] = useState<Record<string, string | boolean>>(() => ({
    name: String(row.name ?? ''),
    slug: String(row.slug ?? ''),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    features: Array.isArray(row.features) ? row.features.join(', ') : String(row.features ?? ''),
    pricing: String(row.pricing ?? ''),
    icon: String(row.icon ?? ''),
    image: String(row.image ?? ''),
    active: Boolean(row.active),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = (key: string) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const setChecked = (key: string) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.checked }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    const features = String(form.features ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await saveJson(isEdit ? 'PUT' : 'POST', `${ENDPOINT}${isEdit ? `/${row.id}` : ''}`, {
        ...form,
        features,
      });
      setSuccess(true);
      onSaved();
    } catch (err) {
      setError((err as Error).message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={`${isEdit ? 'Edit' : 'New'} Product`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input className={inputClass} value={String(form.name ?? '')} onChange={set('name')} required />
          </Field>
          <Field label="Slug">
            <input className={inputClass} value={String(form.slug ?? '')} onChange={set('slug')} placeholder="dukaflow" />
          </Field>
        </div>
        <Field label="Title">
          <input className={inputClass} value={String(form.title ?? '')} onChange={set('title')} />
        </Field>
        <Field label="Description">
          <textarea className={inputClass} rows={3} value={String(form.description ?? '')} onChange={set('description')} />
        </Field>
        <Field label="Features (comma-separated)">
          <input
            className={inputClass}
            value={String(form.features ?? '')}
            onChange={set('features')}
            placeholder="invoicing, inventory, reports"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pricing">
            <input className={inputClass} value={String(form.pricing ?? '')} onChange={set('pricing')} placeholder="KES 2,500 / month" />
          </Field>
          <Field label="Icon">
            <input className={inputClass} value={String(form.icon ?? '')} onChange={set('icon')} />
          </Field>
        </div>
        <Field label="Image URL">
          <input className={inputClass} value={String(form.image ?? '')} onChange={set('image')} placeholder="https://…" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={Boolean(form.active)} onChange={setChecked('active')} className="h-4 w-4 rounded border-slate-300" />
          Active
        </label>
        <SaveStatus error={error} success={success} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className={saving ? 'opacity-60' : ''}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

export default ProductsAdmin;