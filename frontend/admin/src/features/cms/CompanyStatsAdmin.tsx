import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useCrud, Card, Spinner, EmptyState, PageHeader, Button, Table, Field, inputClass, type CrudConfig } from '@/components';
import { formatDate, truncate, StatusBadge, ModalShell, saveJson, SaveStatus } from './shared';

interface Row {
  id: string;
  label: string;
  value: number;
  suffix: string;
  prefix: string;
  valueType: string;
  useGrouping: boolean | null;
  icon: string;
  description: string;
  order: number;
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const ENDPOINT = '/company-stats/admin';

export function CompanyStatsAdmin() {
  const { rows, loading, error, refresh, remove } = useCrud<Row, CrudConfig<Row>>({ endpoint: ENDPOINT });
  const [editing, setEditing] = useState<Row | null>(null);

  const handleDelete = (r: Row) => {
    if (window.confirm(`Delete stat "${r.label || r.id}"?`)) void remove(String(r.id));
  };

  return (
    <div>
      <PageHeader
        title="Company Stats"
        subtitle="Public counters and proof points shown across the site"
        actions={<Button onClick={() => setEditing({} as Row)}>New Stat</Button>}
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
            { key: 'label', header: 'Label', render: (r) => <span className="font-medium">{truncate(r.label)}</span> },
            { key: 'value', header: 'Value', render: (r) => <span className="text-[var(--text-muted)]">{r.prefix ?? ''}{r.value}{r.suffix ?? ''}</span> },
            { key: 'order', header: 'Order', render: (r) => <span className="text-[var(--text-muted)]">{r.order ?? '—'}</span> },
            { key: 'published', header: 'Status', render: (r) => <StatusBadge on={r.published} /> },
            { key: 'updatedAt', header: 'Updated', render: (r) => formatDate(r.updatedAt ?? r.createdAt) },
          ]}
        />
      )}
      {editing && <StatFormModal row={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}

function StatFormModal({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(row.id);
  const [form, setForm] = useState<Record<string, string | boolean | null>>(() => ({
    label: String(row.label ?? ''),
    value: String(row.value ?? ''),
    suffix: String(row.suffix ?? ''),
    prefix: String(row.prefix ?? ''),
    valueType: String(row.valueType ?? 'plain'),
    useGrouping: row.useGrouping ?? true,
    icon: String(row.icon ?? ''),
    description: String(row.description ?? ''),
    order: String(row.order ?? ''),
    published: Boolean(row.published),
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
        value: Number(form.value) || 0,
        order: Number(form.order) || 0,
        icon: form.icon ? String(form.icon) : null,
        description: form.description ? String(form.description) : null,
        useGrouping: form.useGrouping === '' ? null : Boolean(form.useGrouping),
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
    <ModalShell title={`${isEdit ? 'Edit' : 'New'} Company Stat`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Label">
            <input className={inputClass} value={String(form.label ?? '')} onChange={set('label')} placeholder="Projects delivered" required />
          </Field>
          <Field label="Icon">
            <input className={inputClass} value={String(form.icon ?? '')} onChange={set('icon')} placeholder="FaChartLine" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Prefix">
            <input className={inputClass} value={String(form.prefix ?? '')} onChange={set('prefix')} placeholder="KES " />
          </Field>
          <Field label="Value">
            <input type="number" className={inputClass} value={String(form.value ?? '')} onChange={set('value')} required />
          </Field>
          <Field label="Suffix">
            <input className={inputClass} value={String(form.suffix ?? '')} onChange={set('suffix')} placeholder="+" />
          </Field>
          <Field label="Order">
            <input type="number" className={inputClass} value={String(form.order ?? '')} onChange={set('order')} placeholder="0" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Value type">
            <select className={inputClass} value={String(form.valueType ?? 'plain')} onChange={set('valueType')}>
              <option value="plain">Plain number</option>
              <option value="currency">Currency</option>
              <option value="percent">Percent</option>
              <option value="duration">Duration</option>
            </select>
          </Field>
          <Field label="Description">
            <input className={inputClass} value={String(form.description ?? '')} onChange={set('description')} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={Boolean(form.useGrouping)} onChange={setChecked('useGrouping')} className="h-4 w-4 rounded border-[var(--border)]" />
          Group digits (1,000)
        </label>
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
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Stat'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
