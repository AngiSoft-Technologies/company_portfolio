import { useState } from 'react';
import { Button, Card, Field, PageHeader, Table } from '@/components';
import { Badge } from '@/lib/Badge';
import { formatDateTime } from '@/lib/format';
import { CapabilityBadge, ErrorNotice, capabilityState, inputClass, listFrom, useResource, type ApiRow } from './shared';

/** Capability matrix and finance audit trail. */
export default function FinanceSettings() {
  const [auditFilter, setAuditFilter] = useState('');
  const capabilities = useResource<ApiRow>('/admin/finance/capabilities');
  const audit = useResource<ApiRow>(auditFilter ? `/admin/finance/audit?action=${encodeURIComponent(auditFilter)}` : '/admin/finance/audit');
  const capabilityMap = (capabilities.data ?? {}) as ApiRow;
  const auditRows = listFrom(audit.data, 'audit', 'entries', 'logs', 'auditLogs');
  const providerKeys = Object.keys(capabilityMap).filter((key) => capabilityMap[key] && typeof capabilityMap[key] === 'object' && !Array.isArray(capabilityMap[key]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Settings"
        subtitle="Provider capability status, sensitive-action audit trail and configuration guardrails."
        actions={<Button variant="outline" onClick={() => void Promise.all([capabilities.reload(), audit.reload()])}>Refresh</Button>}
      />

      <Card>
        <h2 className="mb-3 font-semibold">Capabilities</h2>
        <ErrorNotice error={capabilities.error} onRetry={() => void capabilities.reload()} />
        {capabilities.loading ? <p className="text-sm text-[var(--text-muted)]">Loading capabilities…</p> : null}
        {!capabilities.loading && providerKeys.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No capability map published yet.</p> : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {providerKeys.map((provider) => {
            const config = (capabilityMap[provider] ?? {}) as ApiRow;
            return (
              <div key={provider} className="rounded-lg border border-[var(--border)] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{provider}</span>
                  <CapabilityBadge label="" state={capabilityState(capabilityMap, provider)} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['collect', 'refund', 'payout', 'disputes', 'settlements'].map((action) => (
                    <CapabilityBadge key={action} label={action} state={capabilityState(config, action)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Actions marked unavailable or limited are rejected by the backend even if a stale UI control is visible.
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Audit trail</h2>
        <p className="mb-3 text-sm text-[var(--text-muted)]">Connection changes, payout approvals, refunds and exports are recorded here.</p>
        <div className="mb-3 flex flex-wrap gap-2">
          <input className={inputClass + ' max-w-xs'} placeholder="Filter by action…" value={auditFilter} onChange={(event) => setAuditFilter(event.target.value)} />
          <Button variant="outline" onClick={() => void audit.reload()} disabled={audit.loading}>Apply</Button>
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
