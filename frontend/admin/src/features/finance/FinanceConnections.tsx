import { useState } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { useEffectiveAccess } from '@/lib/permissions';
import { toast } from '@angisoft/utils';
import { Button, Card, Field, PageHeader, Table, useCrud } from '@/components';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';
import { formatDateTime } from '@/lib/format';
import { SecretList, inputClass, listFrom, type ApiRow } from './shared';

const PROVIDERS = ['PAYHERO', 'MPESA', 'PAYSTACK', 'PAYPAL', 'PESAFLOW', 'BANK'];
const SECRET_KINDS = ['API_KEY', 'API_SECRET', 'WEBHOOK_SECRET', 'OAUTH_REFRESH', 'ACCESS_TOKEN', 'OTHER'];
const blank = { provider: 'PAYHERO', name: '', environment: 'LIVE', status: 'CONNECTED', externalAccountId: '', secret: '', secretKind: 'API_KEY' };

/** Provider connection vault for payment and payout integrations. */
export default function FinanceConnections() {
  const { can } = useEffectiveAccess();
  const { rows, loading, error, refresh, remove } = useCrud<ApiRow>({
    endpoint: '/admin/finance/connections',
    transform: (data) => listFrom(data, 'connections'),
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiRow | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [busy, setBusy] = useState(false);
  const manageable = can('finance.connections.manage');

  const openEditor = (row: ApiRow | null) => {
    setEditing(row);
    setForm(row ? {
      provider: String(row.provider ?? 'PAYHERO'),
      name: String(row.name ?? ''),
      environment: String(row.environment ?? 'LIVE'),
      status: String(row.status ?? 'DRAFT'),
      externalAccountId: String(row.externalAccountId ?? ''),
      secret: '',
      secretKind: String(row.secrets?.[0]?.kind ?? 'API_KEY'),
    } : { ...blank });
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      await apiFetch(editing ? `/admin/finance/connections/${editing.id}` : '/admin/finance/connections', {
        method: editing ? 'PATCH' : 'POST',
        body: {
          provider: form.provider,
          name: form.name,
          environment: form.environment,
          status: form.status,
          externalAccountId: form.externalAccountId || undefined,
          secret: form.secret || undefined,
          secretKind: form.secret ? form.secretKind : undefined,
        },
      });
      toast.success(editing ? 'Connection updated' : 'Connection created');
      setOpen(false);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message || 'Could not save connection');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Connections"
        subtitle="Payment and payout provider credentials, environments and sync health. Secrets stay encrypted."
        actions={<><Button variant="outline" onClick={() => void refresh()} disabled={loading}>Refresh</Button><Button onClick={() => openEditor(null)} disabled={!manageable}>Add connection</Button></>}
      />
      {error ? <Card className="border-red-300 text-sm">{error}</Card> : null}
      <Card>
        <Table<ApiRow>
          columns={[
            { key: 'name', header: 'Name', render: (row) => <span className="font-medium">{String(row.name ?? '—')}</span> },
            { key: 'provider', header: 'Provider', render: (row) => String(row.provider ?? '—') },
            { key: 'environment', header: 'Environment', render: (row) => <Badge>{String(row.environment ?? 'LIVE')}</Badge> },
            { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.status ?? 'DRAFT')}</Badge> },
            { key: 'secrets', header: 'Secrets', render: (row) => <SecretList secrets={row.secrets as ApiRow[]} /> },
            { key: 'lastSyncAt', header: 'Last sync', render: (row) => formatDateTime(row.lastSyncAt) },
          ]}
          rows={rows}
          onEdit={manageable ? openEditor : undefined}
          onDelete={manageable ? (row) => { void remove(String(row.id)); } : undefined}
        />
      </Card>

      {open ? (
        <Modal
          title={editing ? 'Edit connection' : 'Add connection'}
          onClose={() => setOpen(false)}
          footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => void save()} disabled={busy || !form.name}>{busy ? 'Saving…' : 'Save'}</Button></>}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Provider">
              <select className={inputClass} value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })}>
                {PROVIDERS.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
              </select>
            </Field>
            <Field label="Name"><input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="Environment">
              <select className={inputClass} value={form.environment} onChange={(event) => setForm({ ...form, environment: event.target.value })}>
                <option value="LIVE">LIVE</option><option value="SANDBOX">SANDBOX</option>
              </select>
            </Field>
            <Field label="Status">
              <select className={inputClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                {['DRAFT', 'CONNECTED', 'DEGRADED', 'DISCONNECTED', 'ERROR'].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </Field>
            <Field label="External account ID"><input className={inputClass} value={form.externalAccountId} onChange={(event) => setForm({ ...form, externalAccountId: event.target.value })} /></Field>
            <Field label="Secret kind">
              <select className={inputClass} value={form.secretKind} onChange={(event) => setForm({ ...form, secretKind: event.target.value })}>
                {SECRET_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
              </select>
            </Field>
            <Field label="New secret (optional)">
              <input type="password" autoComplete="new-password" className={inputClass} value={form.secret} onChange={(event) => setForm({ ...form, secret: event.target.value })} placeholder="Leave blank to keep existing" />
            </Field>
          </div>
          <p className="mt-3 text-xs text-[var(--text-muted)]">Existing secrets are never returned by the API. Rotating requires entering a new value.</p>
        </Modal>
      ) : null}
    </div>
  );
}
