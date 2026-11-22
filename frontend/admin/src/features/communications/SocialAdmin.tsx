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
  capabilityState,
  inputClass,
  listFrom,
  useResource,
  valueFrom,
  type ApiRow,
} from './shared';
import { conversationChannel } from './InboxParts';
import MetaCommandCenter from './MetaCommandCenter';

const SOCIAL_CHANNELS = [
  { channel: 'FACEBOOK', providers: ['META_FACEBOOK', 'FACEBOOK'], key: 'facebook' },
  { channel: 'INSTAGRAM', providers: ['META_INSTAGRAM', 'INSTAGRAM'], key: 'instagram' },
  { channel: 'TIKTOK', providers: ['TIKTOK'], key: 'tiktok' },
];

/** Meta and TikTok channels — capability-gated, with read-only providers clearly marked. */
export default function SocialAdmin() {
  const navigate = useNavigate();
  const { can } = useEffectiveAccess();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState('META_FACEBOOK');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const overview = useResource<ApiRow>('/admin/communications/overview');
  const connections = useResource<ApiRow>('/admin/communications/connections');
  const accounts = useCrud<ApiRow>({
    endpoint: '/admin/communications/accounts',
    transform: (data) => listFrom(data, 'accounts', 'communicationAccounts'),
  });
  const conversations = useResource<ApiRow>('/admin/communications/inbox/conversations?limit=100');

  const capabilities = (valueFrom(overview.data, 'capabilities', {}) ?? {}) as ApiRow;
  const connectionRows = listFrom(connections.data, 'connections');
  const socialConversations = listFrom(conversations.data, 'conversations').filter((row) =>
    ['FACEBOOK', 'INSTAGRAM', 'TIKTOK'].includes(conversationChannel(row)),
  );

  const createConnection = async () => {
    setSaving(true);
    try {
      await apiFetch('/admin/communications/connections', {
        method: 'POST',
        body: { provider, name, environment: 'LIVE', status: 'DRAFT' },
      });
      toast.success('Social connection created');
      setOpen(false);
      setName('');
      await Promise.all([connections.reload(), accounts.refresh(), overview.reload()]);
    } catch (e) {
      toast.error((e as Error).message || 'Could not create connection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Social Channels"
        subtitle="Facebook, Instagram and TikTok accounts. Available actions follow deployed provider capabilities."
        actions={<Button onClick={() => setOpen(true)} disabled={!can('communications.social.manage')}>Add social connection</Button>}
      />
      <div className="flex flex-wrap gap-2">
        <CapabilityBadge label="Read social conversations" state={can('communications.social.read')} />
        <CapabilityBadge label="Respond" state={can('communications.social.respond')} />
        <CapabilityBadge label="Manage accounts" state={can('communications.social.manage')} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {SOCIAL_CHANNELS.map((channel) => {
          const state = capabilityState(capabilities, channel.key, channel.channel.toLowerCase());
          return (
            <Card key={channel.channel}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">{channel.channel === 'FACEBOOK' ? 'Facebook' : channel.channel === 'INSTAGRAM' ? 'Instagram' : 'TikTok'}</h2>
                <CapabilityBadge label="" state={state} />
              </div>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                {state === 'limited' ? 'Read-only or external-approval-gated on this deployment.' :
                  state === 'unavailable' ? 'Provider adapter is not enabled.' :
                  'Messaging follows the provider capability map and account grants.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => navigate('/communications/inbox')} disabled={!can('communications.social.read')}>View inbox</Button>
                {can('communications.social.respond') && state !== 'unavailable' ? <Button variant="outline" onClick={() => navigate('/communications/inbox')}>Respond</Button> : null}
              </div>
            </Card>
          );
        })}
      </div>

      <MetaCommandCenter />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Provider connections</h2>
          {connectionRows.filter((row) => SOCIAL_CHANNELS.some((channel) => channel.providers.includes(String(row.provider)))).length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">No social connections configured.</p>
          ) : (
            <Table<ApiRow>
              columns={[
                { key: 'provider', header: 'Provider', render: (row) => String(row.provider ?? '—') },
                { key: 'name', header: 'Name', render: (row) => String(row.name ?? '—') },
                { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.status ?? 'DRAFT')}</Badge> },
                { key: 'secrets', header: 'Credentials', render: (row) => <SecretList secrets={row.secrets as ApiRow[]} /> },
              ]}
              rows={connectionRows.filter((row) => SOCIAL_CHANNELS.some((channel) => channel.providers.includes(String(row.provider))))}
            />
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Linked pages and accounts</h2>
          {accounts.loading ? <p className="text-sm text-[var(--text-muted)]">Loading…</p> : null}
          {!accounts.loading && accounts.rows.filter((row) => /FACEBOOK|INSTAGRAM|TIKTOK|META/i.test(String(row.channel ?? row.provider ?? ''))).length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">No social pages linked.</p>
          ) : (
            <Table<ApiRow>
              columns={[
                { key: 'channel', header: 'Channel', render: (row) => String(row.channel ?? '—') },
                { key: 'name', header: 'Account', render: (row) => String(row.name ?? row.address ?? '—') },
                { key: 'external', header: 'External ID', render: (row) => String(row.externalId ?? '—') },
              ]}
              rows={accounts.rows.filter((row) => /FACEBOOK|INSTAGRAM|TIKTOK|META/i.test(String(row.channel ?? row.provider ?? '')))}
            />
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Recent social conversations</h2>
        {socialConversations.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No social conversations.</p> : (
          <Table<ApiRow>
            columns={[
              { key: 'channel', header: 'Channel', render: (row) => <Badge>{conversationChannel(row)}</Badge> },
              { key: 'contact', header: 'Contact', render: (row) => String(row.contact?.name ?? row.subject ?? row.id) },
              { key: 'status', header: 'Status', render: (row) => String(row.status ?? 'OPEN') },
              { key: 'last', header: 'Last message', render: (row) => formatDateTime(row.lastMessageAt) },
            ]}
            rows={socialConversations.slice(0, 15)}
          />
        )}
      </Card>

      {open ? (
        <Modal
          title="Add social connection"
          onClose={() => setOpen(false)}
          footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => void createConnection()} disabled={saving || !name}>{saving ? 'Saving…' : 'Save connection'}</Button></>}
        >
          <div className="grid gap-3">
            <Field label="Provider">
              <select className={inputClass} value={provider} onChange={(event) => setProvider(event.target.value)}>
                {SOCIAL_CHANNELS.flatMap((channel) => channel.providers).map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Connection name"><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} /></Field>
          </div>
          <p className="mt-3 text-xs text-[var(--text-muted)]">Credentials are added through the provider OAuth flow or the settings vault; no tokens are shown here.</p>
        </Modal>
      ) : null}
    </div>
  );
}
