import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useCrud, Card, Spinner, EmptyState, PageHeader, Button, Table, Field, inputClass, type CrudConfig } from '@/components';
import { formatDate, truncate, StatusBadge, ModalShell, saveJson, SaveStatus } from './shared';

interface Row {
  id: string;
  title: string;
  slug: string;
  description: string;
  icon: string;
  image: string;
  order: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const ENDPOINT = '/services';

export function ServicesAdmin() {
  const { rows, loading, error, refresh, remove } = useCrud<Row, CrudConfig<Row>>({ endpoint: ENDPOINT });
  const [editing, setEditing] = useState<Row | null>(null);

  const handleDelete = (r: Row) => {
    if (window.confirm(`Delete service "${r.title || r.slug || r.id}"?`)) void remove(String(r.id));
  };

  return (
    <div>
      <PageHeader
        title="Services"
        subtitle="Manage services offered"
        actions={<Button onClick={() => setEditing({} as Row)}>New Service</Button>}
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
            { key: 'title', header: 'Title', render: (r) => <span className="font-medium">{truncate(r.title)}</span> },
            { key: 'order', header: 'Order', render: (r) => <span className="text-slate-500">{r.order ?? '—'}</span> },
            { key: 'active', header: 'Status', render: (r) => <StatusBadge on={r.active} /> },
            { key: 'updatedAt', header: 'Updated', render: (r) => formatDate(r.updatedAt ?? r.createdAt) },
          ]}
        />
      )}
      {editing && <ServiceFormModal row={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}

function ServiceFormModal({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(row.id);
  const [form, setForm] = useState<Record<string, string | boolean>>(() => ({
    title: String(row.title ?? ''),
    slug: String(row.slug ?? ''),
    description: String(row.description ?? ''),
    icon: String(row.icon ?? ''),
    image: String(row.image ?? ''),
    order: String(row.order ?? ''),
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
    try {
      await saveJson(isEdit ? 'PUT' : 'POST', `${ENDPOINT}${isEdit ? `/${row.id}` : ''}`, {
        ...form,
        order: Number(form.order) || 0,
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
    <ModalShell title={`${isEdit ? 'Edit' : 'New'} Service`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title">
            <input className={inputClass} value={String(form.title ?? '')} onChange={set('title')} required />
          </Field>
          <Field label="Slug">
            <input className={inputClass} value={String(form.slug ?? '')} onChange={set('slug')} placeholder="software-development" />
          </Field>
        </div>
        <Field label="Description">
          <textarea className={inputClass} rows={3} value={String(form.description ?? '')} onChange={set('description')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Icon">
            <input className={inputClass} value={String(form.icon ?? '')} onChange={set('icon')} />
          </Field>
          <Field label="Image URL">
            <input className={inputClass} value={String(form.image ?? '')} onChange={set('image')} placeholder="https://…" />
          </Field>
          <Field label="Order">
            <input
              type="number"
              className={inputClass}
              value={String(form.order ?? '')}
              onChange={set('order')}
              placeholder="0"
            />
          </Field>
        </div>
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
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Service'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

export default ServicesAdmin;