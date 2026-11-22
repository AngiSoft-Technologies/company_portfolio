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
  ErrorNotice,
  inputClass,
  listFrom,
  useResource,
  type ApiRow,
} from './shared';
import { WindowBadge, conversationChannel } from './InboxParts';

/** WhatsApp channel console: accounts, approved templates and the 24h service window. */
export default function WhatsAppAdmin() {
  const navigate = useNavigate();
  const { can } = useEffectiveAccess();
  const [templateOpen, setTemplateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', language: 'en', body: '', category: 'UTILITY' });
  const [saving, setSaving] = useState(false);

  const accounts = useCrud<ApiRow>({
    endpoint: '/admin/communications/accounts',
    transform: (data) => listFrom(data, 'accounts', 'communicationAccounts'),
  });
  const templates = useResource<ApiRow>('/admin/communications/templates');
  const conversations = useResource<ApiRow>('/admin/communications/inbox/conversations?limit=100');

  const whatsappAccounts = accounts.rows.filter((row) => /WHATSAPP/i.test(String(row.channel ?? row.provider ?? '')));
  const whatsappTemplates = listFrom(templates.data, 'templates').filter((row) => /WHATSAPP/i.test(String(row.channel ?? '')));
  const whatsappConversations = listFrom(conversations.data, 'conversations').filter(
    (row) => conversationChannel(row) === 'WHATSAPP',
  );

  const createTemplate = async () => {
    setSaving(true);
    try {
      await apiFetchTemplate(form);
      toastTemplate();
      setTemplateOpen(false);
      setForm({ name: '', language: 'en', body: '', category: 'UTILITY' });
      await templates.reload();
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp"
        subtitle="WhatsApp Cloud accounts, approved message templates and customer-service window status."
        actions={<Button variant="outline" onClick={() => void Promise.all([accounts.refresh(), templates.reload(), conversations.reload()])} disabled={accounts.loading}>Refresh</Button>}
      />
      <div className="flex flex-wrap gap-2">
        <CapabilityBadge label="Read conversations" state={can('communications.whatsapp.read')} />
        <CapabilityBadge label="Respond" state={can('communications.whatsapp.respond')} />
        <CapabilityBadge label="Manage templates" state={can('communications.whatsapp.manage_templates')} />
      </div>

      <Card className="border-amber-300">
        <h2 className="font-semibold">24-hour customer-service window</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Free-form replies are only valid for 24 hours after the contact&apos;s last inbound message. Outside that window,
          send an approved template. The inbox marks each conversation with its current window state.
        </p>
        <Button variant="ghost" className="mt-2" onClick={() => navigate('/communications/inbox')}>Open WhatsApp inbox →</Button>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Connected accounts</h2>
            <Button variant="ghost" onClick={() => void accounts.refresh()} disabled={accounts.loading}>Refresh</Button>
          </div>
          <ErrorNotice error={accounts.error} onRetry={() => void accounts.refresh()} />
          {accounts.loading ? <p className="text-sm text-[var(--text-muted)]">Loading…</p> : null}
          {!accounts.loading && whatsappAccounts.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No WhatsApp accounts connected.</p> : null}
          {whatsappAccounts.length > 0 ? (
            <Table<ApiRow>
              columns={[
                { key: 'name', header: 'Account', render: (row) => String(row.name ?? row.address ?? '—') },
                { key: 'phone', header: 'Phone number', render: (row) => String(row.address ?? row.phoneNumber ?? '—') },
                { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.syncStatus ?? row.status ?? 'ACTIVE')}</Badge> },
              ]}
              rows={whatsappAccounts}
            />
          ) : null}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Message templates</h2>
            <Button variant="outline" onClick={() => setTemplateOpen(true)} disabled={!can('communications.whatsapp.manage_templates')}>New template</Button>
          </div>
          <ErrorNotice error={templates.error} onRetry={() => void templates.reload()} />
          {templates.loading ? <p className="text-sm text-[var(--text-muted)]">Loading…</p> : null}
          {!templates.loading && whatsappTemplates.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No WhatsApp templates yet.</p> : null}
          {whatsappTemplates.length > 0 ? (
            <Table<ApiRow>
              columns={[
                { key: 'name', header: 'Name', render: (row) => String(row.name ?? '—') },
                { key: 'status', header: 'Approval', render: (row) => <Badge>{String(row.status ?? 'DRAFT')}</Badge> },
                { key: 'language', header: 'Language', render: (row) => String(row.language ?? 'en') },
              ]}
              rows={whatsappTemplates.slice(0, 20)}
            />
          ) : null}
          <Button variant="ghost" className="mt-2" onClick={() => navigate('/communications/templates')}>Manage all templates →</Button>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Recent WhatsApp conversations</h2>
        <ErrorNotice error={conversations.error} onRetry={() => void conversations.reload()} />
        {conversations.loading ? <p className="text-sm text-[var(--text-muted)]">Loading…</p> : null}
        {!conversations.loading && whatsappConversations.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No WhatsApp conversations.</p> : null}
        {whatsappConversations.length > 0 ? (
          <Table<ApiRow>
            columns={[
              { key: 'contact', header: 'Contact', render: (row) => String(row.contact?.name ?? row.subject ?? row.id) },
              { key: 'window', header: 'Window', render: (row) => <WindowBadge conversation={row} /> },
              { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.status ?? 'OPEN')}</Badge> },
              { key: 'last', header: 'Last message', render: (row) => formatDateTime(row.lastMessageAt) },
            ]}
            rows={whatsappConversations.slice(0, 15)}
          />
        ) : null}
      </Card>

      {templateOpen ? (
        <Modal
          title="New WhatsApp template"
          onClose={() => setTemplateOpen(false)}
          footer={<><Button variant="outline" onClick={() => setTemplateOpen(false)}>Cancel</Button><Button onClick={() => void createTemplate()} disabled={saving || !form.name || !form.body}>{saving ? 'Saving…' : 'Create draft'}</Button></>}
        >
          <div className="grid gap-3">
            <Field label="Template name"><input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Language"><input className={inputClass} value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })} /></Field>
              <Field label="Category"><input className={inputClass} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></Field>
            </div>
            <Field label="Body"><textarea className={inputClass + ' min-h-[100px]'} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="Use {{1}} for variables" /></Field>
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">Templates remain drafts until approved on the provider; delivery outside the service window requires approval.</p>
        </Modal>
      ) : null}
    </div>
  );
}

// Kept in small helpers so the screen stays readable.
async function apiFetchTemplate(form: { name: string; language: string; body: string; category: string }) {
  await apiFetch('/admin/communications/templates', {
    method: 'POST',
    body: { channel: 'WHATSAPP', name: form.name, language: form.language, body: form.body, variables: { category: form.category }, status: 'DRAFT' },
  });
}

function toastTemplate() {
  toast.success('Template draft created');
}

function toastError(error: unknown) {
  toast.error((error as Error).message || 'Could not create template');
}
