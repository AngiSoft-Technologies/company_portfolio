import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { toast } from '@angisoft/utils';
import { Button, Card, EmptyState, PageHeader, Spinner } from '@/components';
import { formatKsh } from '@/lib/format';

type Overview = { connections: any; payments: any; payouts: any; recentEvents: any[] };
type TxResponse = { ledgerEntries: any[]; payments: any[]; payouts: any[] };
type Run = { id: string; provider: string; status: string; createdAt?: string; completedAt?: string; summary?: any; error?: string };

export default function FinanceHub() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tx, setTx] = useState<TxResponse | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ provider: 'PAYHERO', name: '', environment: 'LIVE', secret: '', secretKind: 'API_KEY' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [o, t, r] = await Promise.all([
        apiFetch('/admin/finance/overview') as Promise<Overview>,
        apiFetch('/admin/finance/transactions?limit=20') as Promise<TxResponse>,
        apiFetch('/admin/finance/reconciliation/runs').catch(() => ({ runs: [] })) as Promise<any>,
      ]);
      setOverview(o); setTx(t); setRuns(Array.isArray(r?.runs) ? r.runs : []); setError(null);
    } catch (e: any) { setError(e.message || 'Failed to load finance hub'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const create = async () => {
    setSaving(true);
    try {
      await apiFetch('/admin/finance/connections', { method: 'POST', body: { ...form, secret: form.secret || undefined } });
      toast.success('Finance connection saved');
      setForm({ provider: 'PAYHERO', name: '', environment: 'LIVE', secret: '', secretKind: 'API_KEY' });
      await load();
    } catch (e: any) { toast.error(e.message || 'Failed to save connection'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Finance Hub" subtitle="Phase 7A/7B foundation: provider connections, unified transaction visibility, and ledger scaffolding over existing payments." actions={<Button variant="outline" onClick={() => void load()} disabled={loading}>Refresh</Button>} />
      <Card>
        <div className="grid gap-3 md:grid-cols-5">
          <select className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
            {['PAYHERO','MPESA','PAYSTACK','PAYPAL','PESAFLOW','BANK'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm" placeholder="Connection name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm" value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}><option value="LIVE">LIVE</option><option value="SANDBOX">SANDBOX</option></select>
          <select className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm" value={form.secretKind} onChange={(e) => setForm({ ...form, secretKind: e.target.value })}>{['API_KEY','API_SECRET','WEBHOOK_SECRET','OAUTH_REFRESH','ACCESS_TOKEN','OTHER'].map((k) => <option key={k} value={k}>{k}</option>)}</select>
          <Button onClick={() => void create()} disabled={saving || !form.name}>{saving ? 'Saving...' : 'Add Connection'}</Button>
        </div>
        <textarea className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm" rows={3} placeholder="Secret/token (encrypted at rest with APP_ENCRYPTION_KEY)" value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} />
      </Card>

      {loading ? <Spinner /> : null}
      {!loading && error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {overview ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card><div className="text-sm text-[var(--text-muted)]">Finance Connections</div><div className="text-2xl font-bold">{overview.connections.total}</div></Card>
          <Card><div className="text-sm text-[var(--text-muted)]">Payments</div><div className="text-2xl font-bold">{overview.payments.total}</div></Card>
          <Card><div className="text-sm text-[var(--text-muted)]">Payouts</div><div className="text-2xl font-bold">{overview.payouts.total}</div></Card>
        </div>
      ) : null}

      <Card>
        <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Reconciliation</h3><Button variant="outline" onClick={async()=>{try{await apiFetch('/admin/finance/reconciliation/runs',{method:'POST',body:{provider:'PAYHERO'}}); toast.success('Reconciliation run created'); await load();}catch(e:any){toast.error(e.message||'Failed')}}}>Run PAYHERO</Button></div>
        <p className="mb-3 text-sm text-[var(--text-muted)]">Compares provider payments vs ledger entries. Runs are audited; exception-resolution workflow is still being expanded.</p>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-[var(--text-muted)]"><th className="py-2">Provider</th><th>Status</th><th>Created</th><th>Summary</th></tr></thead><tbody>
          {runs.length===0 ? <tr><td className="py-2 text-[var(--text-muted)]" colSpan={4}>No runs yet</td></tr> : runs.slice(0,10).map((r)=> <tr key={r.id} className="border-t border-[var(--border)]"><td className="py-2">{r.provider}</td><td>{r.status}</td><td>{r.createdAt?new Date(r.createdAt).toLocaleString():'—'}</td><td className="text-xs text-[var(--text-muted)]">{r.error ? r.error : r.summary ? `payments ${r.summary.paymentsSucceeded}/${r.summary.paymentsTotal}, ledger ${r.summary.ledgerSucceeded}/${r.summary.ledgerTotal}` : '—'}</td></tr>)}
        </tbody></table></div>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold">Recent Payments</h3>
        {!tx?.payments?.length ? <EmptyState title="No payments yet" /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-[var(--text-muted)]"><th className="py-2">ID</th><th>Status</th><th>Amount</th><th>Provider</th><th>Date</th></tr></thead><tbody>
            {tx.payments.map((p: any) => <tr key={p.id} className="border-t border-[var(--border)]"><td className="py-2 font-mono text-xs">{String(p.id).slice(0,8)}</td><td>{p.status}</td><td>{formatKsh(Number(p.amount || 0))}</td><td>{p.provider}</td><td>{p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}</td></tr>)}
          </tbody></table></div>
        )}
      </Card>
    </div>
  );
}
