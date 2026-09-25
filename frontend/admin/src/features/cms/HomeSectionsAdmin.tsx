import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useCrud, Card, Spinner, EmptyState, PageHeader, Button, Table, Field, inputClass, type CrudConfig } from '@/components';
import { formatDate, truncate, ModalShell, saveJson, SaveStatus } from './shared';

interface Row {
  id: string;
  title: string;
  subtitle?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
}

const ENDPOINT = '/home-sections/admin';

export function HomeSectionsAdmin() {
  const { rows, loading, error, refresh } = useCrud<Row, CrudConfig<Row>>({ endpoint: ENDPOINT });
  const [editing, setEditing] = useState<Row | null>(null);

  return (
    <div>
      <PageHeader title="Home Sections" subtitle="Edit the sections rendered on the home page" />
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
            { key: 'title', header: 'Title', render: (r) => <span className="font-medium">{r.title}</span> },
            { key: 'subtitle', header: 'Subtitle', render: (r) => <span className="text-slate-500">{truncate(r.subtitle, 60)}</span> },
            { key: 'updatedAt', header: 'Updated', render: (r) => formatDate(r.updatedAt ?? r.createdAt) },
          ]}
        />
      )}
      {editing && <SectionFormModal row={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}

function SectionFormModal({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Record<string, string>>(() => ({
    title: String(row.title ?? ''),
    subtitle: String(row.subtitle ?? ''),
    content: String(row.content ?? ''),
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
      await saveJson('PUT', `/home-sections/${row.id}`, { ...form });
      setSuccess(true);
      onSaved();
    } catch (err) {
      setError((err as Error).message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Edit Home Section" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title">
          <input className={inputClass} value={form.title} onChange={set('title')} required />
        </Field>
        <Field label="Subtitle">
          <input className={inputClass} value={form.subtitle} onChange={set('subtitle')} />
        </Field>
        <Field label="Content">
          <textarea className={inputClass} rows={8} value={form.content} onChange={set('content')} />
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

export default HomeSectionsAdmin;