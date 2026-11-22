import { useState } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { useEffectiveAccess } from '@/lib/permissions';
import { toast } from '@angisoft/utils';
import { Button, Card, Field, PageHeader, Table, useCrud } from '@/components';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';
import { formatDateTime } from '@/lib/format';
import { CapabilityBadge, capabilityState, inputClass, listFrom, useResource, type ApiRow } from './shared';

const blank = { name: '', connectionId: '', type: 'WALLET', currency: 'KES', accountNumber: '', externalId: '', status: 'ACTIVE' };

/** Wallets, bank accounts and payout destinations across finance providers. */
export default function FinanceAccounts() {
  const { can } = useEffectiveAccess();
  const { rows, loading, error, refresh, remove } = useCrud<ApiRow>({
    endpoint: '/admin/finance/accounts',
    transform: (data) => listFrom(data, 'accounts', 'financeAccounts'),
  });
  const connections = useResource<ApiRow>('/admin/finance/connections');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiRow | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [busy, setBusy] = useState(false);
  const manageable = can('finance.accounts.manage');
  const connectionRows = listFrom(connections.data, 'connections');

  const openEditor = (row: ApiRow | null) => {
    setEditing(row);
    setForm(row ? {
      name: String(row.name ?? ''),
      connectionId: String(row.connectionId ?? row.connection?.id ?? ''),
      type: String(row.type ?? 'WALLET'),
      currency: String(row.currency ?? 'KES'),
      accountNumber: '',
      externalId: String(row.externalId ?? ''),
      status: String(row.status ?? 'ACTIVE'),
    } : { ...blank });
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      await apiFetch(editing ? `/admin/finance/accounts/${editing.id}` : '/admin/finance/accounts', {
        method: editing ? 'PATCH' : 'POST',
        body: {
          name: form.name,
          connectionId: form.connectionId || undefined,
          type: form.type,
          currency: form.currency,
          externalId: form.externalId || undefined,
          status: form.status,
          ...(form.accountNumber ? { accountNumber: form.accountNumber } : {}),
        },
      });
      toast.success(editing ? 'Account updated' : 'Account created');
      setOpen(false);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message || 'Could not save account');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Accounts"
        subtitle="Normalized wallets, bank accounts and payout destinations with capability status."
        actions={<><Button variant="outline" onClick={() => void refresh()} disabled={loading}>Refresh</Button><Button onClick={() => openEditor(null)} disabled={!manageable}>Add account</Button></>}
      />
      {error ? <Card className="border-red-300 text-sm">{error}</Card> : null}
      <Card>
        <Table<ApiRow>
          columns={[
            { key: 'name', header: 'Account', render: (row) => <span className="font-medium">{String(row.name ?? '—')}</span> },
            { key: 'provider', header: 'Provider', render: (row) => String(row.provider ?? row.connection?.provider ?? '—') },
            { key: 'type', header: 'Type', render: (row) => <Badge>{String(row.type ?? 'WALLET')}</Badge> },
            { key: 'currency', header: 'Currency', render: (row) => String(row.currency ?? '—') },
            { key: 'accountNumber', header: 'Number', render: (row) => row.accountNumber ? <span className="font-mono text-xs">••••{String(row.accountNumber).slice(-4)}</span> : '—' },
            { key: 'capabilities', header: 'Capabilities', render: (row) => (
              <span className="flex flex-wrap gap-2">
                <CapabilityBadge label="collect" state={capabilityState(row.capabilities, 'collect', 'collection')} />
                <CapabilityBadge label="payout" state={capabilityState(row.capabilities, 'payout', 'payouts')} />
              </span>
            ) },
            { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.status ?? 'ACTIVE')}</Badge> },
            { key: 'updatedAt', header: 'Updated', render: (row) => formatDateTime(row.updatedAt ?? row.createdAt) },
          ]}
          rows={rows}
          onEdit={manageable ? openEditor : undefined}
          onDelete={manageable ? (row) => { void remove(String(row.id)); } : undefined}
        />
      </Card>

      {open ? (
        <Modal
          title={editing ? 'Edit finance account' : 'Add finance account'}
          onClose={() => setOpen(false)}
          footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => void save()} disabled={busy || !form.name}>{busy ? 'Saving…' : 'Save'}</Button></>}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Account name"><input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="Connection">
              <select className={inputClass} value={form.connectionId} onChange={(event) => setForm({ ...form, connectionId: event.target.value })}>
                <option value="">No connection</option>
                {connectionRows.map((connection) => (
                  <option key={String(connection.id)} value={String(connection.id)}>{String(connection.name ?? connection.provider)}</option>
                ))}
              </select>
            </Field>
            <Field label="Type"><input className={inputClass} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} placeholder="WALLET, BANK, PAYPAL…" /></Field>
            <Field label="Currency"><input className={inputClass} value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} /></Field>
            <Field label="External ID"><input className={inputClass} value={form.externalId} onChange={(event) => setForm({ ...form, externalId: event.target.value })} /></Field>
            <Field label="Account number">
              <input className={inputClass} value={form.accountNumber} onChange={(event) => setForm({ ...form, accountNumber: event.target.value })} placeholder={editing ? 'Leave blank to keep existing' : 'Optional'} />
            </Field>
            <Field label="Status"><input className={inputClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} /></Field>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
