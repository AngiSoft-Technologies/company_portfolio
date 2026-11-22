import { useState } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { useEffectiveAccess } from '@/lib/permissions';
import { toast } from '@angisoft/utils';
import { Button, Card, Field, PageHeader, Table } from '@/components';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';
import { formatDateTime, formatKsh } from '@/lib/format';
import { ErrorNotice, inputClass, listFrom, useResource, type ApiRow } from './shared';

/** Refunds, disputes and settlements — provider money-movement follow-ups. */
export default function RefundsDisputes() {
  const { can } = useEffectiveAccess();
  const refunds = useResource<ApiRow>('/admin/finance/refunds');
  const disputes = useResource<ApiRow>('/admin/finance/disputes');
  const settlements = useResource<ApiRow>('/admin/finance/settlements');
  const [busy, setBusy] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [disputeEdit, setDisputeEdit] = useState<ApiRow | null>(null);
  const [refundForm, setRefundForm] = useState({ paymentId: '', amount: '', currency: 'KES', reason: '', reference: '' });
  const [settlementForm, setSettlementForm] = useState({ provider: 'PAYHERO', financeAccountId: '', periodStart: '', periodEnd: '' });
  const [disputeForm, setDisputeForm] = useState({ status: '', reason: '' });

  const refundRows = listFrom(refunds.data, 'refunds');
  const disputeRows = listFrom(disputes.data, 'disputes');
  const settlementRows = listFrom(settlements.data, 'settlements');

  const createRefund = async () => {
    setBusy(true);
    try {
      await apiFetch('/admin/finance/refunds', {
        method: 'POST',
        body: {
          paymentId: refundForm.paymentId,
          amount: refundForm.amount ? Number(refundForm.amount) : undefined,
          currency: refundForm.currency || undefined,
          reason: refundForm.reason || undefined,
          reference: refundForm.reference || undefined,
        },
      });
      toast.success('Refund requested');
      setRefundOpen(false);
      setRefundForm({ paymentId: '', amount: '', currency: 'KES', reason: '', reference: '' });
      await refunds.reload();
    } catch (e) {
      toast.error((e as Error).message || 'Could not create refund');
    } finally {
      setBusy(false);
    }
  };

  const updateDispute = async () => {
    if (!disputeEdit) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/finance/disputes/${disputeEdit.id}`, {
        method: 'PATCH',
        body: { status: disputeForm.status || undefined, reason: disputeForm.reason || undefined },
      });
      toast.success('Dispute updated');
      setDisputeEdit(null);
      await disputes.reload();
    } catch (e) {
      toast.error((e as Error).message || 'Could not update dispute');
    } finally {
      setBusy(false);
    }
  };

  const createSettlement = async () => {
    setBusy(true);
    try {
      await apiFetch('/admin/finance/settlements', { method: 'POST', body: settlementForm });
      toast.success('Settlement recorded');
      setSettlementOpen(false);
      await settlements.reload();
    } catch (e) {
      toast.error((e as Error).message || 'Could not record settlement');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Refunds & Disputes"
        subtitle="Follow refunds through providers, manage chargeback disputes and record settlement batches."
        actions={<Button variant="outline" onClick={() => void Promise.all([refunds.reload(), disputes.reload(), settlements.reload()])}>Refresh</Button>}
      />

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Refunds</h2>
            <p className="text-xs text-[var(--text-muted)]">High-risk actions are permission gated and audited.</p>
          </div>
          <Button onClick={() => setRefundOpen(true)} disabled={!can('finance.payments.refund')}>New refund</Button>
        </div>
        <ErrorNotice error={refunds.error} onRetry={() => void refunds.reload()} />
        {refundRows.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No refunds recorded.</p> : (
          <Table<ApiRow>
            columns={[
              { key: 'reference', header: 'Reference', render: (row) => String(row.reference ?? row.id) },
              { key: 'payment', header: 'Payment', render: (row) => String(row.paymentId ?? '—') },
              { key: 'amount', header: 'Amount', render: (row) => formatKsh(row.amount) },
              { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.status ?? 'PENDING')}</Badge> },
              { key: 'createdAt', header: 'Created', render: (row) => formatDateTime(row.createdAt) },
            ]}
            rows={refundRows}
          />
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Disputes & chargebacks</h2>
            <Button variant="ghost" onClick={() => void disputes.reload()} disabled={disputes.loading}>Refresh</Button>
          </div>
          <ErrorNotice error={disputes.error} onRetry={() => void disputes.reload()} />
          {disputeRows.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No disputes.</p> : (
            <Table<ApiRow>
              columns={[
                { key: 'reference', header: 'Dispute', render: (row) => String(row.externalId ?? row.reference ?? row.id) },
                { key: 'provider', header: 'Provider', render: (row) => String(row.provider ?? '—') },
                { key: 'amount', header: 'Amount', render: (row) => formatKsh(row.amount) },
                { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.status ?? 'OPEN')}</Badge> },
                { key: 'actions', header: 'Actions', render: (row) => can('finance.disputes.manage') ? <Button variant="outline" onClick={() => {
                  setDisputeEdit(row);
                  setDisputeForm({ status: String(row.status ?? ''), reason: String(row.reason ?? '') });
                }}>Update</Button> : '—' },
              ]}
              rows={disputeRows}
            />
          )}
        </Card>

        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Settlements</h2>
            <Button variant="outline" onClick={() => setSettlementOpen(true)}>Record settlement</Button>
          </div>
          <ErrorNotice error={settlements.error} onRetry={() => void settlements.reload()} />
          {settlementRows.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No settlement batches.</p> : (
            <Table<ApiRow>
              columns={[
                { key: 'provider', header: 'Provider', render: (row) => String(row.provider ?? '—') },
                { key: 'reference', header: 'Reference', render: (row) => String(row.reference ?? row.id) },
                { key: 'amount', header: 'Amount', render: (row) => formatKsh(row.gross ?? row.amount) },
                { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.status ?? 'PENDING')}</Badge> },
                { key: 'date', header: 'Date', render: (row) => formatDateTime(row.settledAt ?? row.createdAt) },
              ]}
              rows={settlementRows}
            />
          )}
        </Card>
      </div>

      {refundOpen ? (
        <Modal
          title="Request refund"
          onClose={() => setRefundOpen(false)}
          footer={<><Button variant="outline" onClick={() => setRefundOpen(false)}>Cancel</Button><Button variant="danger" onClick={() => void createRefund()} disabled={busy || !refundForm.paymentId}>{busy ? 'Submitting…' : 'Request refund'}</Button></>}
        >
          <div className="grid gap-3">
            <Field label="Payment ID"><input className={inputClass} value={refundForm.paymentId} onChange={(event) => setRefundForm({ ...refundForm, paymentId: event.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Amount (blank = full)"><input type="number" min="0" step="0.01" className={inputClass} value={refundForm.amount} onChange={(event) => setRefundForm({ ...refundForm, amount: event.target.value })} /></Field>
              <Field label="Currency"><input className={inputClass} value={refundForm.currency} onChange={(event) => setRefundForm({ ...refundForm, currency: event.target.value })} /></Field>
            </div>
            <Field label="Reason"><textarea className={inputClass + ' min-h-[80px]'} value={refundForm.reason} onChange={(event) => setRefundForm({ ...refundForm, reason: event.target.value })} /></Field>
            <Field label="Reference (idempotency)"><input className={inputClass} value={refundForm.reference} onChange={(event) => setRefundForm({ ...refundForm, reference: event.target.value })} /></Field>
          </div>
        </Modal>
      ) : null}

      {disputeEdit ? (
        <Modal
          title="Update dispute"
          onClose={() => setDisputeEdit(null)}
          footer={<><Button variant="outline" onClick={() => setDisputeEdit(null)}>Cancel</Button><Button onClick={() => void updateDispute()} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}
        >
          <div className="grid gap-3">
            <Field label="Status"><input className={inputClass} value={disputeForm.status} onChange={(event) => setDisputeForm({ ...disputeForm, status: event.target.value })} placeholder="UNDER_REVIEW, WON, LOST…" /></Field>
            <Field label="Reason / evidence note"><textarea className={inputClass + ' min-h-[90px]'} value={disputeForm.reason} onChange={(event) => setDisputeForm({ ...disputeForm, reason: event.target.value })} /></Field>
          </div>
        </Modal>
      ) : null}

      {settlementOpen ? (
        <Modal
          title="Record settlement"
          onClose={() => setSettlementOpen(false)}
          footer={<><Button variant="outline" onClick={() => setSettlementOpen(false)}>Cancel</Button><Button onClick={() => void createSettlement()} disabled={busy || !settlementForm.provider}>{busy ? 'Saving…' : 'Save settlement'}</Button></>}
        >
          <div className="grid gap-3">
            <Field label="Provider"><input className={inputClass} value={settlementForm.provider} onChange={(event) => setSettlementForm({ ...settlementForm, provider: event.target.value })} /></Field>
            <Field label="Finance account ID"><input className={inputClass} value={settlementForm.financeAccountId} onChange={(event) => setSettlementForm({ ...settlementForm, financeAccountId: event.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Period start"><input type="date" className={inputClass} value={settlementForm.periodStart} onChange={(event) => setSettlementForm({ ...settlementForm, periodStart: event.target.value })} /></Field>
              <Field label="Period end"><input type="date" className={inputClass} value={settlementForm.periodEnd} onChange={(event) => setSettlementForm({ ...settlementForm, periodEnd: event.target.value })} /></Field>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
