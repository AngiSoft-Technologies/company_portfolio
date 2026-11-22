import { useCallback, useEffect, useState } from 'react';
import { Button, Card, EmptyState, Field, PageHeader, Spinner, inputClass } from '@/components';
import { Badge } from '@/lib/Badge';
import { apiFetch } from '@/lib/adminApi';

interface AuditLogRow {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  meta: unknown;
  createdAt: string;
}

interface AuditLogsResponse {
  logs: AuditLogRow[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_SIZE = 50;

export function AuditLogViewer() {
  const [data, setData] = useState<AuditLogsResponse | null>(null);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [actorId, setActorId] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: String(PAGE_SIZE) });
      if (entity.trim()) params.set('entity', entity.trim());
      if (action.trim()) params.set('action', action.trim());
      if (actorId.trim()) params.set('actorId', actorId.trim());
      const json = (await apiFetch(`/v1/admin/audit-logs?${params}`)) as AuditLogsResponse;
      setData(json);
      setPage(json.page);
    } catch (e) {
      setError((e as Error).message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [entity, action, actorId]);

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Administrative and content change history." />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Entity">
            <input
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              placeholder="e.g. Invoice"
              className={inputClass}
            />
          </Field>
          <Field label="Action">
            <input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="e.g. publish"
              className={inputClass}
            />
          </Field>
          <Field label="Actor ID">
            <input
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              placeholder="employee id"
              className={inputClass}
            />
          </Field>
          <div className="flex items-end gap-2">
            <Button onClick={() => void load(1)}>Filter</Button>
            <Button
              variant="outline"
              onClick={() => {
                setEntity('');
                setAction('');
                setActorId('');
                void load(1);
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {loading ? <Spinner /> : null}

      {!loading && data && data.logs.length === 0 ? <EmptyState title="No audit entries match these filters" /> : null}

      {!loading && data && data.logs.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Actor</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Entity</th>
                  <th className="py-2 pr-4">Entity ID</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log) => (
                  <tr key={log.id} className="border-b border-[var(--border-light)] last:border-0">
                    <td className="whitespace-nowrap py-2 pr-4 text-xs text-[var(--text-muted)]">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="text-xs">{log.actorId ?? 'system'}</div>
                      {log.actorRole ? <Badge tone="slate">{log.actorRole}</Badge> : null}
                    </td>
                    <td className="py-2 pr-4 font-medium">{log.action}</td>
                    <td className="py-2 pr-4">{log.entity}</td>
                    <td className="max-w-[10rem] truncate py-2 pr-4 font-mono text-xs text-[var(--text-muted)]">
                      {log.entityId ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-[var(--text-muted)]">
            <span>
              Page {data.page} of {totalPages} · {data.total} entries
            </span>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page <= 1 || loading} onClick={() => void load(page - 1)}>
                Previous
              </Button>
              <Button variant="outline" disabled={page >= totalPages || loading} onClick={() => void load(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

export default AuditLogViewer;
