import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';
import { Button, Card, EmptyState, PageHeader, Spinner, Table } from '@/components';
import { formatDate } from '@/lib/format';

/**
 * Portfolio Studio moderation (plan Phase 3.5) — admins/HR/managers review every
 * employee's published portfolio config and can publish/unpublish on their
 * behalf. Owners keep self-service control in `/workspace/portfolio-studio`.
 */

interface EmployeeRef {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
}

interface PortfolioConfigRow {
  id: string;
  employeeId: string;
  theme: string;
  layout: string;
  sections: unknown;
  draftConfig: Record<string, unknown> | null;
  publishedConfig: Record<string, unknown> | null;
  published: boolean;
  version: number;
  updatedAt: string;
  employee?: EmployeeRef | null;
}

const employeeName = (e?: EmployeeRef | null) =>
  e ? [e.firstName, e.lastName].filter(Boolean).join(' ') || e.username || e.email || e.id : '—';

export function PortfolioApprovals() {
  const [rows, setRows] = useState<PortfolioConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/v1/employee-profiles/portfolio-config/admin/all');
      setRows(Array.isArray(data) ? (data as PortfolioConfigRow[]) : []);
    } catch (e) {
      setError((e as Error).message || 'Failed to load portfolio configs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const moderate = async (row: PortfolioConfigRow, action: 'publish' | 'unpublish') => {
    setBusyId(row.id);
    setError(null);
    try {
      await apiFetch(`/v1/employee-profiles/portfolio-config/${row.employeeId}/${action}`, { method: 'POST' });
      await load();
    } catch (e) {
      setError((e as Error).message || `Failed to ${action}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Portfolio Approvals"
        subtitle="Review and moderate employee portfolio publications (Portfolio Studio)."
        actions={<Button variant="outline" onClick={() => void load()}>Refresh</Button>}
      />

      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <Card><Spinner /></Card>
      ) : rows.length === 0 ? (
        <Card><EmptyState title="No portfolio configs yet" /></Card>
      ) : (
        <Table<PortfolioConfigRow>
          rows={rows}
          columns={[
            {
              key: 'employee',
              header: 'Employee',
              render: (r) => (
                <div>
                  <div className="font-medium">{employeeName(r.employee)}</div>
                  <div className="text-xs text-[var(--text-muted)]">{r.employee?.email ?? ''}</div>
                </div>
              ),
            },
            { key: 'theme', header: 'Theme' },
            { key: 'layout', header: 'Layout' },
            {
              key: 'published',
              header: 'Status',
              render: (r) => (r.published ? <Badge tone="green">Live · v{r.version}</Badge> : <Badge tone="slate">Draft · v{r.version}</Badge>),
            },
            { key: 'updatedAt', header: 'Updated', render: (r) => formatDate(r.updatedAt) },
          ]}
          onEdit={(r) => setExpanded(expanded === r.id ? null : r.id)}
        />
      )}

      {expanded
        ? (() => {
            const row = rows.find((r) => r.id === expanded);
            if (!row) return null;
            return (
              <Card className="mt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{employeeName(row.employee)} — config payload</h3>
                  <div className="flex gap-2">
                    {row.published ? (
                      <Button variant="danger" disabled={busyId === row.id} onClick={() => void moderate(row, 'unpublish')}>
                        Unpublish
                      </Button>
                    ) : (
                      <Button disabled={busyId === row.id} onClick={() => void moderate(row, 'publish')}>
                        Publish
                      </Button>
                    )}
                  </div>
                </div>
                <pre className="max-h-96 overflow-auto rounded-lg bg-[var(--bg-primary)] p-3 text-xs">
                  {JSON.stringify({ sections: row.sections, draftConfig: row.draftConfig, publishedConfig: row.publishedConfig }, null, 2)}
                </pre>
              </Card>
            );
          })()
        : null}
    </div>
  );
}

export default PortfolioApprovals;
