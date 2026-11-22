import { useState } from 'react';
import { useEffectiveAccess } from '@/lib/permissions';
import { toast } from '@angisoft/utils';
import { Button, Card, Field, PageHeader, Table } from '@/components';
import { Badge } from '@/lib/Badge';
import { formatDateTime, formatKsh } from '@/lib/format';
import { downloadPayload, inputClass, listFrom, useResource, type ApiRow } from './shared';

/** Finance reports and summaries from the normalized ledger. */
export default function FinanceReports() {
  const { can } = useEffectiveAccess();
  const [filters, setFilters] = useState({ from: '', to: '', provider: '', type: '' });
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
  const reports = useResource<ApiRow>(`/admin/finance/reports?${query.toString()}`);
  const data: ApiRow = reports.data ?? ({} as ApiRow);
  const rows = listFrom(data, 'reports', 'items', 'results');
  const summary = (data.summary ?? data.totals ?? {}) as ApiRow;

  const exportReport = async () => {
    try {
      await downloadPayload(`/admin/finance/reports?${query.toString()}`, 'finance-report.json');
      toast.success('Report downloaded');
    } catch (e) {
      toast.error((e as Error).message || 'Could not download report');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Reports"
        subtitle="Ledger-backed summaries for collections, payouts, refunds and provider activity."
        actions={<><Button variant="outline" onClick={() => void reports.reload()} disabled={reports.loading}>Refresh</Button><Button onClick={() => void exportReport()} disabled={!can('finance.transactions.export')}>Download</Button></>}
      />

      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="From"><input type="date" className={inputClass} value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></Field>
          <Field label="To"><input type="date" className={inputClass} value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></Field>
          <Field label="Provider"><input className={inputClass} value={filters.provider} onChange={(event) => setFilters({ ...filters, provider: event.target.value })} /></Field>
          <Field label="Report type"><input className={inputClass} value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })} /></Field>
          <div className="flex items-end"><Button className="w-full" onClick={() => void reports.reload()}>Generate</Button></div>
        </div>
      </Card>

      {Object.keys(summary).length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(summary).slice(0, 8).map(([key, value]) => (
            <Card key={key}>
              <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{key.replace(/([A-Z])/g, ' $1')}</div>
              <div className="mt-1 text-xl font-bold">
                {typeof value === 'number' && /amount|total|sum|revenue/i.test(key) ? formatKsh(value) : String(value)}
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <Card>
        {reports.loading ? <p className="py-10 text-center text-sm text-[var(--text-muted)]">Generating report…</p> : null}
        {!reports.loading && rows.length === 0 ? <p className="py-10 text-center text-sm text-[var(--text-muted)]">No report rows for the selected period.</p> : null}
        {!reports.loading && rows.length > 0 ? (
          <Table<ApiRow>
            columns={[
              { key: 'name', header: 'Report', render: (row) => String(row.name ?? row.type ?? row.label ?? row.id) },
              { key: 'provider', header: 'Provider', render: (row) => String(row.provider ?? '—') },
              { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.status ?? 'READY')}</Badge> },
              { key: 'amount', header: 'Amount', render: (row) => formatKsh(row.amount ?? row.total ?? row.gross) },
              { key: 'generatedAt', header: 'Generated', render: (row) => formatDateTime(row.generatedAt ?? row.createdAt) },
            ]}
            rows={rows}
          />
        ) : null}
      </Card>
    </div>
  );
}
