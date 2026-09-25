import { useState } from 'react';
import { Button, EmptyState, PageHeader, Spinner, Table, Field, inputClass, useCrud, type CrudConfig } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';

export interface AccessRow {
  id: string;
  staffName?: string;
  permission?: string;
  granted?: boolean;
}

export function StaffAccess() {
  const { rows, loading, error, refresh, remove } = useCrud<AccessRow, CrudConfig<AccessRow>>({
    endpoint: '/staff-access',
    transform: (data: unknown) => {
      const list = Array.isArray(data)
        ? data
        : (data as Record<string, unknown>)?.data ?? (data as Record<string, unknown>)?.items ?? [];
      return (Array.isArray(list) ? list : []).map((r) => {
        const rec = r as Record<string, unknown>;
        return {
          id: String(rec.id ?? ''),
          staffName: rec.staffName ? String(rec.staffName) : rec.staff ? String(rec.staff) : undefined,
          permission: rec.permission ? String(rec.permission) : undefined,
          granted: Boolean(rec.granted),
        } as AccessRow;
      });
    },
  });

  const [busyId, setBusyId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ staffName: '', permission: '', granted: true });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const toggle = async (row: AccessRow) => {
    setBusyId(row.id);
    setToggleError(null);
    try {
      await apiFetch(`/api/staff-access/${encodeURIComponent(row.id)}`, {
        method: 'PUT',
        body: { granted: !row.granted },
      });
      await refresh();
    } catch (e) {
      setToggleError((e as Error).message || 'Failed to update access');
    } finally {
      setBusyId(null);
    }
  };

  const openCreate = () => {
    setForm({ staffName: '', permission: '', granted: true });
    setSaveError(null);
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await apiFetch('/api/staff-access', {
        method: 'POST',
        body: { staffName: form.staffName, permission: form.permission, granted: form.granted },
      });
      setModalOpen(false);
      await refresh();
    } catch (e) {
      setSaveError((e as Error).message || 'Failed to add access rule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Staff Access"
        subtitle="Grant or revoke permissions for team members."
        actions={<Button onClick={openCreate}>Add access</Button>}
      />

      {loading ? <Spinner /> : null}
      {!loading && (error || toggleError) ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {toggleError ?? error}
        </div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState title="No access rules yet" />
        </div>
      ) : (
        <Table<AccessRow>
          rows={rows}
          onDelete={(r) => void remove(r.id)}
          columns={[
            {
              key: 'staffName',
              header: 'Staff',
              render: (r) => <span className="font-medium">{r.staffName ?? '—'}</span>,
            },
            { key: 'permission', header: 'Permission', render: (r) => <Badge tone="blue">{r.permission ?? '—'}</Badge> },
            {
              key: 'granted',
              header: 'Granted',
              render: (r) =>
                r.granted ? <Badge tone="green">Granted</Badge> : <Badge tone="red">Revoked</Badge>,
            },
            {
              key: 'toggle',
              header: 'Toggle',
              render: (r) => (
                <button
                  onClick={() => void toggle(r)}
                  disabled={busyId === r.id}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                    r.granted
                      ? 'border border-red-200 text-red-600 hover:bg-red-50'
                      : 'border border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  {busyId === r.id ? 'Updating…' : r.granted ? 'Revoke' : 'Grant'}
                </button>
              ),
            },
          ]}
        />
      )}

      {modalOpen ? (
        <Modal
          title="Add access rule"
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void save()} disabled={saving || !form.staffName || !form.permission}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {saveError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saveError}</div>
            ) : null}
            <Field label="Staff name">
              <input
                className={inputClass}
                value={form.staffName}
                onChange={(e) => setForm((p) => ({ ...p, staffName: e.target.value }))}
              />
            </Field>
            <Field label="Permission">
              <input
                className={inputClass}
                value={form.permission}
                placeholder="e.g. manage_bookings"
                onChange={(e) => setForm((p) => ({ ...p, permission: e.target.value }))}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.granted}
                onChange={(e) => setForm((p) => ({ ...p, granted: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300"
              />
              Granted
            </label>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default StaffAccess;