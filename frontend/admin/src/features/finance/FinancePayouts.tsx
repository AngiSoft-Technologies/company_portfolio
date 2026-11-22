import { useState } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { useEffectiveAccess } from '@/lib/permissions';
import { toast } from '@angisoft/utils';
import { Button, Card, Field, PageHeader, Table, useCrud } from '@/components';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';
import { formatDateTime, formatKsh } from '@/lib/format';
import { inputClass, listFrom, type ApiRow } from './shared';

const blank = { provider: 'PAYHERO', amount: '', currency: 'KES', channel: 'B2C', phoneNumber: '', accountNumber: '', networkCode: '', reference: '' };

/** Payout requests with a two-person approval workflow and beneficiary registry. */
export default function FinancePayouts() {
  const { can } = useEffectiveAccess();
  const payouts = useCrud<ApiRow>({
    endpoint: '/admin/finance/payouts',
    transform: (data) => listFrom(data, 'payouts'),
  });
  const beneficiaries = useCrud<ApiRow>({
    endpoint: '/admin/finance/beneficiaries',
    transform: (data) => listFrom(data, 'beneficiaries'),
  });
  const [form, setForm] = useState({ ...blank });
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState<{ row: ApiRow; action: 'approve' | 'reject' } | null>(null);
  const [reason, setReason] = useState('');
  const [beneficiaryOpen, setBeneficiaryOpen] = useState(false);
  const [editingBeneficiaryId, setEditingBeneficiaryId] = useState<string | null>(null);
  const [beneficiaryForm, setBeneficiaryForm] = useState({ name: '', accountNumber: '', phoneNumber: '', provider: 'MPESA' });

  const create = async () => {
    setBusy(true);
    try {
      await apiFetch('/admin/finance/payouts', {
        method: 'POST',
        body: {
          ...form,
          amount: Number(form.amount),
          phoneNumber: form.phoneNumber || undefined,
          accountNumber: form.accountNumber || undefined,
          networkCode: form.networkCode || undefined,
          reference: form.reference || undefined,
        },
      });
      toast.success('Payout request created — awaiting approval');
      setForm({ ...blank });
      await payouts.refresh();
    } catch (e) {
      toast.error((e as Error).message || 'Could not create payout');
    } finally {
      setBusy(false);
    }
  };

  const decide = async () => {
    if (!decision) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/finance/payouts/${decision.row.id}/${decision.action}`, {
        method: 'POST',
        body: decision.action === 'reject' ? { reason } : {},
      });
      toast.success(decision.action === 'approve' ? 'Payout approved' : 'Payout rejected');
      setDecision(null);
      setReason('');
      await payouts.refresh();
    } catch (e) {
      toast.error((e as Error).message || 'Could not update payout');
    } finally {
      setBusy(false);
    }
  };

  const addBeneficiary = async () => {
    setBusy(true);
    try {
      await apiFetch(editingBeneficiaryId ? `/admin/finance/beneficiaries/${editingBeneficiaryId}` : '/admin/finance/beneficiaries', {
        method: editingBeneficiaryId ? 'PATCH' : 'POST',
        body: beneficiaryForm,
      });
      toast.success('Beneficiary saved');
      setBeneficiaryOpen(false);
      setEditingBeneficiaryId(null);
      setBeneficiaryForm({ name: '', accountNumber: '', phoneNumber: '', provider: 'MPESA' });
      await beneficiaries.refresh();
    } catch (e) {
      toast.error((e as Error).message || 'Could not save beneficiary');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payouts"
        subtitle="Request outbound payments, review approvals and manage beneficiaries."
        actions={<><Button variant="outline" onClick={() => void payouts.refresh()} disabled={payouts.loading}>Refresh</Button><Button variant="outline" onClick={() => { setEditingBeneficiaryId(null); setBeneficiaryForm({ name: '', accountNumber: '', phoneNumber: '', provider: 'MPESA' }); setBeneficiaryOpen(true); }}>Add beneficiary</Button></>}
      />

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Card>
          <h2 className="mb-3 font-semibold">New payout request</h2>
          <div className="grid gap-3">
            <Field label="Provider"><input className={inputClass} value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Amount"><input type="number" min="1" step="0.01" className={inputClass} value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></Field>
              <Field label="Currency"><input className={inputClass} value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} /></Field>
            </div>
            <Field label="Channel"><input className={inputClass} value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })} placeholder="B2C, B2B, PAYPAL…" /></Field>
            <Field label="Phone number"><input className={inputClass} value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Account number"><input className={inputClass} value={form.accountNumber} onChange={(event) => setForm({ ...form, accountNumber: event.target.value })} /></Field>
              <Field label="Network code"><input className={inputClass} value={form.networkCode} onChange={(event) => setForm({ ...form, networkCode: event.target.value })} /></Field>
            </div>
            <Field label="Reference (idempotency)"><input className={inputClass} value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} /></Field>
          </div>
          <Button className="mt-3" onClick={() => void create()} disabled={busy || !form.amount || !form.channel || !can('finance.payouts.create')}>Submit for approval</Button>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Payout requests</h2>
          {payouts.error ? <p className="mb-2 text-sm text-red-600">{payouts.error}</p> : null}
          <Table<ApiRow>
            columns={[
              { key: 'reference', header: 'Reference', render: (row) => <span className="font-mono text-xs">{String(row.reference ?? row.id)}</span> },
              { key: 'provider', header: 'Provider', render: (row) => String(row.provider ?? '—') },
              { key: 'channel', header: 'Channel', render: (row) => String(row.channel ?? '—') },
              { key: 'amount', header: 'Amount', render: (row) => formatKsh(row.amount) },
              { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.status ?? '—')}</Badge> },
              { key: 'createdAt', header: 'Created', render: (row) => formatDateTime(row.createdAt) },
              { key: 'actions', header: 'Approval', render: (row) => can('finance.payouts.approve') && String(row.status) === 'PENDING_APPROVAL' ? (
                <span className="flex gap-2">
                  <Button variant="outline" onClick={() => setDecision({ row, action: 'approve' })}>Approve</Button>
                  <Button variant="danger" onClick={() => setDecision({ row, action: 'reject' })}>Reject</Button>
                </span>
              ) : '—' },
            ]}
            rows={payouts.rows}
          />
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Beneficiaries</h2>
        <Table<ApiRow>
          columns={[
            { key: 'name', header: 'Name', render: (row) => String(row.name ?? '—') },
            { key: 'provider', header: 'Provider', render: (row) => String(row.provider ?? '—') },
            { key: 'account', header: 'Account', render: (row) => row.accountNumber ? <span className="font-mono text-xs">••••{String(row.accountNumber).slice(-4)}</span> : String(row.phoneNumber ?? '—') },
            { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.status ?? 'ACTIVE')}</Badge> },
          ]}
          rows={beneficiaries.rows}
          onEdit={can('finance.payouts.create') ? (row) => {
            setEditingBeneficiaryId(String(row.id));
            setBeneficiaryForm({
              name: String(row.name ?? ''),
              accountNumber: String(row.accountNumber ?? ''),
              phoneNumber: String(row.phoneNumber ?? ''),
              provider: String(row.provider ?? 'MPESA'),
            });
            setBeneficiaryOpen(true);
          } : undefined}
          onDelete={can('finance.payouts.create') ? (row) => { void beneficiaries.remove(String(row.id)); } : undefined}
        />
      </Card>

      {decision ? (
        <Modal
          title={decision.action === 'approve' ? 'Approve payout' : 'Reject payout'}
          onClose={() => setDecision(null)}
          footer={<><Button variant="outline" onClick={() => setDecision(null)}>Cancel</Button><Button variant={decision.action === 'reject' ? 'danger' : 'primary'} onClick={() => void decide()} disabled={busy}>{decision.action === 'approve' ? 'Approve' : 'Reject'}</Button></>}
        >
          <p className="text-sm text-[var(--text-secondary)]">
            {String(decision.row.reference ?? decision.row.id)} · {formatKsh(decision.row.amount)} to {String(decision.row.channel ?? '—')}
          </p>
          {decision.action === 'reject' ? (
            <div className="mt-3"><Field label="Reason"><textarea className={inputClass + ' min-h-[80px]'} value={reason} onChange={(event) => setReason(event.target.value)} /></Field></div>
          ) : null}
          <p className="mt-3 text-xs text-[var(--text-muted)]">This action is recorded in the finance audit log.</p>
        </Modal>
      ) : null}

      {beneficiaryOpen ? (
        <Modal
          title={editingBeneficiaryId ? 'Edit beneficiary' : 'Add beneficiary'}
          onClose={() => setBeneficiaryOpen(false)}
          footer={<><Button variant="outline" onClick={() => setBeneficiaryOpen(false)}>Cancel</Button><Button onClick={() => void addBeneficiary()} disabled={busy || !beneficiaryForm.name}>{busy ? 'Saving…' : 'Save beneficiary'}</Button></>}
        >
          <div className="grid gap-3">
            <Field label="Name"><input className={inputClass} value={beneficiaryForm.name} onChange={(event) => setBeneficiaryForm({ ...beneficiaryForm, name: event.target.value })} /></Field>
            <Field label="Provider"><input className={inputClass} value={beneficiaryForm.provider} onChange={(event) => setBeneficiaryForm({ ...beneficiaryForm, provider: event.target.value })} /></Field>
            <Field label="Account number"><input className={inputClass} value={beneficiaryForm.accountNumber} onChange={(event) => setBeneficiaryForm({ ...beneficiaryForm, accountNumber: event.target.value })} /></Field>
            <Field label="Phone number"><input className={inputClass} value={beneficiaryForm.phoneNumber} onChange={(event) => setBeneficiaryForm({ ...beneficiaryForm, phoneNumber: event.target.value })} /></Field>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
