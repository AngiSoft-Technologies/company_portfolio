import { useState } from 'react';
import { Button, EmptyState, PageHeader, Spinner, Table, Field, inputClass, useCrud, type CrudConfig } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';

export interface StaffRow {
  id: string;
  name: string;
  email: string;
  role?: string;
  title?: string;
  avatarUrl?: string;
}

const ROLE_OPTIONS = ['ADMIN', 'MARKETING', 'DEVELOPER'];

const EMPTY_FORM = {
  name: '',
  email: '',
  role: 'MARKETING',
  title: '',
  avatarUrl: '',
};

export function StaffManagement() {
  const { rows, loading, error, refresh, remove } = useCrud<StaffRow, CrudConfig<StaffRow>>({
    endpoint: '/staff',
    transform: (data: unknown) => {
      const list = Array.isArray(data)
        ? data
        : (data as Record<string, unknown>)?.data ?? (data as Record<string, unknown>)?.items ?? [];
      return (Array.isArray(list) ? list : []).map((r) => {
        const rec = r as Record<string, unknown>;
        return {
          id: String(rec.id ?? ''),
          name: String(rec.name ?? ''),
          email: String(rec.email ?? ''),
          role: rec.role ? String(rec.role) : undefined,
          title: rec.title ? String(rec.title) : rec.jobTitle ? String(rec.jobTitle) : undefined,
          avatarUrl: rec.avatarUrl ? String(rec.avatarUrl) : undefined,
        } as StaffRow;
      });
    },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setSaveError(null);
    setModalOpen(true);
  };

  const openEdit = (row: StaffRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      email: row.email,
      role: row.role ?? 'MARKETING',
      title: row.title ?? '',
      avatarUrl: row.avatarUrl ?? '',
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
        name: form.name,
        email: form.email,
        role: form.role,
        title: form.title || undefined,
        avatarUrl: form.avatarUrl || undefined,
      };
      if (editing) {
        await apiFetch(`/api/staff/${encodeURIComponent(editing.id)}`, { method: 'PUT', body: payload });
      } else {
        await apiFetch('/api/staff', { method: 'POST', body: payload });
      }
      setModalOpen(false);
      await refresh();
    } catch (e) {
      setSaveError((e as Error).message || 'Failed to save staff member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Staff Management"
        subtitle="Manage team members and their roles."
        actions={<Button onClick={openCreate}>Add staff</Button>}
      />

      {loading ? <Spinner /> : null}
      {!loading && error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState title="No staff members yet" />
        </div>
      ) : (
        <Table<StaffRow>
          rows={rows}
          onEdit={openEdit}
          onDelete={(r) => void remove(r.id)}
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (r) => (
                <div className="flex items-center gap-3">
                  {r.avatarUrl ? (
                    <img src={r.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0875FF]/10 text-sm font-semibold text-[#0875FF]">
                      {r.name.charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
                  <span className="font-medium">{r.name}</span>
                </div>
              ),
            },
            { key: 'email', header: 'Email', render: (r) => r.email },
            { key: 'role', header: 'Role', render: (r) => <Badge>{r.role ?? '—'}</Badge> },
            { key: 'title', header: 'Title', render: (r) => r.title ?? '—' },
          ]}
        />
      )}

      {modalOpen ? (
        <Modal
          title={editing ? `Edit: ${editing.name}` : 'Add staff member'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving || !form.name || !form.email}>
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
              <Field label="Name">
                <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Role">
                <select className={inputClass} value={form.role} onChange={(e) => set('role', e.target.value)}>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Title">
                <input className={inputClass} value={form.title} onChange={(e) => set('title', e.target.value)} />
              </Field>
            </div>
            <Field label="Avatar URL">
              <input
                className={inputClass}
                value={form.avatarUrl}
                onChange={(e) => set('avatarUrl', e.target.value)}
                placeholder="https://…"
              />
            </Field>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default StaffManagement;