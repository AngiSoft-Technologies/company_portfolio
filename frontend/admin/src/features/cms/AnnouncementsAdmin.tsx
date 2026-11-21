import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useCrud, Card, Spinner, EmptyState, PageHeader, Button, Table, Field, inputClass, type CrudConfig } from '@/components';
import { formatDate, truncate, StatusBadge, ModalShell, saveJson, SaveStatus } from './shared';

interface Row {
  id: string;
  title: string;
  body: string;
  audience: string;
  priority: string;
  published: boolean;
  publishedAt?: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const ENDPOINT = '/announcements/admin';

export function AnnouncementsAdmin() {
  const { rows, loading, error, refresh, remove } = useCrud<Row, CrudConfig<Row>>({ endpoint: ENDPOINT });
  const [editing, setEditing] = useState<Row | null>(null);

  const handleDelete = (r: Row) => {
    if (window.confirm(`Delete announcement "${r.title || r.id}"?`)) void remove(String(r.id));
  };

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Site-wide announcements shown to visitors"
        actions={<Button onClick={() => setEditing({} as Row)}>New Announcement</Button>}
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
            { key: 'audience', header: 'Audience', render: (r) => <span className="text-[var(--text-muted)]">{r.audience || 'all'}</span> },
            { key: 'priority', header: 'Priority', render: (r) => <span className="text-[var(--text-muted)]">{r.priority || 'normal'}</span> },
            { key: 'published', header: 'Status', render: (r) => <StatusBadge on={r.published} /> },
            { key: 'createdAt', header: 'Created', render: (r) => formatDate(r.createdAt) },
          ]}
        />
      )}
      {editing && <AnnouncementFormModal row={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}

function AnnouncementFormModal({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(row.id);
  const [form, setForm] = useState<Record<string, string | boolean>>(() => ({
    title: String(row.title ?? ''),
    body: String(row.body ?? ''),
    audience: String(row.audience ?? 'all'),
    priority: String(row.priority ?? 'normal'),
    published: Boolean(row.published),
    expiresAt: row.expiresAt ? String(row.expiresAt).slice(0, 10) : '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = (key: string) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
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
        expiresAt: form.expiresAt ? new Date(String(form.expiresAt)).toISOString() : null,
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
    <ModalShell title={`${isEdit ? 'Edit' : 'New'} Announcement`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title">
          <input className={inputClass} value={String(form.title ?? '')} onChange={set('title')} required />
        </Field>
        <Field label="Body">
          <textarea className={inputClass} rows={4} value={String(form.body ?? '')} onChange={set('body')} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Audience">
            <select className={inputClass} value={String(form.audience ?? 'all')} onChange={set('audience')}>
              <option value="all">All visitors</option>
              <option value="clients">Clients</option>
              <option value="staff">Staff</option>
            </select>
          </Field>
          <Field label="Priority">
            <select className={inputClass} value={String(form.priority ?? 'normal')} onChange={set('priority')}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </Field>
          <Field label="Expires">
            <input type="date" className={inputClass} value={String(form.expiresAt ?? '')} onChange={set('expiresAt')} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={Boolean(form.published)} onChange={setChecked('published')} className="h-4 w-4 rounded border-[var(--border)]" />
          Published
        </label>
        <SaveStatus error={error} success={success} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className={saving ? 'opacity-60' : ''}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Announcement'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
