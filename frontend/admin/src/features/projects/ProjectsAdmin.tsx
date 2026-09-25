import { useState } from 'react';
import { Button, EmptyState, PageHeader, Spinner, Table, Field, inputClass, useCrud, type CrudConfig } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { formatDate } from '@/lib/format';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';

export interface ProjectRow {
  id: string;
  title: string;
  category?: string;
  client?: string;
  description?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  featured?: boolean;
}

const STATUS_OPTIONS = ['draft', 'active', 'on-hold', 'completed', 'archived'];

const EMPTY_FORM = {
  title: '',
  category: '',
  client: '',
  description: '',
  status: 'draft',
  startDate: '',
  endDate: '',
  featured: false,
};

export function ProjectsAdmin() {
  const { rows, loading, error, refresh, remove } = useCrud<ProjectRow, CrudConfig<ProjectRow>>({
    endpoint: '/projects',
    transform: (data: unknown) => {
      const list = Array.isArray(data)
        ? data
        : (data as Record<string, unknown>)?.data ?? (data as Record<string, unknown>)?.items ?? [];
      return (Array.isArray(list) ? list : []).map((r) => {
        const rec = r as Record<string, unknown>;
        return {
          id: String(rec.id ?? ''),
          title: String(rec.title ?? rec.name ?? ''),
          category: rec.category ? String(rec.category) : undefined,
          client: rec.client ? String(rec.client) : undefined,
          description: rec.description ? String(rec.description) : undefined,
          status: rec.status ? String(rec.status) : undefined,
          startDate: rec.startDate ? String(rec.startDate) : undefined,
          endDate: rec.endDate ? String(rec.endDate) : undefined,
          featured: Boolean(rec.featured),
        } as ProjectRow;
      });
    },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setSaveError(null);
    setModalOpen(true);
  };

  const openEdit = (row: ProjectRow) => {
    setEditing(row);
    setForm({
      title: row.title,
      category: row.category ?? '',
      client: row.client ?? '',
      description: row.description ?? '',
      status: row.status ?? 'draft',
      startDate: row.startDate ?? '',
      endDate: row.endDate ?? '',
      featured: Boolean(row.featured),
    });
    setSaveError(null);
    setModalOpen(true);
  };

  const set = (key: keyof typeof EMPTY_FORM, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        title: form.title,
        category: form.category || undefined,
        client: form.client || undefined,
        description: form.description || undefined,
        status: form.status,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        featured: form.featured,
      };
      if (editing) {
        await apiFetch(`/api/projects/${encodeURIComponent(editing.id)}`, { method: 'PUT', body: payload });
      } else {
        await apiFetch('/api/projects', { method: 'POST', body: payload });
      }
      setModalOpen(false);
      await refresh();
    } catch (e) {
      setSaveError((e as Error).message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Manage showcase projects."
        actions={
          <Button onClick={openCreate}>New project</Button>
        }
      />

      {loading ? <Spinner /> : null}
      {!loading && error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState title="No projects yet" />
        </div>
      ) : (
        <Table<ProjectRow>
          rows={rows}
          onEdit={openEdit}
          onDelete={(r) => void remove(r.id)}
          columns={[
            { key: 'title', header: 'Title', render: (r) => <span className="font-medium">{r.title}</span> },
            { key: 'category', header: 'Category', render: (r) => r.category ?? '—' },
            { key: 'client', header: 'Client', render: (r) => r.client ?? '—' },
            { key: 'status', header: 'Status', render: (r) => <Badge>{r.status ?? '—'}</Badge> },
            { key: 'startDate', header: 'Start', render: (r) => formatDate(r.startDate) },
            { key: 'endDate', header: 'End', render: (r) => formatDate(r.endDate) },
            {
              key: 'featured',
              header: 'Featured',
              render: (r) => (r.featured ? <Badge tone="green">Yes</Badge> : <span className="text-slate-400">No</span>),
            },
          ]}
        />
      )}

      {modalOpen ? (
        <Modal
          title={editing ? `Edit project: ${editing.title}` : 'New project'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving || !form.title}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {saveError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saveError}</div>
            ) : null}
            <Field label="Title">
              <input className={inputClass} value={form.title} onChange={(e) => set('title', e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Category">
                <input className={inputClass} value={form.category} onChange={(e) => set('category', e.target.value)} />
              </Field>
              <Field label="Client">
                <input className={inputClass} value={form.client} onChange={(e) => set('client', e.target.value)} />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                className={`${inputClass} min-h-24 resize-y`}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Status">
                <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => set('featured', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Featured
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Start date">
                <input
                  type="date"
                  className={inputClass}
                  value={form.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                />
              </Field>
              <Field label="End date">
                <input type="date" className={inputClass} value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
              </Field>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default ProjectsAdmin;