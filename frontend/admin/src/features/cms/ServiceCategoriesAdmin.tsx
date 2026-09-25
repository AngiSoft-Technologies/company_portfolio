import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useCrud, Card, Spinner, EmptyState, PageHeader, Button, Table, Field, inputClass, type CrudConfig } from '@/components';
import { truncate, ModalShell, saveJson, SaveStatus } from './shared';

interface Row {
  id: string;
  name: string;
  slug: string;
  description: string;
  order: number;
}

const ENDPOINT = '/service-categories';

export function ServiceCategoriesAdmin() {
  const { rows, loading, error, refresh, remove } = useCrud<Row, CrudConfig<Row>>({ endpoint: ENDPOINT });
  const [editing, setEditing] = useState<Row | null>(null);

  const handleDelete = (r: Row) => {
    if (window.confirm(`Delete category "${r.name || r.slug || r.id}"?`)) void remove(String(r.id));
  };

  return (
    <div>
      <PageHeader
        title="Service Categories"
        subtitle="Organise services into categories"
        actions={<Button onClick={() => setEditing({} as Row)}>New Category</Button>}
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
            { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'slug', header: 'Slug', render: (r) => <span className="text-slate-500">{truncate(r.slug, 30)}</span> },
            { key: 'order', header: 'Order', render: (r) => <span className="text-slate-500">{r.order ?? '—'}</span> },
          ]}
        />
      )}
      {editing && <CategoryFormModal row={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}

function CategoryFormModal({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(row.id);
  const [form, setForm] = useState<Record<string, string>>(() => ({
    name: String(row.name ?? ''),
    slug: String(row.slug ?? ''),
    description: String(row.description ?? ''),
    order: String(row.order ?? ''),
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
    <ModalShell title={`${isEdit ? 'Edit' : 'New'} Service Category`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input className={inputClass} value={form.name} onChange={set('name')} required />
          </Field>
          <Field label="Slug">
            <input className={inputClass} value={form.slug} onChange={set('slug')} placeholder="software" />
          </Field>
        </div>
        <Field label="Description">
          <textarea className={inputClass} rows={3} value={form.description} onChange={set('description')} />
        </Field>
        <Field label="Order">
          <input type="number" className={inputClass} value={form.order} onChange={set('order')} placeholder="0" />
        </Field>
        <SaveStatus error={error} success={success} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className={saving ? 'opacity-60' : ''}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Category'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

export default ServiceCategoriesAdmin;