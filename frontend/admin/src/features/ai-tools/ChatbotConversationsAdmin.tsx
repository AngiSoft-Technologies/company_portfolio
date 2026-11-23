import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, EmptyState, Field, PageHeader, Spinner, Table, inputClass } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';
import { formatDateTime } from '@/lib/format';
import { Modal } from '@/lib/Modal';
import { useCan } from '@/lib/permissions';

/**
 * Chatbot conversation review — human-in-the-loop follow-up for the public
 * assistant. All data comes from the guarded `/v1/chatbot/conversations*`
 * endpoints; the server enforces `chatbot.view_all` / `chatbot.respond` and the
 * UI only hides controls that would fail that enforcement anyway.
 */

interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  visitorName?: string | null;
  visitorEmail?: string | null;
  visitorPhone?: string | null;
  intent?: string | null;
  status: string;
  notes?: string | null;
  quality?: number | null;
  createdAt: string;
  updatedAt?: string;
  messages?: ChatMessage[];
}

interface ConversationList {
  conversations?: Conversation[];
  total?: number;
  pages?: number;
  page?: number;
}

const STATUS_OPTIONS = ['all', 'open', 'escalated', 'closed', 'converted'];
const INTENT_OPTIONS = ['all', 'booking', 'inquiry', 'support'];
const PAGE_SIZE = 20;

const selectClass = `${inputClass} cursor-pointer`;

function lastMessage(row: Conversation): string {
  const messages = row.messages ?? [];
  return messages.length ? messages[messages.length - 1].message : '—';
}

