import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useCrud, Card, Spinner, EmptyState, PageHeader, Button, Table, Field, inputClass, type CrudConfig } from '@/components';
import { truncate, StatusBadge, ModalShell, saveJson, SaveStatus } from './shared';

interface Row {
  id: string;
  name: string;
  role: string;
  company: string;
  quote: string;
  rating: number;
  avatar: string;
  featured: boolean;
  approved: boolean;
}

const ENDPOINT = '/testimonials';

export function TestimonialsAdmin() {
  const { rows, loading, error, refresh, remove } = useCrud<Row, CrudConfig<Row>>({ endpoint: ENDPOINT });
  const [editing, setEditing] = useState<Row | null>(null);

  const handleDelete = (r: Row) => {
    if (window.confirm(`Delete testimonial from "${r.name || r.id}"?`)) void remove(String(r.id));
  };

  return (
    <div>
      <PageHeader
        title="Testimonials"
        subtitle="Client quotes shown on the site"
        actions={<Button onClick={() => setEditing({} as Row)}>New Testimonial</Button>}
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
            { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name || '—'}</span> },
            { key: 'role', header: 'Role', render: (r) => <span className="text-slate-500">{truncate(r.role, 40)}</span> },
            { key: 'company', header: 'Company', render: (r) => <span className="text-slate-500">{truncate(r.company, 40)}</span> },
            { key: 'rating', header: 'Rating', render: (r) => <span className="text-slate-500">{r.rating ?? '—'}</span> },
            {
              key: 'approved',
              header: 'Status',
              render: (r) => <StatusBadge on={r.approved} onLabel="Approved" offLabel="Pending" />,
            },
          ]}
        />
      )}
      {editing && <TestimonialFormModal row={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}

function TestimonialFormModal({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(row.id);
  const [form, setForm] = useState<Record<string, string | number | boolean>>(() => ({
    name: String(row.name ?? ''),
    role: String(row.role ?? ''),
    company: String(row.company ?? ''),
    quote: String(row.quote ?? ''),
    rating: Number(row.rating) || 5,
    avatar: String(row.avatar ?? ''),
    featured: Boolean(row.featured),
    approved: Boolean(row.approved),
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
        rating: Number(form.rating) || 0,
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
    <ModalShell title={`${isEdit ? 'Edit' : 'New'} Testimonial`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Name">
            <input className={inputClass} value={String(form.name ?? '')} onChange={set('name')} required />
          </Field>
          <Field label="Role">
            <input className={inputClass} value={String(form.role ?? '')} onChange={set('role')} placeholder="CEO" />
          </Field>
          <Field label="Company">
            <input className={inputClass} value={String(form.company ?? '')} onChange={set('company')} />
          </Field>
        </div>
        <Field label="Quote">
          <textarea className={inputClass} rows={4} value={String(form.quote ?? '')} onChange={set('quote')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rating (1–5)">
            <input
              type="number"
              min={1}
              max={5}
              step={1}
              className={inputClass}
              value={String(form.rating ?? '')}
              onChange={set('rating')}
            />
          </Field>
          <Field label="Avatar URL">
            <input className={inputClass} value={String(form.avatar ?? '')} onChange={set('avatar')} placeholder="https://…" />
          </Field>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={Boolean(form.featured)} onChange={setChecked('featured')} className="h-4 w-4 rounded border-slate-300" />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={Boolean(form.approved)} onChange={setChecked('approved')} className="h-4 w-4 rounded border-slate-300" />
            Approved
          </label>
        </div>
        <SaveStatus error={error} success={success} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className={saving ? 'opacity-60' : ''}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Testimonial'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

export default TestimonialsAdmin;