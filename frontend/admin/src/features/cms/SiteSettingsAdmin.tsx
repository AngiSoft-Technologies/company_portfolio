import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useCrud, Card, Spinner, EmptyState, PageHeader, Button, Table, Field, inputClass, type CrudConfig } from '@/components';
import { formatDate, truncate, ModalShell, saveJson, SaveStatus } from './shared';

interface Row {
  id: string;
  key: string;
  name: string;
  value: string;
  type: string;
  createdAt?: string;
  updatedAt?: string;
}

const ENDPOINT = '/site';

export function SiteSettingsAdmin() {
  const { rows, loading, error, refresh, remove } = useCrud<Row, CrudConfig<Row>>({ endpoint: ENDPOINT });
  const [editing, setEditing] = useState<Row | null>(null);

  const handleDelete = (r: Row) => {
    if (window.confirm(`Delete setting "${r.key || r.name || r.id}"?`)) void remove(String(r.id));
  };

  return (
    <div>
      <PageHeader
        title="Site Settings"
        subtitle="Key/value configuration used across the site"
        actions={<Button onClick={() => setEditing({} as Row)}>New Setting</Button>}
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
            { key: 'key', header: 'Key', render: (r) => <span className="font-mono text-xs">{r.key}</span> },
            { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'type', header: 'Type', render: (r) => <span className="text-slate-500">{r.type || '—'}</span> },
            { key: 'value', header: 'Value', render: (r) => <span className="text-slate-500">{truncate(r.value, 50)}</span> },
            { key: 'updatedAt', header: 'Updated', render: (r) => formatDate(r.updatedAt ?? r.createdAt) },
          ]}
        />
      )}
      {editing && <SettingFormModal row={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}

function SettingFormModal({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(row.id);
  const [form, setForm] = useState<Record<string, string>>(() => ({
    key: String(row.key ?? ''),
    name: String(row.name ?? ''),
    value: String(row.value ?? ''),
    type: String(row.type ?? ''),
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
      const endpoint = isEdit ? `${ENDPOINT}/${row.id}` : `${ENDPOINT}/admin`;
      await saveJson(isEdit ? 'PUT' : 'POST', endpoint, { ...form });
      setSuccess(true);
      onSaved();
    } catch (err) {
      setError((err as Error).message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={`${isEdit ? 'Edit' : 'New'} Site Setting`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Key">
            <input className={inputClass} value={form.key} onChange={set('key')} placeholder="company.name" required />
          </Field>
          <Field label="Name">
            <input className={inputClass} value={form.name} onChange={set('name')} placeholder="Company Name" required />
          </Field>
        </div>
        <Field label="Type">
          <input className={inputClass} value={form.type} onChange={set('type')} placeholder="string" />
        </Field>
        <Field label="Value">
          <textarea className={inputClass} rows={4} value={form.value} onChange={set('value')} />
        </Field>
        <SaveStatus error={error} success={success} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className={saving ? 'opacity-60' : ''}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Setting'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

export default SiteSettingsAdmin;