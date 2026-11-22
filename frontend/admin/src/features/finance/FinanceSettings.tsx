import { useState } from 'react';
import { Button, Card, Field, PageHeader, Table } from '@/components';
import { Badge } from '@/lib/Badge';
import { formatDateTime } from '@/lib/format';
import {
  CapabilityBadge,
  ErrorNotice,
  capabilityState,
  inputClass,
  listFrom,
  useResource,
  valueFrom,
  type ApiRow,
} from './shared';

/** Capability matrix, East Africa channel readiness, routing guardrails and audit trail. */
export default function FinanceSettings() {
  const [auditFilter, setAuditFilter] = useState('');
  const capabilities = useResource<ApiRow>('/admin/finance/capabilities');
  const audit = useResource<ApiRow>(auditFilter ? `/admin/finance/audit?action=${encodeURIComponent(auditFilter)}` : '/admin/finance/audit');

  // The backend returns { providers: [...], payheroChannels: [...], policy: {...} }.
  const providers = listFrom(capabilities.data, 'providers');
  const channels = listFrom(capabilities.data, 'payheroChannels', 'channels');
  const policy = valueFrom(capabilities.data, 'policy', {}) as ApiRow;
  const auditRows = listFrom(audit.data, 'audit', 'entries', 'logs', 'auditLogs');
  const providerActions = ['collect', 'refund', 'payout_b2c', 'payout_b2b', 'status', 'webhook', 'reconciliation', 'settlement'];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Settings"
        subtitle="Provider capability status, East Africa channel readiness, sensitive-action guardrails and audit trail."
        actions={<Button variant="outline" onClick={() => void Promise.all([capabilities.reload(), audit.reload()])}>Refresh</Button>}
      />

      <Card>
        <h2 className="mb-3 font-semibold">Provider capabilities</h2>
        <ErrorNotice error={capabilities.error} onRetry={() => void capabilities.reload()} />
        {capabilities.loading ? <p className="text-sm text-[var(--text-muted)]">Loading capabilities…</p> : null}
        {!capabilities.loading && providers.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No capability map published yet.</p> : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider, index) => {
            const actions = (provider.actions ?? {}) as ApiRow;
            return (
              <div key={String(provider.key ?? provider.provider ?? index)} className="rounded-lg border border-[var(--border)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{String(provider.label ?? provider.key ?? provider.provider ?? 'Provider')}</span>
                  <CapabilityBadge label="" state={provider.available === true} />
                </div>
                {provider.defaultFor ? (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Default region: {String(provider.defaultFor)}</p>
                ) : null}
                {provider.unavailableReason ? (
                  <p className="mt-1 text-xs text-amber-700">{String(provider.unavailableReason)}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {providerActions.map((action) => (
                    <CapabilityBadge
                      key={action}
                      label={action.replace(/_/g, ' ')}
                      state={actions[action] === true}
                      reason={(provider.reasons as ApiRow | undefined)?.[action]}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Actions marked unavailable are rejected by the backend even if a stale UI control is visible. Stripe and Paystack stay legacy-only.
        </p>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">East Africa channel readiness</h2>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          PayHero and Safaricom Daraja rails for M-Pesa, Airtel Money, telcos, banks and wallets. Channels stay visible but disabled until their dedicated config is present — no channel id is reused.
        </p>
        {channels.length === 0 ? (
          <p className="py-4 text-sm text-[var(--text-muted)]">No PayHero channel matrix published.</p>
        ) : (
          <Table<ApiRow>
            columns={[
              { key: 'label', header: 'Channel', render: (row) => <span className="font-medium">{String(row.label ?? row.id ?? '—')}</span> },
              { key: 'network', header: 'Network', render: (row) => String(row.network ?? '—') },
              { key: 'flow', header: 'Flow', render: (row) => <Badge tone="slate">{String(row.flow ?? '—')}</Badge> },
              {
                key: 'status',
                header: 'Readiness',
                render: (row) => <CapabilityBadge label="" state={row.enabled === true} reason={row.reason} />,
              },
              { key: 'config', header: 'Requires', render: (row) => <code className="text-xs">{String(row.configKey ?? '—')}</code> },
            ]}
            rows={channels}
          />
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Routing guardrails</h2>
        {Object.keys(policy).length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No routing policy published.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {Object.entries(policy).map(([region, description]) => (
              <div key={region} className="rounded-lg border border-[var(--border)] p-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{region}</div>
                <p className="text-xs text-[var(--text-secondary)]">{String(description ?? '—')}</p>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Amounts are held server-side; no KES→USD 1:1 conversion is performed and original currency/amount are preserved for reconciliation.
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Audit trail</h2>
        <p className="mb-3 text-sm text-[var(--text-muted)]">Connection changes, payout approvals, refunds and exports are recorded here.</p>
        <div className="mb-3 flex flex-wrap gap-2">
          <Field label="Filter by action">
            <input className={inputClass + ' max-w-xs'} placeholder="e.g. finance.payout" value={auditFilter} onChange={(event) => setAuditFilter(event.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button variant="outline" onClick={() => void audit.reload()} disabled={audit.loading}>Apply</Button>
          </div>
        </div>
        {audit.error ? <p className="mb-2 text-sm text-red-600">{audit.error}</p> : null}
        {auditRows.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No audit entries.</p> : (
          <Table<ApiRow>
            columns={[
              { key: 'action', header: 'Action', render: (row) => String(row.action ?? '—') },
              { key: 'actor', header: 'Actor', render: (row) => String(row.actorId ?? row.actorRole ?? '—') },
              { key: 'entity', header: 'Entity', render: (row) => String(row.entity ?? '—') },
              { key: 'meta', header: 'Details', render: (row) => row.meta ? <span className="font-mono text-xs">{JSON.stringify(row.meta).slice(0, 120)}</span> : '—' },
              { key: 'when', header: 'When', render: (row) => formatDateTime(row.createdAt) },
            ]}
            rows={auditRows.slice(0, 40)}
          />
        )}
        <Badge tone="slate">Secrets are encrypted and never rendered</Badge>
      </Card>
    </div>
  );
}
