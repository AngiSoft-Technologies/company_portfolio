import { useCallback, useEffect, useState } from 'react';
import { Button, Card, EmptyState, Field, PageHeader, Spinner, Table, inputClass } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';

interface LeaveRow {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  employee?: { id: string; firstName?: string; lastName?: string; email?: string } | null;
  reviewNote: string | null;
  createdAt: string;
}

const TYPES = ['annual', 'sick', 'compassionate', 'unpaid', 'other'];
const EMPTY = { type: 'annual', startDate: '', endDate: '', reason: '' };

const personName = (p?: { firstName?: string; lastName?: string; email?: string } | null) =>
  p ? [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || '—' : '—';

const daysBetween = (a: string, b: string) =>
  Math.max(0, Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1);

export function LeaveRequestsAdmin() {
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (mineOnly) params.set('mine', 'true');
      const qs = params.toString() ? `?${params}` : '';
      const data = await apiFetch(`/api/leave-requests${qs}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, mineOnly]);

  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/leave-requests', {
        method: 'POST',
        body: { ...form, reason: form.reason || null },
      });
      setModalOpen(false);
      setForm({ ...EMPTY });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  const act = async (id: string, action: string, body?: unknown) => {
    setBusy(true);
    try {
      await apiFetch(`/api/leave-requests/${id}/${action}`, { method: 'POST', body });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setBusy(false);
    }
  };

  const review = async (r: LeaveRow, decision: 'approved' | 'rejected') => {
    const note = window.prompt(`Review note for ${personName(r.employee)}'s leave (optional):`) ?? undefined;
    await act(r.id, 'review', { decision, note: note || null });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leave Requests"
        subtitle="Staff leave approvals and balances overview."
        actions={
          <div className="flex gap-2">
            <label className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
              <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} /> Mine only
            </label>
            <select className={inputClass + ' w-auto'} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {['pending', 'approved', 'rejected', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Button onClick={() => setModalOpen(true)}>Request leave</Button>
          </div>
        }
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Card className="p-4">
        {loading ? <Spinner /> : rows.length === 0 ? <EmptyState title="No leave requests" /> : (
          <Table<LeaveRow>
            rows={rows}
            columns={[
              { key: 'employee', header: 'Employee', render: (r) => (
                <div>
                  <div className="font-medium">{personName(r.employee)}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{r.employee?.email ?? ''}</div>
                </div>
              )},
              { key: 'type', header: 'Type', render: (r) => <Badge tone="blue">{r.type}</Badge> },
              { key: 'dates', header: 'Dates', render: (r) => (
                <span>{new Date(r.startDate).toLocaleDateString()} → {new Date(r.endDate).toLocaleDateString()}
                  <span className="ml-1 text-xs text-[var(--text-muted)]">({daysBetween(r.startDate, r.endDate)}d)</span>
                </span>
              )},
              { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status}>{r.status}</Badge> },
              { key: 'reviewNote', header: 'Note', render: (r) => r.reviewNote ? <span className="line-clamp-1 max-w-40 text-xs">{r.reviewNote}</span> : '—' },
              { key: 'actions', header: '', render: (r) => (
                <div className="flex flex-wrap gap-1.5">
                  {r.status === 'pending' && (
                    <>
                      <Button variant="outline" disabled={busy} onClick={() => void review(r, 'approved')}>Approve</Button>
                      <Button variant="danger" disabled={busy} onClick={() => void review(r, 'rejected')}>Reject</Button>
                    </>
                  )}
                  {['pending', 'approved'].includes(r.status) && (
                    <Button variant="ghost" disabled={busy} onClick={() => void act(r.id, 'cancel')}>Cancel</Button>
                  )}
                </div>
              ) },
            ]}
          />
        )}
      </Card>

      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)} title="Request leave" footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void submit()} disabled={busy || !form.startDate || !form.endDate}>{busy ? 'Submitting…' : 'Submit'}</Button>
          </>
        }>
          <div className="space-y-3">
            <Field label="Type">
              <select className={inputClass} value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Start date"><input className={inputClass} type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} /></Field>
              <Field label="End date"><input className={inputClass} type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} /></Field>
            </div>
            {form.startDate && form.endDate && (
              <p className="text-sm text-[var(--text-secondary)]">{daysBetween(form.startDate, form.endDate)} day(s) requested</p>
            )}
            <Field label="Reason"><textarea className={inputClass} rows={3} value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default LeaveRequestsAdmin;
