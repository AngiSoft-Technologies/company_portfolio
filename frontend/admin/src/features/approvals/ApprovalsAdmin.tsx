import { useCallback, useEffect, useState } from 'react';
import { Button, Card, EmptyState, Field, PageHeader, Spinner, Table, inputClass } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';
import { useCan } from '@/lib/permissions';

interface ApprovalStep {
  permission: string;
  label?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  decidedById?: string | null;
  decidedAt?: string | null;
  note?: string | null;
  index?: number;
  isCurrent?: boolean;
  permissionLabel?: string;
  decidedBy?: { firstName?: string; lastName?: string; email?: string } | null;
}

interface ApprovalRow {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  amount?: string | number | null;
  currency?: string | null;
  status: string;
  requestedById: string;
  requester?: { firstName?: string; lastName?: string; email?: string } | null;
  steps?: ApprovalStep[];
  nextStepIndex?: number;
  isRequester?: boolean;
  canAct?: boolean;
  createdAt: string;
}

interface PermissionOption {
  key: string;
  display: string;
  group: string;
}

const ENTITY_TYPES = ['quote', 'invoice', 'expense', 'leave', 'payslip', 'booking', 'custom'];
const STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

const personName = (p?: { firstName?: string; lastName?: string; email?: string } | null) =>
  p ? [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || '—' : '—';

interface StepDraft {
  permission: string;
  label: string;
}

export default function ApprovalsAdmin() {
  const can = useCan();
  const canManage = can('approvals.manage');

  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [entityFilter, setEntityFilter] = useState('');
  const [mineOnly, setMineOnly] = useState(false);

  const [detail, setDetail] = useState<ApprovalRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [decisionNote, setDecisionNote] = useState('');
  const [busy, setBusy] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [permissions, setPermissions] = useState<PermissionOption[]>([]);
  const [form, setForm] = useState({
    entityType: 'custom',
    entityId: '',
    title: '',
    amount: '',
    currency: 'KES',
    steps: [{ permission: '', label: '' }] as StepDraft[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (entityFilter) params.set('entityType', entityFilter);
      if (mineOnly) params.set('mine', '1');
      const data = await apiFetch(`/api/approvals?${params.toString()}`);
      setRows(Array.isArray(data) ? (data as ApprovalRow[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, entityFilter, mineOnly]);

  useEffect(() => { void load(); }, [load]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const data = (await apiFetch(`/api/approvals/${id}`)) as ApprovalRow;
      setDetail(data);
      setDecisionNote('');
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const decide = async (decision: 'approved' | 'rejected') => {
    if (!detail) return;
    setBusy(true);
    try {
      await apiFetch(`/api/approvals/${detail.id}/decide`, {
        method: 'POST',
        body: { decision, note: decisionNote || null },
      });
      await openDetail(detail.id);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Decision failed');
    } finally {
      setBusy(false);
    }
  };

  const cancelRequest = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      await apiFetch(`/api/approvals/${detail.id}/cancel`, { method: 'POST' });
      await openDetail(detail.id);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed');
    } finally {
      setBusy(false);
    }
  };

  const openCreate = async () => {
    setForm({
      entityType: 'custom',
      entityId: '',
      title: '',
      amount: '',
      currency: 'KES',
      steps: [{ permission: '', label: '' }],
    });
    setCreateOpen(true);
    if (!permissions.length) {
      try {
        const data = await apiFetch('/api/approvals/permissions');
        setPermissions(Array.isArray(data) ? (data as PermissionOption[]) : []);
      } catch {
        setPermissions([]);
      }
    }
  };

  const submitCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/approvals', {
        method: 'POST',
        body: {
          entityType: form.entityType,
          entityId: form.entityId,
          title: form.title,
          amount: form.amount === '' ? null : Number(form.amount),
          currency: form.currency || null,
          steps: form.steps
            .filter((s) => s.permission)
            .map((s) => ({ permission: s.permission, label: s.label || null })),
        },
      });
      setCreateOpen(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create approval request');
    } finally {
      setBusy(false);
    }
  };

  const currentStep = detail?.steps?.find((s) => s.isCurrent);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        subtitle="Multi-step approval chains — sequential, permission-gated sign-off on quotes, invoices, expenses, leave, payslips and more."
        actions={canManage ? <Button onClick={() => void openCreate()}>New request</Button> : undefined}
      />

      {error && <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>}

      <Card>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <Field label="Status">
            <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Entity type">
            <select className={inputClass} value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
              <option value="">All</option>
              {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 pb-2 text-sm text-[var(--text-muted)]">
            <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
            Waiting on me
          </label>
        </div>

        {loading ? <Spinner /> : rows.length === 0 ? (
          <EmptyState title="No approval requests" />
        ) : (
          <Table
            columns={[
              { key: 'title', header: 'Request', render: (r: ApprovalRow) => (
                <button className="text-left font-medium text-[var(--color-accent)] hover:underline" onClick={() => void openDetail(r.id)}>
                  {r.title}
                </button>
              )},
              { key: 'entity', header: 'Entity', render: (r: ApprovalRow) => `${r.entityType} · ${r.entityId}` },
              { key: 'amount', header: 'Amount', render: (r: ApprovalRow) =>
                r.amount != null ? `${r.currency ?? ''} ${Number(r.amount).toLocaleString()}`.trim() : '—' },
              { key: 'requester', header: 'Requester', render: (r: ApprovalRow) => personName(r.requester) },
              { key: 'steps', header: 'Steps', render: (r: ApprovalRow) => {
                const steps = r.steps ?? [];
                const done = steps.filter((s) => s.status !== 'pending').length;
                return `${done}/${steps.length || '—'}`;
              } },
              { key: 'status', header: 'Status', render: (r: ApprovalRow) => <Badge>{r.status}</Badge> },
              { key: 'createdAt', header: 'Created', render: (r: ApprovalRow) => new Date(r.createdAt).toLocaleDateString() },
            ]}
            rows={rows}
          />
        )}
      </Card>

      {(detailLoading || detail) && (
      <Modal onClose={() => setDetail(null)} title={detail?.title ?? 'Approval request'} wide>
        {detailLoading || !detail ? <Spinner /> : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-[var(--text-muted)]">Entity:</span> {detail.entityType} · {detail.entityId}</div>
              <div><span className="text-[var(--text-muted)]">Requester:</span> {personName(detail.requester)}</div>
              {detail.amount != null && (
                <div><span className="text-[var(--text-muted)]">Amount:</span> {detail.currency} {Number(detail.amount).toLocaleString()}</div>
              )}
              <div><span className="text-[var(--text-muted)]">Status:</span> <Badge>{detail.status}</Badge></div>
            </div>

            <ol className="space-y-2">
              {(detail.steps ?? []).map((s, i) => (
                <li key={i} className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm ${s.isCurrent ? 'border-[var(--color-accent)]' : 'border-[var(--border)]'}`}>
                  <div>
                    <div className="font-medium">{i + 1}. {s.label || s.permissionLabel || s.permission}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      requires <code>{s.permission}</code>
                      {s.decidedBy ? ` · decided by ${personName(s.decidedBy)}` : ''}
                      {s.note ? ` · “${s.note}”` : ''}
                    </div>
                  </div>
                  <Badge>{s.status}</Badge>
                </li>
              ))}
            </ol>

            {detail.status === 'pending' && currentStep && (
              <div className="space-y-2">
                <Field label={detail.canAct ? `Your decision — step ${currentStep.index! + 1} requires ${currentStep.permissionLabel}` : `Waiting for ${currentStep.permissionLabel || currentStep.permission}`}>
                  <input
                    className={inputClass}
                    placeholder="Note (optional)"
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    disabled={!detail.canAct}
                  />
                </Field>
                {detail.canAct && (
                  <div className="flex gap-2">
                    <Button disabled={busy} onClick={() => void decide('approved')}>Approve step</Button>
                    <Button variant="danger" disabled={busy} onClick={() => void decide('rejected')}>Reject</Button>
                  </div>
                )}
              </div>
            )}

            {detail.status === 'pending' && (detail.isRequester || canManage) && (
              <Button variant="ghost" disabled={busy} onClick={() => void cancelRequest()}>Cancel request</Button>
            )}
          </div>
        )}
      </Modal>
      )}

      {createOpen && (
      <Modal onClose={() => setCreateOpen(false)} title="New approval request" wide>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Entity type">
              <select className={inputClass} value={form.entityType} onChange={(e) => setForm({ ...form, entityType: e.target.value })}>
                {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Entity ID">
              <input className={inputClass} value={form.entityId} onChange={(e) => setForm({ ...form, entityId: e.target.value })} placeholder="e.g. quote id" />
            </Field>
          </div>
          <Field label="Title">
            <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What needs approval?" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (optional)">
              <input className={inputClass} type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label="Currency">
              <input className={inputClass} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </Field>
          </div>

          <Field label="Approval steps (in order)">
            <div className="space-y-2">
              {form.steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    className={inputClass}
                    value={s.permission}
                    onChange={(e) => {
                      const steps = [...form.steps];
                      steps[i] = { ...steps[i], permission: e.target.value };
                      setForm({ ...form, steps });
                    }}
                  >
                    <option value="">Select permission…</option>
                    {permissions.map((p) => <option key={p.key} value={p.key}>{p.group}: {p.display}</option>)}
                  </select>
                  <input
                    className={inputClass}
                    placeholder="Label (optional)"
                    value={s.label}
                    onChange={(e) => {
                      const steps = [...form.steps];
                      steps[i] = { ...steps[i], label: e.target.value };
                      setForm({ ...form, steps });
                    }}
                  />
                  {form.steps.length > 1 && (
                    <Button variant="ghost" onClick={() => setForm({ ...form, steps: form.steps.filter((_, j) => j !== i) })}>×</Button>
                  )}
                </div>
              ))}
              {form.steps.length < 10 && (
                <Button variant="ghost" onClick={() => setForm({ ...form, steps: [...form.steps, { permission: '', label: '' }] })}>
                  + Add step
                </Button>
              )}
            </div>
          </Field>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={busy || !form.entityId || !form.title || form.steps.some((s) => !s.permission)}
              onClick={() => void submitCreate()}
            >
              Create request
            </Button>
          </div>
        </div>
      </Modal>
      )}
    </div>
  );
}
