import { useState } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { useEffectiveAccess } from '@/lib/permissions';
import { toast } from '@angisoft/utils';
import { Button, Card, Field, PageHeader, Table } from '@/components';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';
import { formatDateTime, formatKsh } from '@/lib/format';
import { ErrorNotice, inputClass, listFrom, useResource, type ApiRow } from './shared';

/** Reconciliation runs, read-only provider review aids and exception resolution. */
export default function FinanceReconciliation() {
  const { can } = useEffectiveAccess();
  const runs = useResource<ApiRow>('/admin/finance/reconciliation/runs');
  const payheroReview = useResource<ApiRow>('/admin/finance/reconciliation/payhero/review');
  const c2bReview = useResource<ApiRow>('/admin/finance/reconciliation/c2b/review');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const items = useResource<ApiRow>(selectedId ? `/admin/finance/reconciliation/runs/${selectedId}/items` : null);
  const [form, setForm] = useState({ provider: 'PAYHERO', financeAccountId: '', periodStart: '', periodEnd: '' });
  const [busy, setBusy] = useState(false);
  const [resolving, setResolving] = useState<ApiRow | null>(null);
  const [resolution, setResolution] = useState('MARKED_MANUAL');
  const [note, setNote] = useState('');

  const runRows = listFrom(runs.data, 'runs');
  const itemRows = listFrom(items.data, 'items', 'exceptions');
  const payheroRows = listFrom(payheroReview.data, 'suggestions');
  const c2bRows = listFrom(c2bReview.data, 'suggestions');
  const selectedRun = runRows.find((row) => String(row.id) === selectedId) ?? null;

  const iso = (value: string) => (value ? new Date(value).toISOString() : undefined);
  const startRun = async () => {
    setBusy(true);
    try {
      await apiFetch('/admin/finance/reconciliation/runs', {
        method: 'POST',
        body: {
          provider: form.provider,
          financeAccountId: form.financeAccountId || undefined,
          periodStart: iso(form.periodStart),
          periodEnd: iso(form.periodEnd),
        },
      });
      toast.success('Reconciliation run started');
      await runs.reload();
    } catch (e) {
      toast.error((e as Error).message || 'Could not start run');
    } finally {
      setBusy(false);
    }
  };

  const resolve = async () => {
    if (!resolving) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/finance/reconciliation/items/${resolving.id}/resolve`, {
        method: 'POST',
        body: { resolution, note },
      });
      toast.success('Exception resolved');
      setResolving(null);
      setNote('');
      await Promise.all([items.reload(), runs.reload()]);
    } catch (e) {
      toast.error((e as Error).message || 'Could not resolve exception');
    } finally {
      setBusy(false);
    }
  };

  const summaryRows = selectedRun?.summary && typeof selectedRun.summary === 'object'
    ? Object.entries(selectedRun.summary as ApiRow).filter(([, value]) => typeof value !== 'object')
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reconciliation"
        subtitle="Compare provider payments with the internal ledger and resolve unmatched or mismatched entries."
        actions={<Button variant="outline" onClick={() => void Promise.all([runs.reload(), payheroReview.reload(), c2bReview.reload()])} disabled={runs.loading}>Refresh</Button>}
      />

      <Card>
        <h2 className="mb-3 font-semibold">Start a run</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Provider"><input className={inputClass} value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })} /></Field>
          <Field label="Finance account ID"><input className={inputClass} value={form.financeAccountId} onChange={(event) => setForm({ ...form, financeAccountId: event.target.value })} /></Field>
          <Field label="Period start"><input type="datetime-local" className={inputClass} value={form.periodStart} onChange={(event) => setForm({ ...form, periodStart: event.target.value })} /></Field>
          <Field label="Period end"><input type="datetime-local" className={inputClass} value={form.periodEnd} onChange={(event) => setForm({ ...form, periodEnd: event.target.value })} /></Field>
          <div className="flex items-end"><Button className="w-full" onClick={() => void startRun()} disabled={busy || !form.provider || !can('finance.reconciliation.run')}>Run reconciliation</Button></div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Card>
          <h2 className="mb-3 font-semibold">Runs</h2>
          <ErrorNotice error={runs.error} onRetry={() => void runs.reload()} />
          {runs.loading ? <p className="text-sm text-[var(--text-muted)]">Loading…</p> : null}
          {!runs.loading && runRows.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No reconciliation runs yet.</p> : null}
          <div className="space-y-2">
            {runRows.map((run) => (
              <button
                key={String(run.id)}
                type="button"
                onClick={() => setSelectedId(String(run.id))}
                className={`w-full rounded-lg border px-3 py-2 text-left ${selectedId === String(run.id) ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[var(--border)]'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{String(run.provider ?? '—')}</span>
                  <Badge>{String(run.status ?? '—')}</Badge>
                </div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">{formatDateTime(run.createdAt)} · {String(run.id).slice(0, 8)}</div>
              </button>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-semibold">Run summary</h2>
            {!selectedRun ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">Select a run to inspect exceptions.</p> : null}
            {selectedRun ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge>{String(selectedRun.status ?? '—')}</Badge>
                  <span className="text-xs text-[var(--text-muted)]">{formatDateTime(selectedRun.completedAt ?? selectedRun.createdAt)}</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {summaryRows.map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-[var(--border)] p-2">
                      <div className="text-[11px] uppercase text-[var(--text-muted)]">{key.replace(/([A-Z])/g, ' $1')}</div>
                      <div className="text-sm font-semibold">{String(value)}</div>
                    </div>
                  ))}
                </div>
                {selectedRun.error ? <p className="mt-3 text-sm text-red-600">{String(selectedRun.error)}</p> : null}
              </>
            ) : null}
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">Exceptions</h2>
            <ErrorNotice error={items.error} onRetry={() => void items.reload()} />
            {selectedId && items.loading ? <p className="text-sm text-[var(--text-muted)]">Loading exceptions…</p> : null}
            {selectedId && !items.loading && itemRows.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No exceptions recorded for this run.</p> : null}
            {itemRows.length > 0 ? (
              <Table<ApiRow>
                columns={[
                  { key: 'type', header: 'Type', render: (row) => String(row.type ?? row.reason ?? 'MISMATCH') },
                  { key: 'reference', header: 'Reference', render: (row) => String(row.externalRef ?? row.reference ?? row.id) },
                  { key: 'amount', header: 'Amount', render: (row) => formatKsh(row.amount ?? row.difference) },
                  { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.status ?? 'OPEN')}</Badge> },
                  { key: 'resolve', header: 'Action', render: (row) => can('finance.reconciliation.resolve') ? (
                    String(row.status) === 'RESOLVED' ? 'Resolved' : <Button variant="outline" onClick={() => setResolving(row)}>Resolve</Button>
                  ) : '—' },
                ]}
                rows={itemRows}
              />
            ) : null}
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">PayHero callback review</h2>
          <p className="mt-1 mb-3 text-xs text-[var(--text-muted)]">
            Read-only cross-check of PayHero callbacks against recorded payments. Suggestions only — nothing is settled or written.
          </p>
          <ErrorNotice error={payheroReview.error} onRetry={() => void payheroReview.reload()} />
          {payheroReview.loading ? <p className="text-sm text-[var(--text-muted)]">Loading…</p> : null}
          {!payheroReview.loading && payheroRows.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No PayHero events in the reviewed window.</p> : null}
          {payheroRows.length > 0 ? (
            <Table<ApiRow>
              columns={[
                { key: 'status', header: 'Finding', render: (row) => <Badge>{String(row.status ?? '—')}</Badge> },
                { key: 'reference', header: 'Reference', render: (row) => String(row.checkoutRequestId ?? row.externalReference ?? row.payment?.providerId ?? '—') },
                { key: 'amount', header: 'Amount', render: (row) => (row.amount === null || row.amount === undefined ? '—' : formatKsh(row.amount)) },
                { key: 'matchedOn', header: 'Matched by', render: (row) => String(row.matchedOn ?? '—') },
                { key: 'reasons', header: 'Note', render: (row) => <span className="text-xs text-[var(--text-muted)]">{Array.isArray(row.reasons) ? String(row.reasons[0] ?? '') : ''}</span> },
              ]}
              rows={payheroRows}
            />
          ) : null}
          <p className="mt-3 text-xs text-[var(--text-muted)]">PayHero settles in KES. Original currency and amount are preserved for reconciliation.</p>
        </Card>

        <Card>
          <h2 className="font-semibold">Daraja C2B review</h2>
          <p className="mt-1 mb-3 text-xs text-[var(--text-muted)]">
            Read-only candidate invoice matches for C2B confirmations (BillRefNumber). Amount mismatches are signals for review, never automatic settlement.
          </p>
          <ErrorNotice error={c2bReview.error} onRetry={() => void c2bReview.reload()} />
          {c2bReview.loading ? <p className="text-sm text-[var(--text-muted)]">Loading…</p> : null}
          {!c2bReview.loading && c2bRows.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No C2B confirmations in the reviewed window.</p> : null}
          {c2bRows.length > 0 ? (
            <Table<ApiRow>
              columns={[
                { key: 'status', header: 'Finding', render: (row) => <Badge>{String(row.status ?? '—')}</Badge> },
                { key: 'transId', header: 'Trans ID', render: (row) => String(row.transId ?? '—') },
                { key: 'ref', header: 'BillRefNumber', render: (row) => String(row.billRefNumber ?? '—') },
                { key: 'invoice', header: 'Invoice', render: (row) => String(row.invoice?.number ?? '—') },
                { key: 'reasons', header: 'Note', render: (row) => <span className="text-xs text-[var(--text-muted)]">{Array.isArray(row.reasons) ? String(row.reasons[0] ?? '') : ''}</span> },
              ]}
              rows={c2bRows}
            />
          ) : null}
          <p className="mt-3 text-xs text-[var(--text-muted)]">Reference matching is advisory only. A human reviewer decides any action.</p>
        </Card>
      </div>

      {resolving ? (
        <Modal
          title="Resolve exception"
          onClose={() => setResolving(null)}
          footer={<><Button variant="outline" onClick={() => setResolving(null)}>Cancel</Button><Button onClick={() => void resolve()} disabled={busy || !resolution}>{busy ? 'Saving…' : 'Resolve'}</Button></>}
        >
          <div className="grid gap-3">
            <Field label="Resolution">
              <select className={inputClass} value={resolution} onChange={(event) => setResolution(event.target.value)}>
                {['MARKED_MANUAL', 'ADJUSTED', 'PROVIDER_CORRECTION', 'WRITE_OFF', 'IGNORED'].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </Field>
            <Field label="Note"><textarea className={inputClass + ' min-h-[90px]'} value={note} onChange={(event) => setNote(event.target.value)} /></Field>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
