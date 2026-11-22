import { useMemo, useState } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { useEffectiveAccess } from '@/lib/permissions';
import { toast } from '@angisoft/utils';
import { Button, Card, Field, PageHeader, Table, useCrud } from '@/components';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';
import { formatDateTime } from '@/lib/format';
import {
  SecretList,
  downloadPayload,
  inputClass,
  listFrom,
  useResource,
  type ApiRow,
} from './shared';

const PROVIDERS = [
  'ZOHO_MAIL', 'WHATSAPP_META', 'TELEGRAM', 'META_FACEBOOK', 'META_INSTAGRAM', 'TIKTOK', 'SMS',
];
const SECRET_KINDS = ['OAUTH_REFRESH', 'API_KEY', 'API_SECRET', 'WEBHOOK_SECRET', 'ACCESS_TOKEN', 'OTHER'];
const SCOPES = ['communications.inbox.view', 'communications.inbox.respond', 'communications.inbox.assign'];

const blankConnection = { provider: 'ZOHO_MAIL', name: '', environment: 'LIVE', secret: '', secretKind: 'OAUTH_REFRESH', externalAccountId: '' };

/** Connection vault, scoped grants, audit trail and data export. */
export default function CommunicationsSettings() {
  const { can } = useEffectiveAccess();
  const connections = useCrud<ApiRow>({
    endpoint: '/admin/communications/connections',
    transform: (data) => listFrom(data, 'connections'),
  });
  const accounts = useResource<ApiRow>('/admin/communications/accounts');
  const grants = useResource<ApiRow>('/admin/communications/grants');
  const [auditFilter, setAuditFilter] = useState('');
  const audit = useResource<ApiRow>(auditFilter ? `/admin/communications/audit?action=${encodeURIComponent(auditFilter)}` : '/admin/communications/audit');
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ApiRow | null>(null);
  const [connectionForm, setConnectionForm] = useState({ ...blankConnection });
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantForm, setGrantForm] = useState({ accountId: '', employeeId: '', scopes: [] as string[] });
  const [busy, setBusy] = useState(false);

  const accountRows = listFrom(accounts.data, 'accounts', 'communicationAccounts');
  const grantRows = listFrom(grants.data, 'grants');
  const auditRows = listFrom(audit.data, 'audit', 'entries', 'auditLogs', 'logs');
  const accountOptions = useMemo(
    () => accountRows.map((account) => ({ id: String(account.id), label: String(account.name ?? account.address ?? account.id) })),
    [accountRows],
  );

  const openConnection = (row: ApiRow | null) => {
    setEditingConnection(row);
    setConnectionForm(row ? {
      provider: String(row.provider ?? 'ZOHO_MAIL'),
      name: String(row.name ?? ''),
      environment: String(row.environment ?? 'LIVE'),
      secret: '',
      secretKind: String(row.secrets?.[0]?.kind ?? 'OAUTH_REFRESH'),
      externalAccountId: String(row.externalAccountId ?? ''),
    } : { ...blankConnection });
    setConnectionOpen(true);
  };

  const saveConnection = async () => {
    setBusy(true);
    try {
      await apiFetch(editingConnection ? `/admin/communications/connections/${editingConnection.id}` : '/admin/communications/connections', {
        method: editingConnection ? 'PATCH' : 'POST',
        body: {
          provider: connectionForm.provider,
          name: connectionForm.name,
          environment: connectionForm.environment,
          externalAccountId: connectionForm.externalAccountId || undefined,
          secret: connectionForm.secret || undefined,
          secretKind: connectionForm.secret ? connectionForm.secretKind : undefined,
        },
      });
      toast.success(editingConnection ? 'Connection updated' : 'Connection created');
      setConnectionOpen(false);
      await connections.refresh();
    } catch (e) {
      toast.error((e as Error).message || 'Could not save connection');
    } finally {
      setBusy(false);
    }
  };

  const saveGrant = async () => {
    setBusy(true);
    try {
      await apiFetch('/admin/communications/grants', {
        method: 'POST',
        body: grantForm,
      });
      toast.success('Access grant saved');
      setGrantOpen(false);
      setGrantForm({ accountId: '', employeeId: '', scopes: [] });
      await grants.reload();
    } catch (e) {
      toast.error((e as Error).message || 'Could not save grant');
    } finally {
      setBusy(false);
    }
  };

  const toggleScope = (scope: string) => {
    setGrantForm((current) => ({
      ...current,
      scopes: current.scopes.includes(scope) ? current.scopes.filter((item) => item !== scope) : [...current.scopes, scope],
    }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communications Settings"
        subtitle="Provider connections, account-scoped access grants, audit trail and exports."
        actions={<Button variant="outline" onClick={() => void Promise.all([connections.refresh(), grants.reload(), audit.reload()])}>Refresh</Button>}
      />

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Provider connections</h2>
          <Button onClick={() => openConnection(null)} disabled={!can('communications.accounts.manage')}>Add connection</Button>
        </div>
        {connections.error ? <p className="mb-2 text-sm text-red-600">{connections.error}</p> : null}
        <Table<ApiRow>
          columns={[
            { key: 'name', header: 'Name', render: (row) => String(row.name ?? '—') },
            { key: 'provider', header: 'Provider', render: (row) => String(row.provider ?? '—') },
            { key: 'environment', header: 'Environment', render: (row) => <Badge>{String(row.environment ?? 'LIVE')}</Badge> },
            { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.status ?? 'DRAFT')}</Badge> },
            { key: 'secrets', header: 'Secrets', render: (row) => <SecretList secrets={row.secrets as ApiRow[]} /> },
            { key: 'lastSyncAt', header: 'Last sync', render: (row) => formatDateTime(row.lastSyncAt) },
          ]}
          rows={connections.rows}
          onEdit={can('communications.accounts.manage') ? openConnection : undefined}
          onDelete={can('communications.accounts.disconnect') ? (row) => { void connections.remove(String(row.id)); } : undefined}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Access grants</h2>
            <Button variant="outline" onClick={() => setGrantOpen(true)} disabled={!can('communications.grants.manage')}>Add grant</Button>
          </div>
          {grants.error ? <p className="mb-2 text-sm text-red-600">{grants.error}</p> : null}
          {grantRows.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No scoped grants yet.</p> : (
            <Table<ApiRow>
              columns={[
                { key: 'account', header: 'Account', render: (row) => String(row.account?.name ?? row.accountId ?? '—') },
                { key: 'employee', header: 'Employee', render: (row) => String(row.employee?.email ?? row.employeeId ?? '—') },
                { key: 'scopes', header: 'Scopes', render: (row) => <span className="flex flex-wrap gap-1">{((row.scopes ?? []) as string[]).map((scope) => <Badge key={scope}>{scope.replace('communications.', '')}</Badge>)}</span> },
              ]}
              rows={grantRows}
              onDelete={can('communications.grants.manage') ? (row) => {
                void apiFetch(`/admin/communications/grants/${row.id}`, { method: 'DELETE' })
                  .then(() => { toast.success('Grant revoked'); return grants.reload(); })
                  .catch((e: Error) => toast.error(e.message || 'Could not revoke grant'));
              } : undefined}
            />
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Audit & export</h2>
          <p className="mb-3 text-sm text-[var(--text-muted)]">Every send, sync, grant and connection change is audit logged. Exports are themselves audited.</p>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input className={inputClass + ' max-w-xs'} placeholder="Filter by action…" value={auditFilter} onChange={(event) => setAuditFilter(event.target.value)} />
            <Button variant="outline" onClick={() => void audit.reload()} disabled={audit.loading}>Apply</Button>
            <Button
              variant="outline"
              onClick={() => void downloadPayload('/admin/communications/export', 'communications-export.json').catch((e: Error) => toast.error(e.message || 'Export failed'))}
              disabled={!can('communications.export')}
            >
              Export data
            </Button>
          </div>
          {audit.error ? <p className="mb-2 text-sm text-red-600">{audit.error}</p> : null}
          {auditRows.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No audit entries.</p> : (
            <Table<ApiRow>
              columns={[
                { key: 'action', header: 'Action', render: (row) => String(row.action ?? '—') },
                { key: 'actor', header: 'Actor', render: (row) => String(row.actorId ?? row.actorRole ?? '—') },
                { key: 'entity', header: 'Entity', render: (row) => String(row.entity ?? '—') },
                { key: 'createdAt', header: 'When', render: (row) => formatDateTime(row.createdAt) },
              ]}
              rows={auditRows.slice(0, 25)}
            />
          )}
        </Card>
      </div>

      {connectionOpen ? (
        <Modal
          title={editingConnection ? 'Edit connection' : 'Add connection'}
          onClose={() => setConnectionOpen(false)}
          footer={<><Button variant="outline" onClick={() => setConnectionOpen(false)}>Cancel</Button><Button onClick={() => void saveConnection()} disabled={busy || !connectionForm.name}>{busy ? 'Saving…' : 'Save'}</Button></>}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Provider">
              <select className={inputClass} value={connectionForm.provider} onChange={(event) => setConnectionForm({ ...connectionForm, provider: event.target.value })}>
                {PROVIDERS.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
              </select>
            </Field>
            <Field label="Name"><input className={inputClass} value={connectionForm.name} onChange={(event) => setConnectionForm({ ...connectionForm, name: event.target.value })} /></Field>
            <Field label="Environment">
              <select className={inputClass} value={connectionForm.environment} onChange={(event) => setConnectionForm({ ...connectionForm, environment: event.target.value })}>
                <option value="LIVE">LIVE</option><option value="SANDBOX">SANDBOX</option>
              </select>
            </Field>
            <Field label="External account ID"><input className={inputClass} value={connectionForm.externalAccountId} onChange={(event) => setConnectionForm({ ...connectionForm, externalAccountId: event.target.value })} /></Field>
            <Field label="Secret kind">
              <select className={inputClass} value={connectionForm.secretKind} onChange={(event) => setConnectionForm({ ...connectionForm, secretKind: event.target.value })}>
                {SECRET_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
              </select>
            </Field>
            <Field label="New secret (optional)">
              <input type="password" autoComplete="new-password" className={inputClass} value={connectionForm.secret} onChange={(event) => setConnectionForm({ ...connectionForm, secret: event.target.value })} placeholder="Leave blank to keep existing" />
            </Field>
          </div>
          <p className="mt-3 text-xs text-[var(--text-muted)]">Secrets are encrypted at rest. Existing values are never returned or displayed — leave blank to keep them.</p>
        </Modal>
      ) : null}

      {grantOpen ? (
        <Modal
          title="Grant account access"
          onClose={() => setGrantOpen(false)}
          footer={<><Button variant="outline" onClick={() => setGrantOpen(false)}>Cancel</Button><Button onClick={() => void saveGrant()} disabled={busy || !grantForm.accountId || !grantForm.employeeId}>{busy ? 'Saving…' : 'Save grant'}</Button></>}
        >
          <div className="grid gap-3">
            <Field label="Communication account">
              <select className={inputClass} value={grantForm.accountId} onChange={(event) => setGrantForm({ ...grantForm, accountId: event.target.value })}>
                <option value="">Select account…</option>
                {accountOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Employee ID"><input className={inputClass} value={grantForm.employeeId} onChange={(event) => setGrantForm({ ...grantForm, employeeId: event.target.value })} /></Field>
            <div>
              <span className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Scopes</span>
              <div className="space-y-1">
                {SCOPES.map((scope) => (
                  <label key={scope} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <input type="checkbox" checked={grantForm.scopes.includes(scope)} onChange={() => toggleScope(scope)} />
                    {scope}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
