import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { useEffectiveAccess } from '@/lib/permissions';
import { toast } from '@angisoft/utils';
import { Button, Card, Field, PageHeader, Table } from '@/components';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';
import {
  ErrorNotice,
  inputClass,
  listFrom,
  parseJson,
  useResource,
  valueFrom,
  type ApiRow,
} from './shared';
import {
  CHANNEL_TABS,
  ConversationId,
  ConversationList,
  DetailRow,
  MessageBubble,
  WindowBadge,
  conversationChannel,
} from './InboxParts';

type SendMode = 'text' | 'template';

/** Cross-channel conversation workspace with assignment, notes and AI assist. */
export default function CommunicationsInbox() {
  const { can } = useEffectiveAccess();
  const [conversations, setConversations] = useState<ApiRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ApiRow[]>([]);
  const [notes, setNotes] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState('ALL');
  const [mode, setMode] = useState<SendMode>('text');
  const [text, setText] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateLanguage, setTemplateLanguage] = useState('en');
  const [components, setComponents] = useState('');
  const [busy, setBusy] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [participant, setParticipant] = useState('');

  const templates = useResource<ApiRow>('/admin/communications/templates');
  const grants = useResource<ApiRow>('/admin/communications/grants');
  const participants = useResource<ApiRow>(selectedId ? `/admin/communications/inbox/conversations/${selectedId}/participants` : null);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const result = await apiFetch('/admin/communications/inbox/conversations?limit=100');
      const rows = listFrom(result, 'conversations');
      setConversations(rows);
      setSelectedId((current) => (current && rows.some((row) => String(row.id) === current) ? current : String(rows[0]?.id ?? '') || null));
      setError(null);
    } catch (e) {
      setError((e as Error).message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (id: string) => {
    setMessagesLoading(true);
    try {
      const result = await apiFetch(`/admin/communications/inbox/conversations/${id}/messages`);
      setMessages(listFrom(result, 'messages'));
    } catch (e) {
      toast.error((e as Error).message || 'Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => { void loadConversations(); }, []);
  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
    else setMessages([]);
    setNotes([]);
    setStatus('');
  }, [selectedId]);

  const visible = useMemo(
    () => conversations.filter((conversation) => channel === 'ALL' || conversationChannel(conversation) === channel),
    [conversations, channel],
  );
  const selected = conversations.find((conversation) => String(conversation.id) === selectedId) ?? null;
  const employeeOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { id: string; label: string }[] = [];
    for (const grant of listFrom(grants.data, 'grants')) {
      const employee = grant.employee ?? {};
      const id = String(employee.id ?? grant.employeeId ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      options.push({
        id,
        label: [employee.firstName, employee.lastName].filter(Boolean).join(' ') || String(employee.email ?? id),
      });
    }
    return options;
  }, [grants.data]);

  const postAction = async (suffix: string, body: unknown, success: string) => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const result = await apiFetch(`/admin/communications/inbox/conversations/${selectedId}/${suffix}`, { method: 'POST', body });
      toast.success(success);
      return result;
    } catch (e) {
      toast.error((e as Error).message || success.replace('saved', 'failed'));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!selectedId) return;
    if (mode === 'template' && !templateName.trim()) {
      toast.error('Choose a template first');
      return;
    }
    if (mode === 'text' && !text.trim()) return;
    let templateComponents: unknown;
    try {
      templateComponents = parseJson(components, 'Template components');
    } catch (e) {
      toast.error((e as Error).message);
      return;
    }
    const body = mode === 'template'
      ? { templateName, templateLanguage, templateComponents: templateComponents ?? undefined }
      : { body: text };
    const result = await postAction('send', body, 'Message sent');
    if (!result) return;
    setText('');
    setComponents('');
    await Promise.all([loadMessages(selectedId), loadConversations()]);
  };

  const aiDraft = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const result = await apiFetch(`/admin/communications/inbox/conversations/${selectedId}/ai-draft`, {
        method: 'POST',
        body: { instructions: text.trim() || 'Draft a concise, professional reply' },
      });
      const obj = (result ?? {}) as ApiRow;
      const draft = valueFrom(obj, 'draft') ?? valueFrom(obj, 'text') ?? valueFrom(obj, 'bodyText') ?? valueFrom(obj, 'suggestion');
      if (!draft) throw new Error('AI returned no draft');
      setText(String(draft));
      setMode('text');
      toast.success('Draft inserted — review before sending');
    } catch (e) {
      toast.error((e as Error).message || 'AI draft failed');
    } finally {
      setBusy(false);
    }
  };

  const assign = async () => {
    const result = await postAction('assign', { employeeId: assignee }, 'Conversation assigned');
    if (result) {
      setAssignOpen(false);
      await loadConversations();
    }
  };

  const changeStatus = async () => {
    const result = await postAction('status', { status }, 'Status updated');
    if (result) await loadConversations();
  };

  const addNote = async () => {
    if (!note.trim()) return;
    const result = await postAction('note', { body: note, note }, 'Note added');
    if (result) {
      setNotes((current) => [...current, (valueFrom(result, 'note') ?? { body: note, createdAt: new Date().toISOString() }) as ApiRow]);
      setNote('');
    }
  };

  const addParticipant = async () => {
    if (!participant.trim()) return;
    const result = await postAction('participants', { employeeId: participant }, 'Participant added');
    if (result) {
      setParticipant('');
      await participants.reload();
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Unified Inbox"
        subtitle="Conversations from email, WhatsApp, Telegram and social channels — with assignment, notes and assisted replies."
        actions={<Button variant="outline" onClick={() => void loadConversations()} disabled={loading}>Refresh</Button>}
      />
      {error ? <ErrorNotice error={error} onRetry={() => void loadConversations()} /> : null}

      <div className="flex flex-wrap gap-2">
        {CHANNEL_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setChannel(tab)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              channel === tab
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="max-h-[72vh] overflow-y-auto p-2">
          {loading ? <p className="py-10 text-center text-sm text-[var(--text-muted)]">Loading conversations…</p> : (
            <ConversationList conversations={visible} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </Card>

        <Card className="flex min-h-[72vh] flex-col">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-muted)]">Select a conversation to read and reply.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
                <div>
                  <div className="font-semibold">{String(selected.subject ?? selected.contact?.name ?? 'Conversation')}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Badge>{conversationChannel(selected)}</Badge>
                    <Badge>{String(selected.status ?? 'OPEN')}</Badge>
                    <WindowBadge conversation={selected} />
                    <ConversationId id={selectedId} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {can('communications.inbox.assign') ? <Button variant="outline" onClick={() => setAssignOpen(true)}>Assign</Button> : null}
                  {can('communications.inbox.respond') ? (
                    <select className={inputClass + ' w-auto'} value={status} onChange={(event) => { setStatus(event.target.value); }} disabled={busy}>
                      <option value="">Set status…</option>
                      {['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'].map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : null}
                  {can('communications.inbox.respond') && status ? <Button variant="outline" onClick={() => void changeStatus()} disabled={busy}>Update</Button> : null}
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto py-4">
                {messagesLoading ? <p className="py-8 text-center text-sm text-[var(--text-muted)]">Loading messages…</p> : null}
                {!messagesLoading && messages.length === 0 ? <p className="py-8 text-center text-sm text-[var(--text-muted)]">No messages in this conversation.</p> : null}
                {messages.map((message) => <MessageBubble key={String(message.id)} message={message} />)}
                {notes.length > 0 ? (
                  <div className="rounded-lg border border-dashed border-[var(--border)] p-3">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Internal notes</div>
                    {notes.map((noteRow, index) => (
                      <div key={String(noteRow.id ?? index)} className="text-sm text-[var(--text-secondary)]">• {String(noteRow.body ?? noteRow.note ?? '')}</div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 border-t border-[var(--border)] pt-3 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div>
                  <div className="mb-2 flex gap-2">
                    <button type="button" className={`rounded-lg px-3 py-1 text-xs ${mode === 'text' ? 'bg-[var(--color-primary)] text-white' : 'border border-[var(--border)]'}`} onClick={() => setMode('text')}>Text</button>
                    <button type="button" className={`rounded-lg px-3 py-1 text-xs ${mode === 'template' ? 'bg-[var(--color-primary)] text-white' : 'border border-[var(--border)]'}`} onClick={() => setMode('template')}>Template</button>
                    {can('communications.inbox.respond') ? <Button variant="ghost" onClick={() => void aiDraft()} disabled={busy}>✨ AI draft</Button> : null}
                  </div>
                  {mode === 'text' ? (
                    <textarea className={inputClass + ' min-h-[88px]'} placeholder="Type a reply…" value={text} onChange={(event) => setText(event.target.value)} />
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="Approved template">
                        <select className={inputClass} value={templateName} onChange={(event) => setTemplateName(event.target.value)}>
                          <option value="">Select template…</option>
                          {listFrom(templates.data, 'templates').map((template) => (
                            <option key={String(template.id)} value={String(template.name)}>{String(template.name)} · {String(template.channel ?? '')}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Language">
                        <input className={inputClass} value={templateLanguage} onChange={(event) => setTemplateLanguage(event.target.value)} />
                      </Field>
                      <Field label="Components (optional JSON)">
                        <textarea className={inputClass + ' min-h-[60px]'} value={components} onChange={(event) => setComponents(event.target.value)} placeholder='[{"type":"body","parameters":[]}]' />
                      </Field>
                    </div>
                  )}
                  {can('communications.inbox.respond') ? (
                    <Button className="mt-3" onClick={() => void send()} disabled={busy || (mode === 'text' ? !text.trim() : !templateName)}>{busy ? 'Sending…' : 'Send reply'}</Button>
                  ) : (
                    <p className="mt-3 text-xs text-[var(--text-muted)]">You have read-only access to this inbox.</p>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Participants</div>
                    {participants.loading ? <p className="text-xs text-[var(--text-muted)]">Loading…</p> : null}
                    {participants.error ? <p className="text-xs text-red-600">{participants.error}</p> : null}
                    {listFrom(participants.data, 'participants').map((row) => (
                      <DetailRow key={String(row.id)} label={String(row.employee?.email ?? row.employeeId ?? row.id)}>{String(row.role ?? row.status ?? 'WATCHER')}</DetailRow>
                    ))}
                    {can('communications.inbox.assign') ? (
                      <div className="mt-2 flex gap-2">
                        <input className={inputClass} placeholder="Employee ID" value={participant} onChange={(event) => setParticipant(event.target.value)} />
                        <Button variant="outline" onClick={() => void addParticipant()} disabled={busy || !participant.trim()}>Add</Button>
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Internal note</div>
                    <textarea className={inputClass + ' min-h-[60px]'} placeholder="Add a note (not sent to the contact)" value={note} onChange={(event) => setNote(event.target.value)} />
                    <Button variant="outline" className="mt-2" onClick={() => void addNote()} disabled={busy || !note.trim()}>Save note</Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {assignOpen && selectedId ? (
        <Modal
          title="Assign conversation"
          onClose={() => setAssignOpen(false)}
          footer={<><Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button><Button onClick={() => void assign()} disabled={busy || !assignee.trim()}>Assign</Button></>}
        >
          <Field label="Assignee">
            <input className={inputClass} list="comms-assignees" value={assignee} onChange={(event) => setAssignee(event.target.value)} placeholder="Employee ID or name" />
            <datalist id="comms-assignees">
              {employeeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </datalist>
          </Field>
          <p className="mt-2 text-xs text-[var(--text-muted)]">Existing grant holders are suggested. The backend validates account-scoped access.</p>
        </Modal>
      ) : null}
    </div>
  );
}
