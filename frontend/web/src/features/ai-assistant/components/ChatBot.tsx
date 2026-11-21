// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { FaTimes, FaHeadset, FaPaperPlane as SendIcon } from 'react-icons/fa';
import { apiPost } from '@/lib/httpClient';

const SUGGESTIONS = [
  'What services do you offer?',
  'How much does a project cost?',
  'Show me your work',
  'Talk to a human',
];

const CareIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </svg>
);

const CareAvatar = ({ size = 40 }) => (
  <div
    className="rounded-full flex items-center justify-center flex-shrink-0"
    style={{
      width: size,
      height: size,
      background: 'var(--gradient-brand)',
      color: '#fff',
      boxShadow: '0 4px 14px rgba(8, 117, 255, 0.35)',
    }}
  >
    <CareIcon />
  </div>
);

const CareBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: "Hi there — I'm Care, from the AngiSoft customer care team. Ask me anything about our services, pricing or projects, and I'll get you the right answer.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [visitorInfo, setVisitorInfo] = useState({ name: '', email: '', phone: '' });
  const [contactOpen, setContactOpen] = useState(false);
  const [contactDraft, setContactDraft] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [handoffRequested, setHandoffRequested] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const historyLoadedRef = useRef(false);
  const userMsgCount = useRef(0);

  const generateFingerprint = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `fp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 80);
  }, [isOpen]);

  useEffect(() => {
    const storedFingerprint = localStorage.getItem('angisoft_fp');
    if (storedFingerprint) {
      setDeviceFingerprint(storedFingerprint);
    } else {
      const fp = generateFingerprint();
      localStorage.setItem('angisoft_fp', fp);
      setDeviceFingerprint(fp);
    }

    const storedVisitorRaw = localStorage.getItem('angisoft_visitor');
    if (storedVisitorRaw) {
      try {
        const v = JSON.parse(storedVisitorRaw);
        if (v?.name || v?.email || v?.phone) setVisitorInfo({ name: v.name || '', email: v.email || '', phone: v.phone || '' });
      } catch { /* ignore */ }
    }
    const storedConversationId = localStorage.getItem('angisoft_conversation');
    if (storedConversationId) setConversationId(storedConversationId);
  }, []);

  useEffect(() => {
    if (visitorInfo.name || visitorInfo.email || visitorInfo.phone) {
      localStorage.setItem('angisoft_visitor', JSON.stringify(visitorInfo));
    }
  }, [visitorInfo]);

  useEffect(() => {
    if (conversationId) localStorage.setItem('angisoft_conversation', conversationId);
  }, [conversationId]);

  const mapHistoryMessages = (conversations) => {
    const all = conversations.flatMap((conversation) =>
      (conversation.messages || []).map((msg) => {
        const sender = String(msg.sender || '').toLowerCase();
        const type = sender === 'visitor' ? 'user' : sender === 'bot' || sender === 'assistant' ? 'bot' : 'agent';
        return { id: msg.id, type, text: msg.message, timestamp: new Date(msg.createdAt) };
      })
    );
    return all.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  const loadHistory = async () => {
    if (historyLoadedRef.current) return;
    if (!deviceFingerprint && !conversationId && !visitorInfo.email) return;
    historyLoadedRef.current = true;
    try {
      const data = await apiPost('/api/chatbot/history', {
        conversationId: conversationId || undefined,
        deviceFingerprint: deviceFingerprint || undefined,
        visitorName: visitorInfo.name || undefined,
        visitorEmail: visitorInfo.email || undefined,
        visitorPhone: visitorInfo.phone || undefined,
        limit: 3,
      });
      if (data.latestConversationId && !conversationId) setConversationId(data.latestConversationId);
      if (Array.isArray(data.conversations) && data.conversations.length > 0) {
        if (data.conversations.some((c) => c.status === 'escalated')) setHandoffRequested(true);
        const historyMessages = mapHistoryMessages(data.conversations);
        if (historyMessages.length > 0) {
          userMsgCount.current = historyMessages.filter((m) => m.type === 'user').length;
          setMessages(historyMessages);
        }
      }
    } catch (error) {
      console.warn('chatbot history failed:', error);
    }
  };

  useEffect(() => {
    if (!isOpen || historyLoadedRef.current) return;
    void loadHistory();
  }, [isOpen, deviceFingerprint, conversationId, visitorInfo.email, visitorInfo.name, visitorInfo.phone]);

  const pushBot = (text, extra = {}) =>
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), type: 'bot', text, timestamp: new Date(), ...extra }]);

  const sendMessage = async (rawText) => {
    const text = String(rawText || '').trim();
    if (!text || isLoading) return;

    setMessages((prev) => [...prev, { id: Date.now(), type: 'user', text, timestamp: new Date() }]);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsLoading(true);
    userMsgCount.current += 1;

    // After a few exchanges without contact details, offer a lightweight
    // follow-up card — never block the conversation for it.
    if (!visitorInfo.email && !handoffRequested && userMsgCount.current === 4) {
      setContactOpen(true);
    }

    try {
      const data = await apiPost('/api/chatbot/chat', {
        conversationId: conversationId || undefined,
        visitorName: visitorInfo.name || undefined,
        visitorEmail: visitorInfo.email || undefined,
        visitorPhone: visitorInfo.phone || undefined,
        deviceFingerprint: deviceFingerprint || undefined,
        message: text,
      });
      if (!conversationId && data.conversationId) setConversationId(data.conversationId);
      if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        setRecommendations(data.recommendations);
      }
      if (data.handoff) setHandoffRequested(true);
      pushBot(data.message || "Sorry, I didn't catch that — could you rephrase?");
    } catch (error) {
      console.error('chat error:', error);
      pushBot("I'm having trouble reaching our systems right now. Please try again in a moment — or leave your email below and the team will follow up.");
      setContactOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    void sendMessage(input);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  const saveContact = () => {
    const raw = contactDraft.trim();
    if (!raw) return;
    const emailMatch = raw.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
    const email = emailMatch ? emailMatch[0] : '';
    const namePart = raw.replace(email, '').replace(/[(),;]/g, ' ').trim();
    setVisitorInfo((prev) => ({
      name: namePart || prev.name || 'Friend',
      email: email || prev.email,
      phone: prev.phone,
    }));
    setContactOpen(false);
    setContactDraft('');
    if (email) {
      pushBot(`Thanks${namePart ? `, ${namePart.split(' ')[0]}` : ''} — I've noted your email. The team can follow up anytime.`);
    }
  };

  const showChips = messages.length <= 2 && !isLoading;

  return (
    <>
      {isOpen && (
        <div
          className="fixed bottom-24 right-4 sm:right-6 z-[9999] w-[calc(100vw-32px)] sm:w-[400px] h-[min(640px,calc(100vh-120px))] rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: 'var(--card-bg, var(--bg-secondary))',
            border: '1px solid var(--border, rgba(148,163,184,0.2))',
            boxShadow: '0 24px 70px rgba(2, 8, 23, 0.45)',
            animation: 'careSlideUp 0.28s cubic-bezier(0.21, 1.02, 0.73, 1)',
          }}
          role="dialog"
          aria-label="AngiSoft customer care chat"
        >
          {/* Header */}
          <div
            className="px-4 py-3.5 flex items-center gap-3 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border, rgba(148,163,184,0.18))', background: 'var(--bg-secondary, transparent)' }}
          >
            <CareAvatar />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Care · Customer Care
              </div>
              <div className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--color-success, #27D94B)' }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'currentColor' }} />
                Online — replies instantly
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              aria-label="Close chat"
            >
              <FaTimes />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: 'var(--bg-primary)' }}>
            {handoffRequested && (
              <div
                className="rounded-xl px-3.5 py-2.5 text-xs flex items-start gap-2"
                style={{ background: 'color-mix(in srgb, var(--warning, #F59E0B) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--warning, #F59E0B) 35%, transparent)', color: 'var(--text-primary)' }}
              >
                <span aria-hidden="true">🙋</span>
                <span>A teammate has been notified and will follow up here or by email.</span>
              </div>
            )}

            {messages.map((msg) => {
              const isUser = msg.type === 'user';
              const isAgent = msg.type === 'agent';
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
                  {!isUser && <CareAvatar size={28} />}
                  <div className="max-w-[80%]">
                    {isAgent && (
                      <div className="text-[10px] mb-1 ml-1" style={{ color: 'var(--text-muted)' }}>AngiSoft team</div>
                    )}
                    <div
                      className={`px-3.5 py-2.5 text-sm leading-relaxed ${
                        isUser ? 'rounded-2xl rounded-br-md text-white' : 'rounded-2xl rounded-bl-md'
                      }`}
                      style={
                        isUser
                          ? { background: 'var(--primary, #0875FF)' }
                          : {
                              background: 'var(--bg-tertiary, var(--card-bg))',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border, rgba(148,163,184,0.18))',
                            }
                      }
                    >
                      {msg.text}
                    </div>
                    <div className={`text-[10px] mt-1 ${isUser ? 'text-right' : 'ml-1'}`} style={{ color: 'var(--text-muted)' }}>
                      {msg.timestamp instanceof Date ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start gap-2">
                <CareAvatar size={28} />
                <div
                  className="px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1.5"
                  style={{ background: 'var(--bg-tertiary, var(--card-bg))', border: '1px solid var(--border, rgba(148,163,184,0.18))' }}
                >
                  {[0, 0.15, 0.3].map((d, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full inline-block animate-bounce"
                      style={{ background: 'var(--primary-light, #3B9AFF)', animationDelay: `${d}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="px-4 pt-2 flex-shrink-0">
              <div className="text-[11px] mb-1.5" style={{ color: 'var(--text-muted)' }}>Relevant from our work:</div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {recommendations.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => void sendMessage(`Tell me more about ${service.title}`)}
                    className="flex-shrink-0 text-left px-3 py-2 rounded-xl text-xs max-w-[220px] transition-colors"
                    style={{
                      background: 'var(--bg-tertiary, var(--card-bg))',
                      border: '1px solid var(--border, rgba(148,163,184,0.2))',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span className="font-medium block truncate">{service.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lazy contact capture — optional, never blocks chat */}
          {contactOpen && !visitorInfo.email && (
            <div className="px-4 pt-2 flex-shrink-0">
              <div
                className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                style={{ background: 'var(--bg-tertiary, var(--card-bg))', border: '1px solid var(--border, rgba(148,163,184,0.2))' }}
              >
                <input
                  className="flex-1 bg-transparent text-sm outline-none min-w-0"
                  style={{ color: 'var(--text-primary)' }}
                  placeholder="Email for follow-up (optional)"
                  value={contactDraft}
                  onChange={(e) => setContactDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveContact()}
                />
                <button
                  onClick={saveContact}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg flex-shrink-0"
                  style={{ background: 'var(--primary, #0875FF)', color: '#fff' }}
                >
                  Save
                </button>
                <button
                  onClick={() => setContactOpen(false)}
                  className="text-xs px-1.5 py-1.5 flex-shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Suggestion chips */}
          {showChips && (
            <div className="px-4 pt-2 flex gap-2 overflow-x-auto flex-shrink-0">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void sendMessage(s)}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full transition-colors"
                  style={{
                    border: '1px solid var(--border, rgba(148,163,184,0.25))',
                    color: 'var(--text-secondary, var(--text-primary))',
                    background: 'transparent',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="px-3 py-3 flex items-end gap-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border, rgba(148,163,184,0.18))' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask Care anything…"
              disabled={isLoading}
              rows={1}
              className="flex-1 px-3.5 py-2.5 rounded-2xl text-sm resize-none outline-none"
              style={{
                background: 'var(--bg-tertiary, var(--bg-primary))',
                border: '1px solid var(--border, rgba(148,163,184,0.25))',
                color: 'var(--text-primary)',
                maxHeight: '140px',
                lineHeight: '1.5',
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="h-10 w-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 flex-shrink-0"
              style={{ background: 'var(--primary, #0875FF)', color: '#fff' }}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </form>

          <div className="px-4 pb-2 text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            Care is an AI assistant · conversations may be reviewed by our team
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 z-[9998] w-14 h-14 rounded-full text-white flex items-center justify-center transition-transform duration-300 hover:scale-105"
        style={{ background: 'var(--gradient-brand)', boxShadow: '0 10px 28px rgba(8,117,255,0.4)' }}
        aria-label={isOpen ? 'Close chat' : 'Chat with Care'}
      >
        {isOpen ? <FaTimes className="text-xl" /> : <FaHeadset className="text-xl" />}
        {!isOpen && !handoffRequested && (
          <span
            className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
            style={{ background: 'var(--color-success, #27D94B)', borderColor: 'var(--bg-primary, #07142B)' }}
          />
        )}
      </button>

      <style>{`
        @keyframes careSlideUp {
          from { opacity: 0; transform: translateY(14px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
};

export const ChatBot = CareBot;
export default CareBot;
