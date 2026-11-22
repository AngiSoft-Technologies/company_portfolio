import { useState } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { toast } from '@angisoft/utils';
import { Button, Card, EmptyState, PageHeader, Spinner } from '@/components';
import { useCrud } from '@/components/AdminUI';

type Connection = {
  id: string; provider: string; name: string; status: string; environment: string;
  lastSyncAt?: string | null; lastError?: string | null; communicationAccounts?: any[]; secrets?: { id: string; kind: string }[];
};

export default function CommunicationsHub() {
  const { rows, loading, error, refresh } = useCrud<Connection>({
    endpoint: '/admin/communications/connections',
    transform: (d: any) => (Array.isArray(d?.connections) ? d.connections : []),
  });
  const [form, setForm] = useState({ provider: 'ZOHO_MAIL', name: '', environment: 'LIVE', secret: '', secretKind: 'OAUTH_REFRESH' });
  const [saving, setSaving] = useState(false);

  const create = async () => {
    setSaving(true);
    try {
      await apiFetch('/admin/communications/connections', { method: 'POST', body: { ...form, secret: form.secret || undefined } });
      toast.success('Connection saved');
      setForm({ provider: 'ZOHO_MAIL', name: '', environment: 'LIVE', secret: '', secretKind: 'OAUTH_REFRESH' });
      await refresh();
    } catch (e: any) { toast.error(e.message || 'Failed to save connection'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Communications Hub" subtitle="Provider connections, encrypted secrets, and channel scaffolding for Zoho Mail, WhatsApp, Telegram, and Meta channels." actions={<Button variant="outline" onClick={() => void refresh()} disabled={loading}>Refresh</Button>} />
      <Card>
        <div className="grid gap-3 md:grid-cols-5">
          <select className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
            {['ZOHO_MAIL','WHATSAPP_META','TELEGRAM','META_FACEBOOK','META_INSTAGRAM','TIKTOK','SMS'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm" placeholder="Connection name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm" value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}><option value="LIVE">LIVE</option><option value="SANDBOX">SANDBOX</option></select>
          <select className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm" value={form.secretKind} onChange={(e) => setForm({ ...form, secretKind: e.target.value })}>{['OAUTH_REFRESH','API_KEY','API_SECRET','WEBHOOK_SECRET','ACCESS_TOKEN','OTHER'].map((k) => <option key={k} value={k}>{k}</option>)}</select>
          <Button onClick={() => void create()} disabled={saving || !form.name}>{saving ? 'Saving...' : 'Add Connection'}</Button>
        </div>
        <textarea className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm" rows={3} placeholder="Secret/token (encrypted at rest with APP_ENCRYPTION_KEY; never returned by API)" value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} />
      </Card>
      {loading ? <Spinner /> : null}
      {!loading && error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {!loading && rows.length === 0 ? <Card><EmptyState title="No communication connections yet" /></Card> : (
        <div className="grid gap-4 md:grid-cols-2">{rows.map((c) => (
          <Card key={c.id}><div className="flex items-start justify-between gap-3"><div><div className="font-semibold">{c.name}</div><div className="text-xs text-[var(--text-muted)]">{c.provider} · {c.environment}</div></div><span className="rounded-full bg-[var(--bg-primary)] px-2 py-1 text-xs">{c.status}</span></div><div className="mt-3 text-sm text-[var(--text-secondary)]"><div>Accounts: {c.communicationAccounts?.length ?? 0}</div><div>Secrets: {c.secrets?.length ?? 0}</div><div>Last sync: {c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString() : '—'}</div>{c.lastError ? <div className="text-red-600">Error: {c.lastError}</div> : null}</div></Card>
        ))}</div>
      )}
    </div>
  );
}
