import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { toast } from '@angisoft/utils';
import { Button, Card, EmptyState, PageHeader, Spinner } from '@/components';
import { formatKsh } from '@/lib/format';

type MoneyType = {
  id: string; flow: string; label: string; provider: string; region: string;
  available: boolean; reason?: string; description: string; requires?: string[];
};
type Catalogue = { flows: string[]; byFlow: Record<string, number>; available: number; total: number; types: MoneyType[] };

const inputClass = 'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm';

/** Staff console for every outbound money movement across PayPal, PayHero and Daraja. */
export default function MoneyMovementAdmin() {
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const payoutTypes = (catalogue?.types || []).filter((t) => ['B2C', 'B2B'].includes(t.flow));
  const [payout, setPayout] = useState({ type: '', amount: '', phone: '', receiver: '', recipientType: 'EMAIL', shortcode: '', accountNumber: '', networkCode: '', commandId: '', remarks: '', reference: '' });
  const [refund, setRefund] = useState({ captureId: '', amount: '', currency: '', reference: '' });
  const [reversal, setReversal] = useState({ transactionId: '', amount: '', remarks: '', reference: '' });
  const statusTypes = (catalogue?.types || []).filter((t) => t.flow === 'STATUS');
  const [statusType, setStatusType] = useState('PAYHERO_STATUS');
  const [statusQuery, setStatusQuery] = useState({ reference: '', transactionId: '', batchId: '', itemId: '', refundId: '', walletType: 'payment_wallet' });
  const [statusResult, setStatusResult] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        apiFetch('/admin/money/types') as Promise<Catalogue>,
        apiFetch('/admin/money/payouts?limit=25').catch(() => ({ payouts: [] })) as Promise<{ payouts: any[] }>,
      ]);
      setCatalogue(c);
      setPayouts(Array.isArray(p?.payouts) ? p.payouts : []);
      setPayout((v) => ({ ...v, type: v.type || (c.types || []).find((t) => ['B2C', 'B2B'].includes(t.flow) && t.available)?.id || '' }));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load money movement catalogue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const submit = async (path: string, body: unknown, success: string, onDone?: (r: any) => void) => {
    setBusy(true);
    try {
      const res = await apiFetch(path, { method: 'POST', body });
      toast.success(success);
      onDone?.(res);
      await load();
      return res;
    } catch (e: any) {
      toast.error(e?.message || 'Request failed');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const doPayout = () => submit('/admin/money/payout', {
    ...payout,
    amount: Number(payout.amount),
  }, 'Payout initiated');

  const doStatus = async () => {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      Object.entries(statusQuery).forEach(([k, v]) => { if (v) params.set(k, String(v)); });
      const res = await apiFetch(`/admin/money/status/${statusType}?${params.toString()}`);
      setStatusResult(res);
    } catch (e: any) {
      setStatusResult({ error: e?.message || 'Status lookup failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Money Movement"
        subtitle="C2B, B2C, B2B, refunds, reversals and status across PayPal, PayHero and Daraja — Kenya and international."
        actions={<Button variant="outline" onClick={() => void load()} disabled={loading || busy}>Refresh</Button>}
      />

      {loading ? <Spinner /> : null}

      {catalogue ? (
        <Card>
          <h3 className="mb-2 font-semibold">Transaction catalogue</h3>
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            {catalogue.available} of {catalogue.total} transaction types are available on this deployment.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {catalogue.flows.map((flow) => (
              <div key={flow} className="rounded-lg border border-[var(--border)] p-3">
                <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{flow}</div>
                <div className="text-xl font-bold">{catalogue.byFlow[flow] || 0}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[var(--text-muted)]"><th className="py-2">Type</th><th>Flow</th><th>Provider</th><th>Region</th><th>Status</th></tr></thead>
              <tbody>
                {catalogue.types.map((t) => (
                  <tr key={t.id} className="border-t border-[var(--border)]" title={t.description}>
                    <td className="py-2 font-medium">{t.label}</td>
                    <td>{t.flow}</td>
                    <td>{t.provider}</td>
                    <td>{t.region}</td>
                    <td>{t.available ? <span className="text-green-600">Available</span> : <span className="text-amber-600" title={t.reason}>Not configured</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">Send money (B2C / B2B)</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <select className={inputClass} value={payout.type} onChange={(e) => setPayout({ ...payout, type: e.target.value })}>
              <option value="">Select a payout type…</option>
              {payoutTypes.map((t) => <option key={t.id} value={t.id} disabled={!t.available}>{t.label}{t.available ? '' : ' (not configured)'}</option>)}
            </select>
            <input className={inputClass} type="number" min="1" step="0.01" placeholder="Amount" value={payout.amount} onChange={(e) => setPayout({ ...payout, amount: e.target.value })} />
            <input className={inputClass} placeholder="Phone (07xxxxxxxx)" value={payout.phone} onChange={(e) => setPayout({ ...payout, phone: e.target.value })} />
            <input className={inputClass} placeholder="Recipient / PayPal receiver" value={payout.receiver} onChange={(e) => setPayout({ ...payout, receiver: e.target.value })} />
            <select className={inputClass} value={payout.recipientType} onChange={(e) => setPayout({ ...payout, recipientType: e.target.value })}>
              {['EMAIL', 'PHONE', 'PAYPAL_ACCOUNT_ID'].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <input className={inputClass} placeholder="Business shortcode / account" value={payout.shortcode || payout.accountNumber} onChange={(e) => setPayout({ ...payout, shortcode: e.target.value, accountNumber: e.target.value })} />
            <input className={inputClass} placeholder="Network code (optional)" value={payout.networkCode} onChange={(e) => setPayout({ ...payout, networkCode: e.target.value })} />
            <input className={inputClass} placeholder="Command ID (optional)" value={payout.commandId} onChange={(e) => setPayout({ ...payout, commandId: e.target.value })} />
            <input className={inputClass} placeholder="Reference (idempotency — optional)" value={payout.reference} onChange={(e) => setPayout({ ...payout, reference: e.target.value })} />
            <input className={inputClass} placeholder="Remarks" value={payout.remarks} onChange={(e) => setPayout({ ...payout, remarks: e.target.value })} />
          </div>
          <Button className="mt-3" onClick={() => void doPayout()} disabled={busy || !payout.type || !payout.amount}>Send payout</Button>
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="mb-3 font-semibold">Refund a PayPal capture</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={inputClass} placeholder="Capture ID" value={refund.captureId} onChange={(e) => setRefund({ ...refund, captureId: e.target.value })} />
              <input className={inputClass} type="number" min="0" step="0.01" placeholder="Amount (blank = full)" value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} />
              <input className={inputClass} placeholder="Currency (USD)" value={refund.currency} onChange={(e) => setRefund({ ...refund, currency: e.target.value })} />
              <input className={inputClass} placeholder="Reference (optional)" value={refund.reference} onChange={(e) => setRefund({ ...refund, reference: e.target.value })} />
            </div>
            <Button className="mt-3" onClick={() => void submit('/admin/money/refund', {
              captureId: refund.captureId,
              amount: refund.amount ? Number(refund.amount) : undefined,
              currency: refund.currency || undefined,
              reference: refund.reference || undefined,
            }, 'Refund requested')} disabled={busy || !refund.captureId}>Issue refund</Button>
          </Card>

          <Card>
            <h3 className="mb-3 font-semibold">Reverse an M-Pesa transaction</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={inputClass} placeholder="Transaction ID" value={reversal.transactionId} onChange={(e) => setReversal({ ...reversal, transactionId: e.target.value })} />
              <input className={inputClass} type="number" min="1" step="0.01" placeholder="Amount" value={reversal.amount} onChange={(e) => setReversal({ ...reversal, amount: e.target.value })} />
              <input className={inputClass} placeholder="Remarks" value={reversal.remarks} onChange={(e) => setReversal({ ...reversal, remarks: e.target.value })} />
              <input className={inputClass} placeholder="Reference (optional)" value={reversal.reference} onChange={(e) => setReversal({ ...reversal, reference: e.target.value })} />
            </div>
            <Button className="mt-3" onClick={() => void submit('/admin/money/reversal', {
              ...reversal, amount: Number(reversal.amount),
            }, 'Reversal requested')} disabled={busy || !reversal.transactionId || !reversal.amount}>Reverse transaction</Button>
          </Card>
        </div>
      </div>

      <Card>
        <h3 className="mb-3 font-semibold">Live status lookup</h3>
        <div className="grid gap-2 sm:grid-cols-4">
          <select className={inputClass} value={statusType} onChange={(e) => setStatusType(e.target.value)}>
            {statusTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <input className={inputClass} placeholder="Reference" value={statusQuery.reference} onChange={(e) => setStatusQuery({ ...statusQuery, reference: e.target.value })} />
          <input className={inputClass} placeholder="Transaction / batch / refund ID" value={statusQuery.transactionId || statusQuery.batchId || statusQuery.refundId} onChange={(e) => {
            const v = e.target.value;
            setStatusQuery({ ...statusQuery, transactionId: v, batchId: v, refundId: v });
          }} />
          <select className={inputClass} value={statusQuery.walletType} onChange={(e) => setStatusQuery({ ...statusQuery, walletType: e.target.value })}>
            <option value="payment_wallet">payment_wallet</option>
            <option value="service_wallet">service_wallet</option>
          </select>
        </div>
        <Button className="mt-3" onClick={() => void doStatus()} disabled={busy}>Look up</Button>
        {statusResult ? <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-[var(--bg-primary)] p-3 text-xs">{JSON.stringify(statusResult, null, 2)}</pre> : null}
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold">Payout history</h3>
        {payouts.length === 0 ? <EmptyState title="No payouts yet" /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-[var(--text-muted)]"><th className="py-2">Reference</th><th>Provider</th><th>Type</th><th>Amount</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>{payouts.map((p) => (
              <tr key={p.id} className="border-t border-[var(--border)]">
                <td className="py-2 font-mono text-xs">{p.reference}</td>
                <td>{p.provider}</td>
                <td>{p.channel}</td>
                <td>{formatKsh(Number(p.amount || 0))}</td>
                <td>{p.status}</td>
                <td>{p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
    </div>
  );
}
