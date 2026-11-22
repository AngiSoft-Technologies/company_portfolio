import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/adminApi';
import { Button, Card, PageHeader, Table } from '@/components';
import { Badge } from '@/lib/Badge';
import { formatDateTime, formatKsh } from '@/lib/format';
import {
  CapabilityBadge,
  ErrorNotice,
  ResourceState,
  capabilityState,
  listFrom,
  valueFrom,
  type ApiRow,
} from './shared';

const PROVIDERS = [
  { key: 'PAYHERO', label: 'PayHero' },
  { key: 'MPESA', label: 'M-Pesa' },
  { key: 'PAYSTACK', label: 'Paystack' },
  { key: 'PAYPAL', label: 'PayPal' },
  { key: 'PESAFLOW', label: 'PesaFlow' },
  { key: 'BANK', label: 'Bank' },
];

/** Finance command centre — operational state across providers, ledger and payouts. */
export default function FinanceOverview() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<ApiRow | null>(null);
  const [capabilities, setCapabilities] = useState<ApiRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [o, c] = await Promise.all([
        apiFetch('/admin/finance/overview'),
        apiFetch('/admin/finance/capabilities').catch(() => ({})),
      ]);
      setOverview(o as ApiRow);
      setCapabilities((c ?? {}) as ApiRow);
      setError(null);
    } catch (e) {
      setError((e as Error).message || 'Failed to load finance overview');
      setOverview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const data: ApiRow = overview ?? ({} as ApiRow);
  const connections = valueFrom(data, 'connections', {}) as ApiRow;
  const payments = valueFrom(data, 'payments', {}) as ApiRow;
  const payouts = valueFrom(data, 'payouts', {}) as ApiRow;
  const events = listFrom(data, 'recentEvents', 'events', 'providerEvents');
  const summary = (value: ApiRow) => Object.entries((value.byStatus ?? value.counts ?? {}) as ApiRow)
    .map(([status, count]) => `${status}: ${count}`)
    .join(' · ') || 'No activity';
  const metrics = [
    { label: 'Provider connections', value: Number(connections.total ?? 0), hint: summary(connections) },
    { label: 'Payments', value: Number(payments.total ?? 0), hint: summary(payments) },
    { label: 'Payouts', value: Number(payouts.total ?? 0), hint: summary(payouts) },
    { label: 'Recent provider events', value: events.length, hint: 'Webhooks and reconciliation activity' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Overview"
        subtitle="Provider health, collections, payouts and reconciliation across the finance command centre."
        actions={<Button variant="outline" onClick={() => void load()} disabled={loading}>Refresh</Button>}
      />

      <ResourceState loading={loading} error={error} onRetry={() => void load()}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{metric.label}</div>
              <div className="mt-1 text-2xl font-bold">{metric.value}</div>
              <div className="mt-1 truncate text-xs text-[var(--text-muted)]" title={metric.hint}>{metric.hint}</div>
            </Card>
          ))}
        </div>

        <Card>
          <h2 className="mb-3 font-semibold">Provider capability</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROVIDERS.map((provider) => {
              const state = capabilityState(capabilities, provider.key, provider.key.toLowerCase());
              return (
                <div key={provider.key} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
                  <span className="text-sm font-medium">{provider.label}</span>
                  <CapabilityBadge label="" state={state} />
                </div>
              );
            })}
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-semibold">Provider events</h2>
            {events.length === 0 ? <p className="py-8 text-center text-sm text-[var(--text-muted)]">No provider events recorded.</p> : (
              <Table<ApiRow>
                columns={[
                  { key: 'event', header: 'Event', render: (row) => String(row.eventType ?? row.type ?? '—') },
                  { key: 'provider', header: 'Provider', render: (row) => String(row.provider ?? '—') },
                  { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.status ?? '—')}</Badge> },
                  { key: 'hint', header: 'Operator hint', render: (row) => <span className="text-xs text-[var(--text-muted)]">{String(row.operatorHint ?? '—')}</span> },
                  { key: 'when', header: 'When', render: (row) => formatDateTime(row.createdAt) },
                ]}
                rows={events.slice(0, 8)}
              />
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">Recent payments</h2>
            <p className="mb-2 text-xs text-[var(--text-muted)]">For full filters and exports use the Transactions screen.</p>
            <Button variant="ghost" onClick={() => navigate('/finance/transactions')}>Open transactions →</Button>
            <div className="mt-3">
              {Array.isArray(data.recentPayments) ? (
                <Table<ApiRow>
                  columns={[
                    { key: 'ref', header: 'Reference', render: (row) => String(row.reference ?? row.id ?? '—') },
                    { key: 'amount', header: 'Amount', render: (row) => formatKsh(row.amount) },
                    { key: 'status', header: 'Status', render: (row) => <Badge>{String(row.status ?? '—')}</Badge> },
                  ]}
                  rows={listFrom(data, 'recentPayments').slice(0, 8)}
                />
              ) : (
                <p className="py-6 text-center text-sm text-[var(--text-muted)]">No recent payments supplied by the overview.</p>
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate('/finance/transactions')}>Transactions</Button>
          <Button variant="outline" onClick={() => navigate('/finance/payouts')}>Payouts</Button>
          <Button variant="outline" onClick={() => navigate('/finance/reconciliation')}>Reconciliation</Button>
          <Button variant="outline" onClick={() => navigate('/finance/settings')}>Capabilities & audit</Button>
        </div>
        {data.errors ? <ErrorNotice error={String(data.errors)} /> : null}
      </ResourceState>
    </div>
  );
}
