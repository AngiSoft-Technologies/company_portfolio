import { useState } from 'react';
import { Button, EmptyState, PageHeader, Spinner, Table, Field, inputClass, useCrud, type CrudConfig } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { formatDate } from '@/lib/format';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';

export interface ClientProjectRow {
  id: string;
  clientName: string;
  projectName: string;
  description?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

const STATUS_OPTIONS = ['pending', 'in-progress', 'completed', 'cancelled'];

const EMPTY_FORM = {
  clientName: '',
  projectName: '',
  description: '',
  status: 'pending',
  startDate: '',
  endDate: '',
};

export function ClientProjectsManagement() {
  const { rows, loading, error, refresh, remove } = useCrud<ClientProjectRow, CrudConfig<ClientProjectRow>>({
    endpoint: '/client-projects',
    transform: (data: unknown) => {
      const list = Array.isArray(data)
        ? data
        : (data as Record<string, unknown>)?.data ?? (data as Record<string, unknown>)?.items ?? [];
      return (Array.isArray(list) ? list : []).map((r) => {
        const rec = r as Record<string, unknown>;
        return {
          id: String(rec.id ?? ''),
          clientName: String(rec.clientName ?? rec.client ?? ''),
          projectName: String(rec.projectName ?? rec.title ?? ''),
          description: rec.description ? String(rec.description) : undefined,
          status: rec.status ? String(rec.status) : undefined,
          startDate: rec.startDate ? String(rec.startDate) : undefined,
          endDate: rec.endDate ? String(rec.endDate) : undefined,
        } as ClientProjectRow;
      });
    },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClientProjectRow | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setSaveError(null);
    setModalOpen(true);
  };

  const openEdit = (row: ClientProjectRow) => {
    setEditing(row);
    setForm({
      clientName: row.clientName,
      projectName: row.projectName,
      description: row.description ?? '',
      status: row.status ?? 'pending',
      startDate: row.startDate ?? '',
      endDate: row.endDate ?? '',
    });
    setSaveError(null);
    setModalOpen(true);
  };

  const set = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        clientName: form.clientName,
        projectName: form.projectName,
        description: form.description || undefined,
        status: form.status,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      };
      if (editing) {
        await apiFetch(`/api/client-projects/${encodeURIComponent(editing.id)}`, { method: 'PUT', body: payload });
      } else {
        await apiFetch('/api/client-projects', { method: 'POST', body: payload });
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
        title="Client Projects"
        subtitle="Track client delivery projects and their progress."
        actions={<Button onClick={openCreate}>New client project</Button>}
      />

      {loading ? <Spinner /> : null}
      {!loading && error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState title="No client projects yet" />
        </div>
      ) : (
        <Table<ClientProjectRow>
          rows={rows}
          onEdit={openEdit}
          onDelete={(r) => void remove(r.id)}
          columns={[
            {
              key: 'clientName',
              header: 'Client',
              render: (r) => <span className="font-medium">{r.clientName}</span>,
            },
            { key: 'projectName', header: 'Project', render: (r) => r.projectName },
            { key: 'status', header: 'Status', render: (r) => <Badge>{r.status ?? '—'}</Badge> },
            { key: 'startDate', header: 'Start', render: (r) => formatDate(r.startDate) },
            { key: 'endDate', header: 'End', render: (r) => formatDate(r.endDate) },
          ]}
        />
      )}

      {modalOpen ? (
        <Modal
          title={editing ? `Edit: ${editing.projectName}` : 'New client project'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving || !form.clientName || !form.projectName}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {saveError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saveError}</div>
            ) : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Client name">
                <input
                  className={inputClass}
                  value={form.clientName}
                  onChange={(e) => set('clientName', e.target.value)}
                />
              </Field>
              <Field label="Project name">
                <input
                  className={inputClass}
                  value={form.projectName}
                  onChange={(e) => set('projectName', e.target.value)}
                />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                className={`${inputClass} min-h-24 resize-y`}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </Field>
            <Field label="Status">
              <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
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
                <input
                  type="date"
                  className={inputClass}
                  value={form.endDate}
                  onChange={(e) => set('endDate', e.target.value)}
                />
              </Field>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default ClientProjectsManagement;