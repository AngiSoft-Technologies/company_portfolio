import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { toast } from '@angisoft/utils';
import { Button, Card, EmptyState, PageHeader, Spinner } from '@/components';

type Conversation = { id: string; subject?: string; status: string; lastMessagePreview?: string; lastMessageAt?: string; contact?: { name?: string }; account?: { name?: string; channel?: string } };
type Message = { id: string; direction: string; senderType: string; bodyText?: string; createdAt?: string; deliveryStatus?: string };

export default function CommunicationsInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');

  const loadConversations = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/communications/inbox/conversations') as any;
      setConversations(res.conversations || []);
      if (!selected && res.conversations?.[0]?.id) setSelected(res.conversations[0].id);
    } catch (e: any) { toast.error(e.message || 'Failed to load inbox'); }
    finally { setLoading(false); }
  };
  const loadMessages = async (id: string) => {
    try {
      const res = await apiFetch(`/admin/communications/inbox/conversations/${id}/messages`) as any;
      setMessages(res.messages || []);
    } catch (e: any) { toast.error(e.message || 'Failed to load messages'); }
  };

  useEffect(() => { void loadConversations(); }, []);
  useEffect(() => { if (selected) void loadMessages(selected); }, [selected]);

  const send = async () => {
    if (!selected || !text.trim()) return;
    setSending(true);
    try {
      await apiFetch(`/admin/communications/inbox/conversations/${selected}/send`, { method: 'POST', body: { body: text } });
      setText('');
      await loadMessages(selected);
      await loadConversations();
    } catch (e: any) { toast.error(e.message || 'Send failed'); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Unified Inbox" subtitle="WhatsApp Cloud API inbound/outbound foundation. Messages are stored as conversations/messages with provider events audited." actions={<Button variant="outline" onClick={() => void loadConversations()} disabled={loading}>Refresh</Button>} />
      {loading ? <Spinner /> : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <Card className="max-h-[70vh] overflow-auto p-2">
            {conversations.length === 0 ? <EmptyState title="No conversations yet" /> : conversations.map((c) => (
              <button key={c.id} onClick={() => setSelected(c.id)} className={`w-full rounded-lg border px-3 py-2 text-left mb-2 ${selected===c.id ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[var(--border)]'}`}>
                <div className="text-sm font-medium">{c.contact?.name || c.subject || 'Conversation'}</div>
                <div className="text-xs text-[var(--text-muted)]">{c.account?.channel} · {c.status}</div>
                <div className="text-xs truncate text-[var(--text-secondary)]">{c.lastMessagePreview || '—'}</div>
              </button>
            ))}
          </Card>
          <Card className="flex min-h-[70vh] flex-col">
            <div className="flex-1 space-y-2 overflow-auto">
              {messages.length === 0 ? <EmptyState title="Select a conversation" /> : messages.map((m) => (
                <div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.direction==='OUTBOUND' ? 'ml-auto bg-[var(--color-primary)]/15' : 'bg-[var(--bg-primary)] border border-[var(--border)]'}`}>
                  <div className="whitespace-pre-wrap">{m.bodyText || '—'}</div>
                  <div className="mt-1 text-[11px] text-[var(--text-muted)]">{m.senderType} · {m.deliveryStatus || ''} · {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2 border-t border-[var(--border)] pt-3">
              <textarea className="min-h-[72px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply (WhatsApp channels supported now)" />
              <Button onClick={() => void send()} disabled={sending || !selected || !text.trim()}>{sending ? 'Sending...' : 'Send'}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
