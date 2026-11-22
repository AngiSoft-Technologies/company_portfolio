import { useState } from 'react';
import { useEffectiveAccess } from '@/lib/permissions';
import { toast } from '@angisoft/utils';
import { Button, Card, Field, PageHeader, Table } from '@/components';
import { Badge } from '@/lib/Badge';
import { formatDateTime, formatKsh } from '@/lib/format';
import { ErrorNotice, downloadPayload, inputClass, listFrom, useResource, type ApiRow } from './shared';

const TABS = [
  { key: 'payments', header: 'Payments', listKeys: ['payments'] },
  { key: 'ledgerEntries', header: 'Ledger', listKeys: ['ledgerEntries', 'ledger'] },
  { key: 'payouts', header: 'Payouts', listKeys: ['payouts'] },
];

/** Unified transaction view with filters and audited export. */
export default function FinanceTransactions() {
  const { can } = useEffectiveAccess();
  const [tab, setTab] = useState('payments');
  const [filters, setFilters] = useState({ provider: '', status: '', from: '', to: '', limit: '100' });
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
  const transactions = useResource<ApiRow>(`/admin/finance/transactions?${query.toString()}`);
  const data = transactions.data ?? {};
  const activeTab = TABS.find((item) => item.key === tab) ?? TABS[0];
  const rows = listFrom(data, ...activeTab.listKeys);

  const exportCsv = async () => {
    try {
      await downloadPayload(`/admin/finance/transactions/export?${query.toString()}`, 'finance-transactions.json');
      toast.success('Export downloaded');
    } catch (e) {
      toast.error((e as Error).message || 'Export failed');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        subtitle="Payments, immutable ledger entries and payouts in one searchable view."
        actions={<><Button variant="outline" onClick={() => void transactions.reload()} disabled={transactions.loading}>Refresh</Button><Button onClick={() => void exportCsv()} disabled={!can('finance.transactions.export')}>Export</Button></>}
      />

      <Card>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Provider"><input className={inputClass} value={filters.provider} onChange={(event) => setFilters({ ...filters, provider: event.target.value })} placeholder="PAYHERO" /></Field>
          <Field label="Status"><input className={inputClass} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} placeholder="SUCCEEDED" /></Field>
          <Field label="From"><input type="date" className={inputClass} value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></Field>
          <Field label="To"><input type="date" className={inputClass} value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></Field>
          <Field label="Limit"><input type="number" className={inputClass} value={filters.limit} onChange={(event) => setFilters({ ...filters, limit: event.target.value })} /></Field>
          <div className="flex items-end"><Button className="w-full" onClick={() => void transactions.reload()}>Apply filters</Button></div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${tab === item.key ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}
          >
            {item.header}
          </button>
        ))}
      </div>

      <ErrorNotice error={transactions.error} onRetry={() => void transactions.reload()} />
      <Card>
        {transactions.loading ? <p className="py-10 text-center text-sm text-[var(--text-muted)]">Loading transactions…</p> : null}
        {!transactions.loading && rows.length === 0 ? <p className="py-10 text-center text-sm text-[var(--text-muted)]">No {activeTab.header.toLowerCase()} match these filters.</p> : null}
        {!transactions.loading && rows.length > 0 ? (
          <Table<ApiRow>
            columns={[
              { key: 'reference', header: 'Reference', render: (row) => String(row.reference ?? row.externalRef ?? row.id ?? '—') },
              { key: 'provider', header: 'Provider', render: (row) => String(row.provider ?? '—') },
              { key: 'type', header: 'Type', render: (row) => <Badge>{String(row.type ?? row.channel ?? row.direction ?? '—')}</Badge> },
              { key: 'amount', header: 'Amount', render: (row) => formatKsh(row.net ?? row.amount) },
              { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.status ?? '—')}</Badge> },
              { key: 'date', header: 'Date', render: (row) => formatDateTime(row.postedAt ?? row.createdAt ?? row.occurredAt) },
            ]}
            rows={rows}
          />
        ) : null}
      </Card>
    </div>
  );
}
