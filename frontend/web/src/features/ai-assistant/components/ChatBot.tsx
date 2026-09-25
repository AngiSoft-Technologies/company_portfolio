import { useState } from 'react';
import { sendChatMessage } from '@angisoft/ai';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const content = input.trim();
    if (!content) return;
    setMessages((m) => [...m, { role: 'user', content }]);
    setInput('');
    setLoading(true);
    try {
      const res = await sendChatMessage({ message: content });
      const reply = res.data?.reply ?? 'No response could be generated.';
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, I could not reach the assistant right now.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open AI assistant"
        className="fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#00AFFF] to-[#0875FF] text-white shadow-lg"
      >
        {open ? '✕' : '✺'}
      </button>
      {open && (
        <div className="fixed bottom-24 left-6 z-40 flex h-[28rem] w-[22rem] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <span className="text-sm font-semibold">AngiSoft Assistant</span>
            <span className="text-xs text-[var(--text-muted)]">Online</span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">Hi! Ask me anything about AngiSoft, our products, or services.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'ml-auto bg-[#0875FF] text-white' : 'bg-[var(--surface-hover)] text-[var(--text-primary)]'}`}>
                {m.content}
              </div>
            ))}
            {loading && <div className="text-xs text-[var(--text-muted)]">Typing…</div>}
          </div>
          <div className="flex gap-2 border-t border-[var(--border)] p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Type a message…"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm outline-none focus:border-[#0875FF]"
            />
            <button onClick={submit} className="rounded-lg bg-[#0875FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#3B9AFF]">
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatBot;