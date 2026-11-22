import { useState } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { useEffectiveAccess } from '@/lib/permissions';
import { toast } from '@angisoft/utils';
import { Button, Card, Field, PageHeader, Table, useCrud } from '@/components';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';
import { formatDateTime } from '@/lib/format';
import { inputClass, listFrom, parseJson, stringifyJson, type ApiRow } from './shared';

const emptyForm = { channel: 'WHATSAPP', provider: '', name: '', language: 'en', status: 'DRAFT', externalId: '', body: '', variables: '' };

/** Channel-aware message template library. */
export default function TemplatesAdmin() {
  const { can } = useEffectiveAccess();
  const { rows, loading, error, refresh, remove } = useCrud<ApiRow>({
    endpoint: '/admin/communications/templates',
    transform: (data) => listFrom(data, 'templates'),
  });
  const [editing, setEditing] = useState<ApiRow | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const manageable = can('communications.templates.manage');

  const openEditor = (row: ApiRow | null) => {
    setEditing(row);
    setForm(row ? {
      channel: String(row.channel ?? 'WHATSAPP'),
      provider: String(row.provider ?? ''),
      name: String(row.name ?? ''),
      language: String(row.language ?? 'en'),
      status: String(row.status ?? 'DRAFT'),
      externalId: String(row.externalId ?? ''),
      body: String(row.body ?? ''),
      variables: stringifyJson(row.variables),
    } : { ...emptyForm });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      let variables: unknown;
      try {
        variables = parseJson(form.variables, 'Variables');
      } catch (e) {
        toast.error((e as Error).message);
        return;
      }
      const payload = {
        channel: form.channel,
        provider: form.provider || undefined,
        name: form.name,
        language: form.language,
        status: form.status,
        externalId: form.externalId || undefined,
        body: form.body || undefined,
        variables,
      };
      await apiFetch(editing ? `/admin/communications/templates/${editing.id}` : '/admin/communications/templates', {
        method: editing ? 'PATCH' : 'POST',
        body: payload,
      });
      toast.success(editing ? 'Template updated' : 'Template created');
      setOpen(false);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message || 'Could not save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Message Templates"
        subtitle="Approved, channel-aware templates for WhatsApp, email, Telegram and social replies."
        actions={<><Button variant="outline" onClick={() => void refresh()} disabled={loading}>Refresh</Button><Button onClick={() => openEditor(null)} disabled={!manageable}>New template</Button></>}
      />
      {error ? <Card className="border-red-300 text-sm">{error}</Card> : null}
      <Card>
        <Table<ApiRow>
          columns={[
            { key: 'name', header: 'Name', render: (row) => <span className="font-medium">{String(row.name ?? '—')}</span> },
            { key: 'channel', header: 'Channel', render: (row) => <Badge>{String(row.channel ?? '—')}</Badge> },
            { key: 'language', header: 'Language', render: (row) => String(row.language ?? '—') },
            { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.status ?? 'DRAFT')}</Badge> },
            { key: 'updatedAt', header: 'Updated', render: (row) => formatDateTime(row.updatedAt ?? row.createdAt) },
          ]}
          rows={rows}
          onEdit={manageable ? openEditor : undefined}
          onDelete={manageable ? (row) => { void remove(String(row.id)); } : undefined}
        />
      </Card>

      {open ? (
        <Modal
          title={editing ? 'Edit template' : 'New template'}
          onClose={() => setOpen(false)}
          wide
          footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => void save()} disabled={saving || !form.name || !form.channel}>{saving ? 'Saving…' : 'Save template'}</Button></>}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Channel"><input className={inputClass} value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })} /></Field>
            <Field label="Provider (optional)"><input className={inputClass} value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })} /></Field>
            <Field label="Name"><input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="Language"><input className={inputClass} value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })} /></Field>
            <Field label="Status"><input className={inputClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} /></Field>
            <Field label="Provider template ID (optional)"><input className={inputClass} value={form.externalId} onChange={(event) => setForm({ ...form, externalId: event.target.value })} /></Field>
          </div>
          <div className="mt-3">
            <Field label="Body"><textarea className={inputClass + ' min-h-[120px]'} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></Field>
          </div>
          <div className="mt-3">
            <Field label="Variables (optional JSON)"><textarea className={inputClass + ' min-h-[80px]'} value={form.variables} onChange={(event) => setForm({ ...form, variables: event.target.value })} /></Field>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