export function ChatbotConversationsAdmin() {
  const can = useCan();
  const canView = can('chatbot.view_all');
  const canRespond = can('chatbot.respond');

  const [rows, setRows] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('open');
  const [intent, setIntent] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Conversation | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [quality, setQuality] = useState('');
  const [detailStatus, setDetailStatus] = useState('open');
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status, page: String(page), limit: String(PAGE_SIZE) });
      const json = (await apiFetch(`/v1/chatbot/conversations?${params.toString()}`)) as ConversationList;
      setRows(json?.conversations ?? []);
      setTotal(json?.total ?? 0);
      setPages(Math.max(1, json?.pages ?? 1));
    } catch (e) {
      setError((e as Error).message || 'Failed to load chatbot conversations');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canView, status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const json = (await apiFetch(`/v1/chatbot/conversations/${encodeURIComponent(id)}`)) as Conversation;
      setDetail(json);
      setNotes(json?.notes ?? '');
      setQuality(json?.quality == null ? '' : String(json.quality));
      setDetailStatus(json?.status ?? 'open');
      setReply('');
    } catch (e) {
      setDetailError((e as Error).message || 'Failed to load conversation');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openConversation = (row: Conversation) => {
    setSelectedId(row.id);
    void loadDetail(row.id);
  };

  const closeConversation = () => {
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
    setReply('');
  };

  const visibleRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (intent !== 'all' && row.intent !== intent) return false;
      if (!needle) return true;
      return [row.visitorName, row.visitorEmail, row.visitorPhone, lastMessage(row)]
        .some((value) => String(value ?? '').toLowerCase().includes(needle));
    });
  }, [rows, intent, search]);

  const saveDetails = async () => {
    if (!detail) return;
    setSaving(true);
    setDetailError(null);
    try {
      await apiFetch(`/v1/chatbot/conversations/${encodeURIComponent(detail.id)}`, {
        method: 'PUT',
        body: {
          status: detailStatus,
          notes: notes.trim(),
          quality: quality === '' ? undefined : Number(quality),
        },
      });
      await Promise.all([loadDetail(detail.id), load()]);
    } catch (e) {
      setDetailError((e as Error).message || 'Failed to update conversation');
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async () => {
    if (!detail || !reply.trim()) return;
    setSaving(true);
    setDetailError(null);
    try {
      await apiFetch(`/v1/chatbot/conversations/${encodeURIComponent(detail.id)}/reply`, {
        method: 'POST',
        body: { message: reply.trim() },
      });
      setReply('');
      await Promise.all([loadDetail(detail.id), load()]);
    } catch (e) {
      setDetailError((e as Error).message || 'Failed to send reply');
    } finally {
      setSaving(false);
    }
  };

  if (!canView) {
    return (
      <div>
        <PageHeader title="Chatbot Conversations" subtitle="Review and follow up on public assistant chats." />
        <Card>
          <EmptyState title="You do not have permission to view chatbot conversations." />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Chatbot Conversations"
        subtitle="Review assistant chats, follow up with visitors and close the human-handoff loop."
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Status">
            <select
              className={selectClass}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              {STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Intent (this page)">
            <select className={selectClass} value={intent} onChange={(e) => setIntent(e.target.value)}>
              {INTENT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Search (this page)">
            <input
              className={inputClass}
              placeholder="Name, email, phone or message"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
        </div>
      </Card>

      {loading ? <Spinner /> : null}
      {!loading && error ? (
        <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
          <Badge tone="red">Error</Badge> <span className="ml-2">{error}</span>
        </div>
      ) : null}

      {!loading && visibleRows.length === 0 ? (
        <Card>
          <EmptyState title="No conversations match these filters" />
        </Card>
      ) : (
        <Table<Conversation>
          rows={visibleRows}
          onEdit={openConversation}
          columns={[
            {
              key: 'visitorName',
              header: 'Visitor',
              render: (r) => (
                <div>
                  <span className="font-medium">{r.visitorName || 'Guest'}</span>
                  <span className="block text-xs text-[var(--text-muted)]">{r.visitorEmail || '—'}</span>
                </div>
              ),
            },
            { key: 'intent', header: 'Intent', render: (r) => <Badge>{r.intent || 'unknown'}</Badge> },
            { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            {
              key: 'lastMessage',
              header: 'Latest message',
              render: (r) => <span className="line-clamp-1">{lastMessage(r)}</span>,
            },
            { key: 'createdAt', header: 'Created', render: (r) => formatDateTime(r.createdAt) },
          ]}
        />
      )}

      {total > PAGE_SIZE || page > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[var(--text-muted)]">
          <span>
            Page {page} of {pages} — {total} conversation{total === 1 ? '' : 's'}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button variant="outline" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {selectedId ? (
        <Modal
          wide
          title="Conversation detail"
          onClose={closeConversation}
          footer={
            <Button variant="outline" onClick={closeConversation}>
              Close
            </Button>
          }
        >
          {detailLoading ? <Spinner /> : null}
          {!detailLoading && detailError ? (
            <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] p-3 text-sm text-[var(--text-secondary)]">
              <Badge tone="red">Error</Badge> <span className="ml-2">{detailError}</span>
            </div>
          ) : null}

          {!detailLoading && detail ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{detail.visitorName || 'Guest'}</span>
                <Badge>{detail.status}</Badge>
                <Badge>{detail.intent || 'unknown'}</Badge>
                <span className="text-xs text-[var(--text-muted)]">
                  {detail.visitorEmail || '—'}
                  {detail.visitorPhone ? ` · ${detail.visitorPhone}` : ''}
                </span>
              </div>

              <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-3">
                {(detail.messages ?? []).length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No messages recorded.</p>
                ) : (
                  detail.messages?.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-lg border border-[var(--border-light)] p-2 text-sm ${
                        message.sender === 'visitor' ? 'bg-[var(--surface)]' : 'bg-[var(--surface-hover)]'
                      }`}
                    >
                      <div className="mb-1 flex justify-between gap-2 text-xs text-[var(--text-muted)]">
                        <span className="font-medium">{message.sender}</span>
                        <span>{formatDateTime(message.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words">{message.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Status">
                  <select
                    className={selectClass}
                    value={detailStatus}
                    onChange={(e) => setDetailStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.filter((value) => value !== 'all').map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Quality (1–5)">
                  <input
                    type="number"
                    min={1}
                    max={5}
                    className={inputClass}
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                  />
                </Field>
                <Field label="Notes">
                  <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => void saveDetails()} disabled={saving}>
                  {saving ? 'Saving…' : 'Save details'}
                </Button>
              </div>

              {canRespond ? (
                <div className="space-y-3 border-t border-[var(--border)] pt-4">
                  <Field label="Reply to visitor">
                    <textarea
                      className={`${inputClass} min-h-24 resize-y`}
                      placeholder="Type a human reply…"
                      value={reply}
                      maxLength={5000}
                      onChange={(e) => setReply(e.target.value)}
                    />
                  </Field>
                  <div className="flex justify-end">
                    <Button onClick={() => void sendReply()} disabled={saving || !reply.trim()}>
                      {saving ? 'Sending…' : 'Send reply'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}

export default ChatbotConversationsAdmin;
