import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@angisoft/utils';
import { useRealtime } from '@angisoft/realtime';
import { apiFetch } from '@/lib/adminApi';
import { useEffectiveAccess } from '@/lib/permissions';
import { Badge } from '@/lib/Badge';
import { Button, Card, EmptyState, PageHeader, Spinner } from '@/components';

/**
 * AI Boardroom — SUPER_ADMIN-only meeting room for the agent workforce.
 *
 * Meeting state is persisted as an AgentRun (agentKey='boardroom') so it uses
 * the same audit trail and retention as every other agent report. Text is the
 * primary interface; browser speech recognition/synthesis are progressive
 * enhancements with a text-only fallback when unsupported.
 */

interface BoardroomMessage {
  id: string;
  role: 'owner' | 'assistant' | 'system';
  agentKey?: string | null;
  agentName?: string | null;
  content: string;
  createdAt: string;
  kind: 'message' | 'report' | 'suggestion' | 'system';
}

interface BoardroomSuggestion {
  id: string;
  agentKey?: string | null;
  agentName?: string | null;
  text: string;
}

interface BoardroomOutput {
  title: string;
  summary: string;
  metrics: {
    participants: number;
    messages: number;
    suggestions: number;
    actionItems: number;
    repliesGenerated: number;
  };
  highlights: string[];
  actions: string[];
  recommendations: string[];
  messages: BoardroomMessage[];
  minutes: string[];
  suggestions: BoardroomSuggestion[];
}

interface BoardroomSession {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  output: BoardroomOutput;
}

interface AgentReport {
  agentKey: string;
  agentName: string;
  agentRole: string;
  summary: string;
  highlights: string[];
  recommendations: string[];
  status: string;
  startedAt: string;
  liveState?: string;
  currentTask?: string | null;
}

const EMPTY_OUTPUT: BoardroomOutput = {
  title: 'Boardroom',
  summary: '',
  metrics: { participants: 0, messages: 0, suggestions: 0, actionItems: 0, repliesGenerated: 0 },
  highlights: [],
  actions: [],
  recommendations: [],
  messages: [],
  minutes: [],
  suggestions: [],
};

type JsonRecord = Record<string, unknown>;

