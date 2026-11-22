import { useState } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { useEffectiveAccess } from '@/lib/permissions';
import { toast } from '@angisoft/utils';
import { Button, Card, Field, PageHeader, Table, useCrud } from '@/components';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';
import { formatDateTime } from '@/lib/format';
import { inputClass, listFrom, parseJson, stringifyJson, type ApiRow } from './shared';

const emptyForm = { name: '', channel: 'ALL', priority: '100', enabled: true, conditions: '', actions: '' };

/** Routing, SLA and automation rules — edits are audit-logged by the backend. */
export default function RulesAdmin() {
  const { can } = useEffectiveAccess();
  const { rows, loading, error, refresh, remove } = useCrud<ApiRow>({
    endpoint: '/admin/communications/rules',
    transform: (data) => listFrom(data, 'rules', 'routingRules'),
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiRow | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const manageable = can('communications.rules.manage');

  const openEditor = (row: ApiRow | null) => {
    setEditing(row);
    setForm(row ? {
      name: String(row.name ?? ''),
      channel: String(row.channel ?? 'ALL'),
      priority: String(row.priority ?? 100),
      enabled: row.enabled !== false,
      conditions: stringifyJson(row.conditions),
      actions: stringifyJson(row.actions),
    } : { ...emptyForm });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const conditions = parseJson(form.conditions, 'Conditions');
      const actions = parseJson(form.actions, 'Actions');
      await apiFetch(editing ? `/admin/communications/rules/${editing.id}` : '/admin/communications/rules', {
        method: editing ? 'PATCH' : 'POST',
        body: {
          name: form.name,
          channel: form.channel,
          priority: Number(form.priority) || 0,
          enabled: form.enabled,
          conditions,
          actions,
        },
      });
      toast.success(editing ? 'Rule updated' : 'Rule created');
      setOpen(false);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message || 'Could not save rule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Routing Rules"
        subtitle="Automatic assignment, tagging, priority and SLA rules applied to new conversations."
        actions={<><Button variant="outline" onClick={() => void refresh()} disabled={loading}>Refresh</Button><Button onClick={() => openEditor(null)} disabled={!manageable}>New rule</Button></>}
      />
      {error ? <Card className="border-red-300 text-sm">{error}</Card> : null}
      <Card>
        <Table<ApiRow>
          columns={[
            { key: 'name', header: 'Rule', render: (row) => <span className="font-medium">{String(row.name ?? '—')}</span> },
            { key: 'channel', header: 'Channel', render: (row) => <Badge>{String(row.channel ?? 'ALL')}</Badge> },
            { key: 'priority', header: 'Priority', render: (row) => String(row.priority ?? '—') },
            { key: 'enabled', header: 'Enabled', render: (row) => <Badge tone={row.enabled === false ? 'red' : 'green'}>{row.enabled === false ? 'Disabled' : 'Enabled'}</Badge> },
            { key: 'updatedAt', header: 'Updated', render: (row) => formatDateTime(row.updatedAt ?? row.createdAt) },
          ]}
          rows={rows}
          onEdit={manageable ? openEditor : undefined}
          onDelete={manageable ? (row) => { void remove(String(row.id)); } : undefined}
        />
      </Card>

      {open ? (
        <Modal
          title={editing ? 'Edit rule' : 'New rule'}
          onClose={() => setOpen(false)}
          wide
          footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => void save()} disabled={saving || !form.name}>{saving ? 'Saving…' : 'Save rule'}</Button></>}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Name"><input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="Channel"><input className={inputClass} value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })} /></Field>
            <Field label="Priority"><input type="number" className={inputClass} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} /></Field>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />
            Rule enabled
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Conditions (JSON)"><textarea className={inputClass + ' min-h-[120px]'} value={form.conditions} onChange={(event) => setForm({ ...form, conditions: event.target.value })} placeholder='{"channel":"WHATSAPP"}' /></Field>
            <Field label="Actions (JSON)"><textarea className={inputClass + ' min-h-[120px]'} value={form.actions} onChange={(event) => setForm({ ...form, actions: event.target.value })} placeholder='{"assignTo":"employee-id"}' /></Field>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
