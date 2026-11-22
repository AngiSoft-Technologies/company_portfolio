import { useState } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { useEffectiveAccess } from '@/lib/permissions';
import { toast } from '@angisoft/utils';
import { Button, Card, Field, PageHeader, Table, useCrud } from '@/components';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';
import { formatDateTime } from '@/lib/format';
import {
  CapabilityBadge,
  ErrorNotice,
  SecretList,
  inputClass,
  listFrom,
  useResource,
  valueFrom,
  type ApiRow,
} from './shared';

/** Zoho Mail OAuth, compose/send, sync, drafts and delegated send-as identities. */
export default function EmailAdmin() {
  const { can } = useEffectiveAccess();
  const params = new URLSearchParams(window.location.search);
  const oauthStatus = params.get('oauth');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [accountId, setAccountId] = useState('');
  const [sending, setSending] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [sendAsOpen, setSendAsOpen] = useState(false);
  const [identity, setIdentity] = useState({ email: '', displayName: '', accountId: '' });

  const accounts = useCrud<ApiRow>({
    endpoint: '/admin/communications/accounts',
    transform: (data) => listFrom(data, 'accounts', 'communicationAccounts'),
  });
  const connections = useResource<ApiRow>('/admin/communications/connections');
  const drafts = useResource<ApiRow>('/admin/communications/email/drafts');
  const sendAs = useResource<ApiRow>('/admin/communications/email/send-as');

  const emailAccounts = accounts.rows.filter((row) => /EMAIL|MAIL|ZOHO/i.test(String(row.channel ?? row.provider ?? '')));
  const connectionRows = listFrom(connections.data, 'connections');
  const draftRows = listFrom(drafts.data, 'drafts');
  const identityRows = listFrom(sendAs.data, 'sendAs', 'identities', 'emailSendAsIdentities');

  const startOAuth = async () => {
    setConnecting(true);
    try {
      const result = await apiFetch('/admin/communications/email/oauth/start', {
        method: 'POST',
        body: { provider: 'ZOHO_MAIL' },
      });
      const url = valueFrom(result, 'url') ?? valueFrom(result, 'authUrl') ?? valueFrom(result, 'authorizationUrl');
      if (!url) throw new Error('Provider did not return an authorization URL');
      window.open(String(url), '_blank', 'noopener,noreferrer');
      toast.success('Complete authorization in the new tab');
    } catch (e) {
      toast.error((e as Error).message || 'Could not start OAuth');
    } finally {
      setConnecting(false);
    }
  };

  const sendEmail = async () => {
    setSending(true);
    try {
      await apiFetch('/admin/communications/email/send', {
        method: 'POST',
        body: { to, cc: cc || undefined, subject, body, accountId: accountId || undefined },
      });
      toast.success('Email sent');
      setTo(''); setCc(''); setSubject(''); setBody('');
      await drafts.reload();
    } catch (e) {
      toast.error((e as Error).message || 'Email send failed');
    } finally {
      setSending(false);
    }
  };

  const syncMailbox = async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      await apiFetch(`/admin/communications/email/sync/${connectionId}`, { method: 'POST', body: {} });
      toast.success('Mailbox sync started');
      await Promise.all([accounts.refresh(), connections.reload(), drafts.reload()]);
    } catch (e) {
      toast.error((e as Error).message || 'Sync failed');
    } finally {
      setSyncing(null);
    }
  };

  const saveDraft = async () => {
    try {
      await apiFetch('/admin/communications/email/drafts', {
        method: 'POST',
        body: { to, subject, body, accountId: accountId || undefined },
      });
      toast.success('Draft saved');
      await drafts.reload();
    } catch (e) {
      toast.error((e as Error).message || 'Could not save draft');
    }
  };

  const createIdentity = async () => {
    try {
      await apiFetch('/admin/communications/email/send-as', { method: 'POST', body: identity });
      toast.success('Send-as identity created');
      setSendAsOpen(false);
      setIdentity({ email: '', displayName: '', accountId: '' });
      await sendAs.reload();
    } catch (e) {
      toast.error((e as Error).message || 'Could not create identity');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email"
        subtitle="Connect a Zoho mailbox, sync threads, compose authenticated mail and manage verified send-as identities."
        actions={<Button onClick={() => void startOAuth()} disabled={connecting || !can('communications.accounts.connect')}>{connecting ? 'Connecting…' : 'Connect Zoho mailbox'}</Button>}
      />
      {oauthStatus ? <Card className="text-sm">{oauthStatus === 'success' ? <Badge tone="green">Mailbox connected</Badge> : <Badge tone="amber">OAuth returned: {oauthStatus}</Badge>}</Card> : null}
      <div className="flex flex-wrap gap-2">
        <CapabilityBadge label="Read mail" state={can('communications.email.read')} />
        <CapabilityBadge label="Compose" state={can('communications.email.compose')} />
        <CapabilityBadge label="Send as" state={can('communications.email.send_as')} />
        <CapabilityBadge label="Manage mailboxes" state={can('communications.email.manage')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Compose</h2>
          <div className="grid gap-3">
            <Field label="From account">
              <select className={inputClass} value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                <option value="">Default mailbox</option>
                {emailAccounts.map((account) => (
                  <option key={String(account.id)} value={String(account.id)}>{String(account.name ?? account.address ?? account.id)}</option>
                ))}
              </select>
            </Field>
            <Field label="To"><input className={inputClass} value={to} onChange={(event) => setTo(event.target.value)} placeholder="recipient@example.com" /></Field>
            <Field label="CC"><input className={inputClass} value={cc} onChange={(event) => setCc(event.target.value)} /></Field>
            <Field label="Subject"><input className={inputClass} value={subject} onChange={(event) => setSubject(event.target.value)} /></Field>
            <Field label="Message"><textarea className={inputClass + ' min-h-[140px]'} value={body} onChange={(event) => setBody(event.target.value)} /></Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => void sendEmail()} disabled={sending || !to || !subject || !body || !can('communications.email.compose')}>{sending ? 'Sending…' : 'Send email'}</Button>
            <Button variant="outline" onClick={() => void saveDraft()} disabled={!to && !subject && !body}>Save draft</Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Mailboxes</h2>
              <Button variant="ghost" onClick={() => void accounts.refresh()} disabled={accounts.loading}>Refresh</Button>
            </div>
            <ErrorNotice error={accounts.error} onRetry={() => void accounts.refresh()} />
            {accounts.loading ? <p className="text-sm text-[var(--text-muted)]">Loading…</p> : null}
            {!accounts.loading && emailAccounts.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No email accounts connected yet.</p> : null}
            <div className="space-y-2">
              {emailAccounts.map((account) => (
                <div key={String(account.id)} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] p-3">
                  <div>
                    <div className="text-sm font-medium">{String(account.name ?? account.address ?? 'Mailbox')}</div>
                    <div className="text-xs text-[var(--text-muted)]">{String(account.address ?? account.email ?? '')} · {String(account.syncStatus ?? account.status ?? '')}</div>
                  </div>
                  {can('communications.email.manage') ? (
                    <Button variant="outline" onClick={() => void syncMailbox(String(account.connectionId ?? account.connection?.id ?? ''))} disabled={syncing !== null || !account.connectionId && !account.connection?.id}>
                      {syncing === String(account.connectionId ?? account.connection?.id) ? 'Syncing…' : 'Sync'}
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">Connections & secrets</h2>
            <ErrorNotice error={connections.error} onRetry={() => void connections.reload()} />
            {connectionRows.length === 0 ? <p className="py-4 text-center text-sm text-[var(--text-muted)]">No email connections.</p> : (
              <div className="space-y-2">
                {connectionRows.filter((row) => /MAIL|ZOHO/i.test(String(row.provider ?? ''))).map((row) => (
                  <div key={String(row.id)} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-light)] py-2 text-sm">
                    <span>{String(row.name ?? row.provider)}</span>
                    <div className="flex items-center gap-2"><Badge>{String(row.status ?? 'DRAFT')}</Badge><SecretList secrets={row.secrets as ApiRow[]} /></div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Drafts</h2>
            <Button variant="ghost" onClick={() => void drafts.reload()} disabled={drafts.loading}>Refresh</Button>
          </div>
          {drafts.loading ? <p className="text-sm text-[var(--text-muted)]">Loading…</p> : null}
          {!drafts.loading && draftRows.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No saved drafts.</p> : null}
          {draftRows.length > 0 ? (
            <Table<ApiRow>
              columns={[
                { key: 'subject', header: 'Subject', render: (row) => String(row.subject ?? '—') },
                { key: 'to', header: 'To', render: (row) => String(row.to ?? row.toAddresses ?? '—') },
                { key: 'updatedAt', header: 'Updated', render: (row) => formatDateTime(row.updatedAt ?? row.createdAt) },
              ]}
              rows={draftRows.slice(0, 20)}
            />
          ) : null}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Send-as identities</h2>
            <Button variant="outline" onClick={() => setSendAsOpen(true)} disabled={!can('communications.email.send_as')}>Add identity</Button>
          </div>
          {sendAs.loading ? <p className="text-sm text-[var(--text-muted)]">Loading…</p> : null}
          {!sendAs.loading && identityRows.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No delegated identities.</p> : null}
          {identityRows.length > 0 ? (
            <Table<ApiRow>
              columns={[
                { key: 'email', header: 'Address', render: (row) => String(row.email ?? '—') },
                { key: 'displayName', header: 'Display name', render: (row) => String(row.displayName ?? '—') },
                { key: 'status', header: 'Verification', render: (row) => <Badge>{String(row.status ?? row.verificationStatus ?? 'PENDING')}</Badge> },
              ]}
              rows={identityRows.slice(0, 20)}
            />
          ) : null}
        </Card>
      </div>

      {sendAsOpen ? (
        <Modal
          title="Add send-as identity"
          onClose={() => setSendAsOpen(false)}
          footer={<><Button variant="outline" onClick={() => setSendAsOpen(false)}>Cancel</Button><Button onClick={() => void createIdentity()} disabled={!identity.email}>Create</Button></>}
        >
          <div className="grid gap-3">
            <Field label="Email address"><input className={inputClass} value={identity.email} onChange={(event) => setIdentity({ ...identity, email: event.target.value })} /></Field>
            <Field label="Display name"><input className={inputClass} value={identity.displayName} onChange={(event) => setIdentity({ ...identity, displayName: event.target.value })} /></Field>
            <Field label="Mailbox account ID (optional)"><input className={inputClass} value={identity.accountId} onChange={(event) => setIdentity({ ...identity, accountId: event.target.value })} /></Field>
          </div>
          <p className="mt-3 text-xs text-[var(--text-muted)]">Only verified identities can be used for outbound send-as. Secrets are never displayed.</p>
        </Modal>
      ) : null}
    </div>
  );
}
