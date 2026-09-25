import { useCallback, useEffect, useState } from 'react';
import { Button, Card, EmptyState, PageHeader, Spinner, Table } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { toArr, rowId, type Rec } from '@/lib/records';
import { asStr, formatDateTime } from '@/lib/format';
import { Badge } from '@/lib/Badge';

export interface TicketRow extends Rec {
  id: string;
}

const STATUS_OPTIONS = ['new', 'open', 'in-progress', 'resolved', 'closed'];

export function ChatConversationsAdmin() {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const arr = toArr(await apiFetch('/api/support-tickets'));
      setRows(arr.map((r) => ({ ...r, id: rowId(r) })));
    } catch (e) {
      setError((e as Error).message || 'Failed to load support tickets');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (row: TicketRow, status: string) => {
    setBusyId(row.id);
    setError(null);
    try {
      await apiFetch(`/api/support-tickets/${encodeURIComponent(row.id)}`, { method: 'PUT', body: { status } });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)));
    } catch (e) {
      setError((e as Error).message || 'Failed to update ticket');
    } finally {
      setBusyId(null);
    }
  };

  const removeTicket = async (row: TicketRow) => {
    setBusyId(row.id);
    setError(null);
    try {
      await apiFetch(`/api/support-tickets/${encodeURIComponent(row.id)}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError((e as Error).message || 'Failed to delete ticket');
    } finally {
      setBusyId(null);
    }
  };

  const titleOf = (r: TicketRow) =>
    asStr(r, 'subject') !== '—' ? asStr(r, 'subject') : asStr(r, 'title');

  return (
    <div>
      <PageHeader
        title="Chat Conversations"
        subtitle="Support tickets and conversations."
        actions={
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {loading ? <Spinner /> : null}
      {!loading && error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <Card>
          <EmptyState title="No support tickets" />
        </Card>
      ) : (
        <Table<TicketRow>
          rows={rows}
          onDelete={removeTicket}
          columns={[
            {
              key: 'subject',
              header: 'Subject',
              render: (r) => <span className="font-medium">{titleOf(r)}</span>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => (
                <div className="flex items-center gap-2">
                  <Badge tone={undefined}>{asStr(r, 'status')}</Badge>
                  <select
                    value={String(r.status ?? '')}
                    disabled={busyId === r.id}
                    onChange={(e) => void updateStatus(r, e.target.value)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-[#0875FF]"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              ),
            },
            {
              key: 'assignee',
              header: 'Assignee',
              render: (r) => {
                const a = asStr(r, 'assigneeName');
                return a !== '—' ? a : asStr(r, 'assignee');
              },
            },
            {
              key: 'priority',
              header: 'Priority',
              render: (r) => <Badge tone={undefined}>{asStr(r, 'priority')}</Badge>,
            },
            { key: 'createdAt', header: 'Created', render: (r) => formatDateTime(r.createdAt) },
          ]}
        />
      )}
    </div>
  );
}

export default ChatConversationsAdmin;