interface SpeechRecognitionResultLike {
  0?: { transcript?: string };
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringArray(value: unknown, max = 100): string[] {
  return Array.isArray(value)
    ? value.map((v) => String(v).trim()).filter(Boolean).slice(0, max)
    : [];
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeMessage(raw: unknown): BoardroomMessage | null {
  const m = asRecord(raw);
  const role = asString(m.role);
  if (role !== 'owner' && role !== 'assistant' && role !== 'system') return null;
  const content = asString(m.content);
  if (!content) return null;
  const kind = asString(m.kind);
  return {
    id: asString(m.id) || `local-${Date.now()}`,
    role,
    agentKey: typeof m.agentKey === 'string' ? m.agentKey : null,
    agentName: typeof m.agentName === 'string' ? m.agentName : null,
    content,
    createdAt: asString(m.createdAt, new Date().toISOString()),
    kind: kind === 'report' || kind === 'suggestion' || kind === 'system' ? kind : 'message',
  };
}

function normalizeSuggestion(raw: unknown): BoardroomSuggestion | null {
  const s = asRecord(raw);
  const text = asString(s.text).trim();
  if (!text) return null;
  return {
    id: asString(s.id) || `suggestion-${text.slice(0, 12)}`,
    agentKey: typeof s.agentKey === 'string' ? s.agentKey : null,
    agentName: typeof s.agentName === 'string' ? s.agentName : null,
    text,
  };
}

function normalizeSession(raw: unknown): BoardroomSession | null {
  const r = asRecord(raw);
  const id = asString(r.id);
  if (!id) return null;
  const output = asRecord(r.output);
  const metrics = asRecord(output.metrics);
  const messages = Array.isArray(output.messages)
    ? output.messages.map(normalizeMessage).filter((m): m is BoardroomMessage => Boolean(m))
    : [];
  const suggestions = Array.isArray(output.suggestions)
    ? output.suggestions.map(normalizeSuggestion).filter((s): s is BoardroomSuggestion => Boolean(s))
    : [];
  return {
    id,
    title: asString(output.title) || asString(r.title) || 'Boardroom session',
    summary: typeof r.summary === 'string' ? r.summary : null,
    status: asString(r.status, 'success'),
    startedAt: asString(r.startedAt),
    finishedAt: typeof r.finishedAt === 'string' ? r.finishedAt : null,
    output: {
      title: asString(output.title, 'Boardroom'),
      summary: asString(output.summary),
      metrics: {
        participants: asNumber(metrics.participants),
        messages: messages.length,
        suggestions: suggestions.length,
        actionItems: asNumber(metrics.actionItems),
        repliesGenerated: asNumber(metrics.repliesGenerated),
      },
      highlights: asStringArray(output.highlights, 20),
      actions: asStringArray(output.actions, 20),
      recommendations: asStringArray(output.recommendations, 20),
      messages,
      minutes: asStringArray(output.minutes, 100),
      suggestions,
    },
  };
}

function speakable(text: string): string {
  return String(text ?? '')
    .replace(/[*_`#>]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 700);
}

export default function BoardroomAdmin() {
  const { isSuperAdmin, loading: accessLoading } = useEffectiveAccess();
  const { subscribe, emit, connected } = useRealtime();
  const [sessions, setSessions] = useState<BoardroomSession[]>([]);
  const [reports, setReports] = useState<AgentReport[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [question, setQuestion] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [askAll, setAskAll] = useState(true);
  const [muted, setMuted] = useState(true);
  const [listening, setListening] = useState(false);
  const [decision, setDecision] = useState('');
  const [actionsText, setActionsText] = useState('');
  const [thinking, setThinking] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const activeIdRef = useRef<string | null>(null);

  const active = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? sessions[0] ?? null,
    [sessions, activeId],
  );

  const load = useCallback(async () => {
    try {
      const [sessionData, reportData] = await Promise.all([
        apiFetch('/api/admin/boardroom/sessions').then(asRecord),
        apiFetch('/api/admin/boardroom/reports').then(asRecord),
      ]);
      const rawSessions = Array.isArray(sessionData.sessions) ? sessionData.sessions : [];
      const nextSessions = rawSessions
        .map(normalizeSession)
        .filter((s): s is BoardroomSession => Boolean(s));
      setSessions(nextSessions);
      setReports(Array.isArray(reportData.reports) ? reportData.reports as AgentReport[] : []);
      setActiveId((current) => current ?? nextSessions[0]?.id ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load boardroom');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void load();
    const timer = window.setInterval(() => void load(), 12_000);
    return () => window.clearInterval(timer);
  }, [isSuperAdmin, load]);

  useEffect(() => {
    activeIdRef.current = active?.id ?? null;
  }, [active?.id]);

  useEffect(() => {
    setIsConnected(connected());
    const onConnect = subscribe('connect', () => setIsConnected(true));
    const onDisconnect = subscribe('disconnect', () => setIsConnected(false));
    return () => {
      onConnect();
      onDisconnect();
    };
  }, [connected, subscribe]);

  useEffect(() => {
    const offMessage = subscribe('boardroom:message', (payload: unknown) => {
      const msg = payload as BoardroomMessage;
      const sessionId = activeIdRef.current;
      if (!sessionId || !msg?.id) return;
      setSessions((prev) => prev.map((s) => s.id === sessionId
        ? { ...s, output: { ...s.output, messages: [...s.output.messages.filter((m) => m.id !== msg.id), msg] } }
        : s));
      setThinking((prev) => prev.filter((k) => k !== msg.agentKey));
      if (!muted && msg.role === 'assistant') {
        const utterance = new SpeechSynthesisUtterance(speakable(msg.content));
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    });
    const offThinking = subscribe('boardroom:thinking', (payload: unknown) => {
      const key = asString(asRecord(payload).agentKey);
      if (key) setThinking((prev) => (prev.includes(key) ? prev : [...prev, key]));
    });
    const offFinalized = subscribe('boardroom:finalized', () => void load());
    return () => {
      offMessage();
      offThinking();
      offFinalized();
    };
  }, [subscribe, load, muted]);

  useEffect(() => {
    if (!active?.id) return;
    emit('boardroom:join', { sessionId: active.id });
    return () => emit('boardroom:leave', { sessionId: active.id });
  }, [active?.id, emit, isConnected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [active?.output.messages.length, thinking.length]);

  const startMeeting = async () => {
    setStarting(true);
    try {
      const data = asRecord(await apiFetch('/api/admin/boardroom/sessions', { method: 'POST', body: {} }));
      const session = normalizeSession(data.session);
      if (!session) throw new Error('Boardroom did not return a session');
      setSessions((prev) => [session, ...prev]);
      setActiveId(session.id);
      setDecision('');
      setActionsText('');
      toast.success('Boardroom opened — all agents are present');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open boardroom');
    } finally {
      setStarting(false);
    }
  };

  const sendQuestion = async () => {
    const content = question.trim();
    if (!content || !active || sending) return;
    setSending(true);
    setQuestion('');
    const optimistic: BoardroomMessage = {
      id: `local-${Date.now()}`,
      role: 'owner',
      content,
      createdAt: new Date().toISOString(),
      kind: 'message',
    };
    setSessions((prev) => prev.map((s) => s.id === active.id
      ? { ...s, output: { ...s.output, messages: [...s.output.messages, optimistic] } }
      : s));
    try {
      const data = asRecord(await apiFetch(`/api/admin/boardroom/sessions/${active.id}/messages`, {
        method: 'POST',
        body: { content, askAll, ...(selectedAgent ? { agentKey: selectedAgent } : {}) },
      }));
      const updated = normalizeSession(data.session);
      if (updated) setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Question failed');
      await load();
    } finally {
      setSending(false);
    }
  };

  const finalize = async () => {
    if (!active || finalizing) return;
    setFinalizing(true);
    try {
      const actionItems = actionsText.split('\n').map((a) => a.trim()).filter(Boolean);
      const data = asRecord(await apiFetch(`/api/admin/boardroom/sessions/${active.id}/finalize`, {
        method: 'POST',
        body: { decision, actionItems },
      }));
      const updated = normalizeSession(data.session);
      if (updated) setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast.success('Minutes saved — approved actions queued for sign-off');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not finalize meeting');
    } finally {
      setFinalizing(false);
    }
  };

  const toggleListening = () => {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      toast.error('Voice input is not supported by this browser — type your question instead.');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    try {
      const recognition = new Recognition();
      recognition.lang = 'en-KE';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i += 1) {
          transcript += event.results[i]?.[0]?.transcript ?? '';
        }
        setQuestion(transcript.slice(0, 2000));
      };
      recognition.onerror = (event) => {
        const map: Record<string, string> = {
          'not-allowed': 'Microphone permission denied — type your question instead.',
          'audio-capture': 'No microphone found — type your question instead.',
          'no-speech': 'No speech detected — try again or type your question.',
          network: 'Voice service unavailable — type your question instead.',
        };
        toast.error(map[event.error ?? ''] || 'Voice input failed — type your question instead.');
        setListening(false);
      };
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch {
      toast.error('Could not start voice input — type your question instead.');
      setListening(false);
    }
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Voice output is not supported by this browser.');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(speakable(text));
    utterance.lang = 'en-KE';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  if (accessLoading || loading) return <Spinner />;
  if (!isSuperAdmin) {
    return (
      <Card>
        <h1 className="text-lg font-semibold">Restricted</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          The AI Boardroom is available only to the SUPER_ADMIN.
        </p>
      </Card>
    );
  }

  const messages = active?.output.messages ?? [];

  return (
    <div>
      <PageHeader
        title="AI Boardroom"
        subtitle={`${reports.length} agents on duty · reports, questions, decisions and minutes in one room`}
        actions={
          <>
            <Badge tone={isConnected ? 'green' : 'amber'}>{isConnected ? 'Live' : 'Polling'}</Badge>
            <Button onClick={startMeeting} disabled={starting}>
              {starting ? 'Opening…' : '+ New meeting'}
            </Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <Card>
            <h2 className="mb-3 text-sm font-semibold">Participants</h2>
            <div className="space-y-2">
              {reports.map((report) => (
                <button
                  key={report.agentKey}
                  type="button"
                  onClick={() => { setSelectedAgent(report.agentKey); setAskAll(false); }}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                    selectedAgent === report.agentKey && !askAll
                      ? 'border-[var(--color-primary)] bg-[var(--surface-hover)]'
                      : 'border-[var(--border)]'
                  }`}
                >
                  <span>
                    <span className="font-medium">{report.agentName}</span>
                    <span className="block text-xs text-[var(--text-muted)]">{report.agentRole}</span>
                  </span>
                  <Badge tone={report.liveState === 'working' ? 'amber' : 'green'}>
                    {report.liveState ?? 'ready'}
                  </Badge>
                </button>
              ))}
              {!reports.length ? <p className="text-xs text-[var(--text-muted)]">No agent reports yet.</p> : null}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold">Meetings</h2>
            <div className="space-y-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setActiveId(session.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                    session.id === active?.id ? 'border-[var(--color-primary)] bg-[var(--surface-hover)]' : 'border-[var(--border)]'
                  }`}
                >
                  <span className="block truncate font-medium">{session.title}</span>
                  <span className="text-[var(--text-muted)]">{String(session.startedAt).slice(0, 16).replace('T', ' ')}</span>
                </button>
              ))}
              {!sessions.length ? <p className="text-xs text-[var(--text-muted)]">Open a meeting to begin.</p> : null}
            </div>
          </Card>
        </div>

        <Card className="flex min-h-[620px] flex-col">
          {!active ? (
            <EmptyState title="Open a meeting to brief the board" />
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
                <div>
                  <h2 className="font-semibold">{active.title}</h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    {active.output.metrics.participants} agents · {active.output.metrics.suggestions} suggestions · {active.output.metrics.actionItems} actions
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMuted((v) => !v)}
                  className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs"
                >
                  {muted ? '🔇 Voice off' : '🔊 Voice on'}
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {messages.map((msg) => {
                  const isOwner = msg.role === 'owner';
                  const isSystem = msg.role === 'system';
                  return (
                    <div key={msg.id} className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-xl px-4 py-2 text-sm ${
                          isOwner
                            ? 'bg-[var(--color-primary)] text-white'
                            : isSystem
                              ? 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
                              : 'bg-[var(--bg-primary)] text-[var(--text-primary)]'
                        }`}
                      >
                        {!isOwner && msg.agentName ? (
                          <div className="mb-1 text-xs font-semibold opacity-80">
                            {msg.agentName} {msg.kind === 'report' ? '· report' : ''}
                          </div>
                        ) : null}
                        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                        <div className="mt-1 flex items-center justify-between gap-3 text-[10px] opacity-60">
                          <span>{String(msg.createdAt).slice(11, 19) || ''}</span>
                          {!isOwner && !isSystem ? (
                            <button type="button" onClick={() => speak(msg.content)} className="underline">
                              Speak
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {thinking.map((key) => (
                  <div key={key} className="text-xs text-[var(--text-muted)]">{key} is thinking…</div>
                ))}
                {sending ? <div className="text-xs text-[var(--text-muted)]">Sending to the board…</div> : null}
                <div ref={bottomRef} />
              </div>

              <div className="mt-4 border-t border-[var(--border)] pt-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={askAll} onChange={(e) => { setAskAll(e.target.checked); if (e.target.checked) setSelectedAgent(''); }} />
                    Ask the board
                  </label>
                  <select
                    value={selectedAgent}
                    onChange={(e) => { setSelectedAgent(e.target.value); setAskAll(!e.target.value); }}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
                  >
                    <option value="">Choose an agent…</option>
                    {reports.map((r) => <option key={r.agentKey} value={r.agentKey}>{r.agentName}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`rounded-lg border px-3 py-1 text-xs ${listening ? 'border-red-400 text-red-500' : 'border-[var(--border)]'}`}
                  >
                    {listening ? '■ Stop' : '🎙 Speak'}
                  </button>
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value.slice(0, 2000))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void sendQuestion();
                      }
                    }}
                    placeholder="Ask a question, request a report, or paste contract terms for review…"
                    rows={2}
                    className="flex-1 resize-none rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm"
                  />
                  <Button onClick={() => void sendQuestion()} disabled={!question.trim() || sending}>
                    {sending ? '…' : 'Send'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <h2 className="mb-3 text-sm font-semibold">Suggestions</h2>
            <div className="space-y-2">
              {(active?.output.suggestions ?? []).slice(0, 10).map((suggestion) => (
                <div key={suggestion.id} className="rounded-lg border border-[var(--border)] p-2 text-xs">
                  <p>{suggestion.text}</p>
                  <p className="mt-1 text-[var(--text-muted)]">{suggestion.agentName ?? 'Workforce'}</p>
                </div>
              ))}
              {!active?.output.suggestions.length ? <p className="text-xs text-[var(--text-muted)]">No suggestions yet.</p> : null}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold">Minutes & decisions</h2>
            <ul className="mb-3 space-y-1 text-xs text-[var(--text-secondary)]">
              {(active?.output.minutes ?? []).slice(-8).map((minute, i) => <li key={`${minute.slice(0, 12)}-${i}`}>• {minute}</li>)}
              {!active?.output.minutes.length ? <li className="text-[var(--text-muted)]">Not finalized yet.</li> : null}
            </ul>
            <textarea
              value={decision}
              onChange={(e) => setDecision(e.target.value.slice(0, 2000))}
              placeholder="Decision / chairman's notes"
              rows={3}
              className="mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs"
            />
            <textarea
              value={actionsText}
              onChange={(e) => setActionsText(e.target.value.slice(0, 2000))}
              placeholder={'Action items, one per line\nExample: Draft mutual NDA for Acme Ltd'}
              rows={3}
              className="mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs"
            />
            <Button onClick={() => void finalize()} disabled={!active || finalizing} variant="outline">
              {finalizing ? 'Saving…' : 'Finalize minutes'}
            </Button>
            <p className="mt-2 text-[10px] text-[var(--text-muted)]">
              Action items are queued in Approvals for your explicit sign-off. Nothing is auto-sent or auto-signed.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
