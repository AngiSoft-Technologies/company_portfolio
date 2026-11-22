import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/adminApi';
import { useEffectiveAccess } from '@/lib/permissions';
import { toast } from '@angisoft/utils';
import { Button, Card, Field, PageHeader, Table, useCrud } from '@/components';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';
import { formatDateTime } from '@/lib/format';
import {
  CapabilityBadge,
  SecretList,
  inputClass,
  listFrom,
  useResource,
  type ApiRow,
} from './shared';
import { conversationChannel } from './InboxParts';

/** Telegram bot connections, channel accounts and conversations. */
export default function TelegramAdmin() {
  const navigate = useNavigate();
  const { can } = useEffectiveAccess();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', provider: 'TELEGRAM', environment: 'LIVE', secret: '', secretKind: 'API_KEY', externalAccountId: '' });

  const accounts = useCrud<ApiRow>({
    endpoint: '/admin/communications/accounts',
    transform: (data) => listFrom(data, 'accounts', 'communicationAccounts'),
  });
  const connections = useResource<ApiRow>('/admin/communications/connections');
  const conversations = useResource<ApiRow>('/admin/communications/inbox/conversations?limit=100');

  const telegramAccounts = accounts.rows.filter((row) => /TELEGRAM/i.test(String(row.channel ?? row.provider ?? '')));
  const telegramConnections = listFrom(connections.data, 'connections').filter((row) => /TELEGRAM/i.test(String(row.provider ?? '')));
  const telegramConversations = listFrom(conversations.data, 'conversations').filter((row) => conversationChannel(row) === 'TELEGRAM');

  const createConnection = async () => {
    setSaving(true);
    try {
      await apiFetch('/admin/communications/connections', {
        method: 'POST',
        body: { ...form, secret: form.secret || undefined, externalAccountId: form.externalAccountId || undefined },
      });
      toast.success('Telegram connection created');
      setOpen(false);
      setForm({ name: '', provider: 'TELEGRAM', environment: 'LIVE', secret: '', secretKind: 'API_KEY', externalAccountId: '' });
      await Promise.all([connections.reload(), accounts.refresh()]);
    } catch (e) {
      toast.error((e as Error).message || 'Could not create connection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Telegram"
        subtitle="Manage Telegram bot connections, linked accounts and conversations in the unified inbox."
        actions={<Button onClick={() => setOpen(true)} disabled={!can('communications.telegram.manage')}>Add bot connection</Button>}
      />
      <div className="flex flex-wrap gap-2">
        <CapabilityBadge label="Read conversations" state={can('communications.telegram.read')} />
        <CapabilityBadge label="Respond" state={can('communications.telegram.respond')} />
        <CapabilityBadge label="Manage bots" state={can('communications.telegram.manage')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Bot connections</h2>
          {telegramConnections.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No Telegram connections yet.</p> : (
            <Table<ApiRow>
              columns={[
                { key: 'name', header: 'Name', render: (row) => String(row.name ?? '—') },
                { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.status ?? 'DRAFT')}</Badge> },
                { key: 'secrets', header: 'Credentials', render: (row) => <SecretList secrets={row.secrets as ApiRow[]} /> },
                { key: 'lastSync', header: 'Last sync', render: (row) => formatDateTime(row.lastSyncAt) },
              ]}
              rows={telegramConnections}
            />
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Linked accounts</h2>
          {accounts.loading ? <p className="text-sm text-[var(--text-muted)]">Loading…</p> : null}
          {!accounts.loading && telegramAccounts.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No Telegram accounts linked.</p> : null}
          {telegramAccounts.length > 0 ? (
            <Table<ApiRow>
              columns={[
                { key: 'name', header: 'Account', render: (row) => String(row.name ?? row.address ?? '—') },
                { key: 'external', header: 'Bot / chat ID', render: (row) => String(row.externalId ?? '—') },
                { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.syncStatus ?? row.status ?? 'ACTIVE')}</Badge> },
              ]}
              rows={telegramAccounts}
            />
          ) : null}
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Telegram conversations</h2>
          <Button variant="ghost" onClick={() => navigate('/communications/inbox')}>Open inbox →</Button>
        </div>
        {conversations.loading ? <p className="text-sm text-[var(--text-muted)]">Loading…</p> : null}
        {!conversations.loading && telegramConversations.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No Telegram conversations.</p> : null}
        {telegramConversations.length > 0 ? (
          <Table<ApiRow>
            columns={[
              { key: 'contact', header: 'Contact', render: (row) => String(row.contact?.name ?? row.subject ?? row.id) },
              { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.status ?? 'OPEN')}</Badge> },
              { key: 'last', header: 'Last message', render: (row) => formatDateTime(row.lastMessageAt) },
            ]}
            rows={telegramConversations.slice(0, 15)}
          />
        ) : null}
      </Card>

      {open ? (
        <Modal
          title="Add Telegram bot connection"
          onClose={() => setOpen(false)}
          footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => void createConnection()} disabled={saving || !form.name}>{saving ? 'Saving…' : 'Save connection'}</Button></>}
        >
          <div className="grid gap-3">
            <Field label="Connection name"><input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Environment">
                <select className={inputClass} value={form.environment} onChange={(event) => setForm({ ...form, environment: event.target.value })}>
                  <option value="LIVE">LIVE</option><option value="SANDBOX">SANDBOX</option>
                </select>
              </Field>
              <Field label="Bot / external account ID"><input className={inputClass} value={form.externalAccountId} onChange={(event) => setForm({ ...form, externalAccountId: event.target.value })} /></Field>
            </div>
            <Field label="Bot token (stored encrypted, never displayed)">
              <input type="password" autoComplete="new-password" className={inputClass} value={form.secret} onChange={(event) => setForm({ ...form, secret: event.target.value })} />
            </Field>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
