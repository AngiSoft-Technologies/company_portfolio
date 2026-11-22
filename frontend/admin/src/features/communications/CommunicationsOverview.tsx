import { useNavigate } from 'react-router-dom';
import { Button, Card, PageHeader, Table } from '@/components';
import { Badge } from '@/lib/Badge';
import { formatDateTime } from '@/lib/format';
import {
  CapabilityBadge,
  ErrorNotice,
  ResourceState,
  capabilityState,
  countOf,
  displayName,
  listFrom,
  shortId,
  useResource,
  valueFrom,
  type ApiRow,
} from './shared';

const CHANNELS = [
  { key: 'EMAIL', label: 'Email', to: '/communications/email', keys: ['email', 'zoho', 'zohoMail'] },
  { key: 'WHATSAPP', label: 'WhatsApp', to: '/communications/whatsapp', keys: ['whatsapp', 'whatsappCloud'] },
  { key: 'TELEGRAM', label: 'Telegram', to: '/communications/telegram', keys: ['telegram'] },
  { key: 'FACEBOOK', label: 'Facebook', to: '/communications/social', keys: ['facebook', 'meta', 'metaFacebook'] },
  { key: 'INSTAGRAM', label: 'Instagram', to: '/communications/social', keys: ['instagram', 'metaInstagram'] },
  { key: 'TIKTOK', label: 'TikTok', to: '/communications/social', keys: ['tiktok'] },
];

/** Command-center landing page for every communications channel. */
export default function CommunicationsOverview() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useResource<ApiRow>('/admin/communications/overview');
  const overview = data ?? {};
  const capabilities = (valueFrom(overview, 'capabilities', {}) ?? {}) as ApiRow;
  const accounts = countOf(valueFrom(overview, 'accounts')) || listFrom(overview, 'accounts', 'communicationAccounts').length;
  const conversations = countOf(valueFrom(overview, 'conversations')) || listFrom(overview, 'conversations', 'recentConversations').length;
  const messages = countOf(valueFrom(overview, 'messages')) || listFrom(overview, 'messages', 'recentMessages').length;
  const connections = countOf(valueFrom(overview, 'connections')) || listFrom(overview, 'connections').length;
  const recent = listFrom(overview, 'recentConversations', 'conversations', 'recentActivity');
  const events = listFrom(overview, 'recentEvents', 'events', 'providerEvents');

  const metrics = [
    { label: 'Connected accounts', value: accounts, hint: 'Mailboxes and channels' },
    { label: 'Active conversations', value: conversations, hint: 'Across all channels' },
    { label: 'Messages', value: messages, hint: 'Stored in the unified inbox' },
    { label: 'Provider connections', value: connections, hint: 'Encrypted credentials' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communications Overview"
        subtitle="Channel health, unified inbox activity and provider capability status in one place."
        actions={<Button variant="outline" onClick={() => void reload()} disabled={loading}>Refresh</Button>}
      />

      <ResourceState loading={loading} error={error} onRetry={() => void reload()}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{metric.label}</div>
              <div className="mt-1 text-2xl font-bold">{metric.value}</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">{metric.hint}</div>
            </Card>
          ))}
        </div>

        <Card>
          <h2 className="mb-3 font-semibold">Channel capability</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CHANNELS.map((channel) => {
              const state = capabilityState(capabilities, channel.key, ...channel.keys);
              return (
                <button
                  key={channel.key}
                  type="button"
                  onClick={() => navigate(channel.to)}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-left hover:bg-[var(--surface-hover)]"
                >
                  <span className="text-sm font-medium">{channel.label}</span>
                  <CapabilityBadge label="" state={state} />
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Availability is read from deployed provider capabilities; unavailable channels stay visible but cannot send.
          </p>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Recent conversations</h2>
              <Button variant="ghost" onClick={() => navigate('/communications/inbox')}>Open inbox →</Button>
            </div>
            {recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">No conversations yet.</p>
            ) : (
              <Table<ApiRow>
                columns={[
                  { key: 'contact', header: 'Contact', render: (row) => displayName(row.contact ?? row) },
                  { key: 'channel', header: 'Channel', render: (row) => <Badge>{String(row.channel ?? row.account?.channel ?? '—')}</Badge> },
                  { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.status ?? '—')}</Badge> },
                  { key: 'lastMessageAt', header: 'Last activity', render: (row) => formatDateTime(row.lastMessageAt) },
                ]}
                rows={recent.slice(0, 8)}
              />
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">Provider events</h2>
            {events.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">No provider events recorded.</p>
            ) : (
              <Table<ApiRow>
                columns={[
                  { key: 'type', header: 'Event', render: (row) => String(row.eventType ?? row.type ?? '—') },
                  { key: 'provider', header: 'Provider', render: (row) => String(row.provider ?? '—') },
                  { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.status ?? '—')}</Badge> },
                  { key: 'id', header: 'ID', render: (row) => <span className="font-mono text-xs">{shortId(row.id)}</span> },
                ]}
                rows={events.slice(0, 8)}
              />
            )}
          </Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate('/communications/inbox')}>Unified Inbox</Button>
          <Button variant="outline" onClick={() => navigate('/communications/email')}>Email</Button>
          <Button variant="outline" onClick={() => navigate('/communications/settings')}>Connections & access</Button>
          {valueFrom(overview, 'errors') ? <ErrorNotice error={String(valueFrom(overview, 'errors'))} /> : null}
        </div>
      </ResourceState>
    </div>
  );
}
