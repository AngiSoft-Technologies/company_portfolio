import { useCallback, useEffect, useState } from 'react';
import { Button, Card, EmptyState, Field, PageHeader, Spinner, Table, inputClass } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';

interface TicketRow {
  id: string;
  subject: string;
  status: string;
  priority: string;
  slaBreachedAt: string | null;
  createdAt: string;
  client?: { id: string; name: string; email: string } | null;
  _count?: { messages: number };
}

interface TicketMessage {
  id: string;
  body: string;
  internal: boolean;
  authorId: string | null;
  createdAt: string;
}

interface TicketDetail extends TicketRow {
  body: string;
  assignedToId: string | null;
  messages: TicketMessage[];
}

const STATUSES = ['open', 'in_progress', 'pending', 'resolved', 'closed'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

export function SupportTicketsAdmin() {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const data = await apiFetch(`/v1/support-tickets${qs}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const openDetail = async (id: string) => {
    setBusy(true);
    try {
      const data = (await apiFetch(`/v1/support-tickets/${id}`)) as TicketDetail;
      setDetail(data);
      setReply('');
      setInternal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ticket');
    } finally {
      setBusy(false);
    }
  };

  const updateTicket = async (patch: Record<string, unknown>) => {
    if (!detail) return;
    setBusy(true);
    try {
      await apiFetch(`/v1/support-tickets/${detail.id}`, { method: 'PUT', body: patch });
      await openDetail(detail.id);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!detail || !reply.trim()) return;
    setBusy(true);
    try {
      await apiFetch(`/v1/support-tickets/${detail.id}/messages`, {
        method: 'POST',
        body: { body: reply.trim(), internal },
      });
      setReply('');
      await openDetail(detail.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reply failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Support Tickets"
        subtitle="Customer support queue with SLA breach markers."
        actions={
          <select className={inputClass + ' w-auto'} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        }
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Card className="p-4">
        {loading ? <Spinner /> : rows.length === 0 ? <EmptyState title="No tickets" /> : (
          <Table<TicketRow & { id: string }>
            rows={rows}
            columns={[
              { key: 'subject', header: 'Subject', render: (r) => (
                <button className="text-left font-medium text-[var(--color-primary)] hover:underline" onClick={() => void openDetail(r.id)}>
                  {r.subject}
                </button>
              )},
              { key: 'client', header: 'Client', render: (r) => r.client?.name ?? '—' },
              { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status}>{r.status.replace('_', ' ')}</Badge> },
              { key: 'priority', header: 'Priority', render: (r) => <Badge tone={r.priority}>{r.priority}</Badge> },
              { key: 'sla', header: 'SLA', render: (r) => r.slaBreachedAt ? <Badge tone="red">Breached</Badge> : '—' },
              { key: 'messages', header: 'Msgs', render: (r) => r._count?.messages ?? 0 },
              { key: 'createdAt', header: 'Created', render: (r) => new Date(r.createdAt).toLocaleDateString() },
            ]}
          />
        )}
      </Card>

      {detail && (
      <Modal onClose={() => setDetail(null)} title={detail.subject} wide>
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">{detail.client?.name} · {detail.client?.email}</p>
            <p className="text-sm whitespace-pre-wrap">{detail.body}</p>
            {detail.slaBreachedAt && <Badge tone="red">SLA breached {new Date(detail.slaBreachedAt).toLocaleString()}</Badge>}
            <div className="flex flex-wrap gap-3">
              <Field label="Status">
                <select className={inputClass} value={detail.status} disabled={busy} onChange={(e) => void updateTicket({ status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select className={inputClass} value={detail.priority} disabled={busy} onChange={(e) => void updateTicket({ priority: e.target.value })}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>
            <div className="max-h-64 space-y-2 overflow-auto rounded-lg border border-[var(--border)] p-3">
              {(detail.messages ?? []).map((m) => (
                <div key={m.id} className={`rounded-lg p-2 text-sm ${m.internal ? 'bg-amber-50' : 'bg-[var(--surface-hover)]'}`}>
                  <div className="mb-0.5 text-xs text-[var(--text-muted)]">
                    {m.internal ? 'Internal note' : 'Reply'} · {new Date(m.createdAt).toLocaleString()}
                  </div>
                  {m.body}
                </div>
              ))}
              {(detail.messages ?? []).length === 0 && <p className="text-sm text-[var(--text-muted)]">No replies yet.</p>}
            </div>
            <Field label="Reply">
              <textarea className={inputClass} rows={3} value={reply} onChange={(e) => setReply(e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
              Internal note (staff only)
            </label>
            <Button onClick={() => void sendReply()} disabled={busy || !reply.trim()}>{busy ? 'Sending…' : 'Send reply'}</Button>
          </div>
      </Modal>
      )}
    </div>
  );
}

export default SupportTicketsAdmin;
