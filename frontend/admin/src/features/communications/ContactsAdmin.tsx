import { useState } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { toast } from '@angisoft/utils';
import { Button, Card, Field, PageHeader, Table, useCrud } from '@/components';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';
import { formatDateTime } from '@/lib/format';
import { inputClass, listFrom, parseJson, stringifyJson, type ApiRow } from './shared';

const emptyForm = { displayName: '', email: '', phone: '', company: '', identities: '' };

/** Unified contact directory shared by every communications channel. */
export default function ContactsAdmin() {
  const { rows, loading, error, refresh } = useCrud<ApiRow>({
    endpoint: '/admin/communications/contacts',
    transform: (data) => listFrom(data, 'contacts'),
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiRow | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const openEditor = (row: ApiRow | null) => {
    setEditing(row);
    setForm(row ? {
      displayName: String(row.displayName ?? row.name ?? ''),
      email: String(row.email ?? ''),
      phone: String(row.phone ?? ''),
      company: String(row.company ?? ''),
      identities: stringifyJson(row.identities),
    } : { ...emptyForm });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const identities = parseJson(form.identities, 'Identities');
      await apiFetch(editing ? `/admin/communications/contacts/${editing.id}` : '/admin/communications/contacts', {
        method: editing ? 'PATCH' : 'POST',
        body: {
          displayName: form.displayName,
          email: form.email || undefined,
          phone: form.phone || undefined,
          company: form.company || undefined,
          identities: identities ?? undefined,
        },
      });
      toast.success(editing ? 'Contact updated' : 'Contact created');
      setOpen(false);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message || 'Could not save contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        subtitle="People and organisations linked across email, phone, WhatsApp and social identities."
        actions={<><Button variant="outline" onClick={() => void refresh()} disabled={loading}>Refresh</Button><Button onClick={() => openEditor(null)}>New contact</Button></>}
      />
      {error ? <Card className="border-red-300 text-sm">{error}</Card> : null}
      <Card>
        <Table<ApiRow>
          columns={[
            { key: 'name', header: 'Contact', render: (row) => <span className="font-medium">{String(row.displayName ?? row.name ?? '—')}</span> },
            { key: 'email', header: 'Email', render: (row) => String(row.email ?? '—') },
            { key: 'phone', header: 'Phone', render: (row) => String(row.phone ?? '—') },
            { key: 'identities', header: 'Channels', render: (row) => {
              const identities = Array.isArray(row.identities) ? row.identities as ApiRow[] : [];
              return identities.length === 0 ? '—' : <span className="flex flex-wrap gap-1">{identities.map((identity, index) => <Badge key={String(identity.id ?? index)}>{String(identity.channel ?? 'ID')}</Badge>)}</span>;
            } },
            { key: 'updatedAt', header: 'Updated', render: (row) => formatDateTime(row.updatedAt ?? row.createdAt) },
          ]}
          rows={rows}
          onEdit={openEditor}
        />
      </Card>

      {open ? (
        <Modal
          title={editing ? 'Edit contact' : 'New contact'}
          onClose={() => setOpen(false)}
          wide
          footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => void save()} disabled={saving || !form.displayName}>{saving ? 'Saving…' : 'Save contact'}</Button></>}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Display name"><input className={inputClass} value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></Field>
            <Field label="Company"><input className={inputClass} value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} /></Field>
            <Field label="Email"><input className={inputClass} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
            <Field label="Phone"><input className={inputClass} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
          </div>
          <div className="mt-3">
            <Field label="Channel identities (optional JSON)">
              <textarea className={inputClass + ' min-h-[100px]'} value={form.identities} onChange={(event) => setForm({ ...form, identities: event.target.value })} placeholder='[{"channel":"WHATSAPP","value":"2547..."}]' />
            </Field>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
