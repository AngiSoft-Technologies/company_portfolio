import { useState } from 'react';
import { Button, Card, Field, PageHeader, inputClass } from '@/components';
import { apiFetch } from '@/lib/adminApi';

type AssistTab = 'lead' | 'ticket' | 'content' | 'diff';

interface AssistResponse {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

function ResultView({ result }: { result: AssistResponse | null }) {
  if (!result) return null;
  if (!result.ok) {
    return <p className="mt-3 text-sm text-red-500">{result.error ?? 'Request failed'}</p>;
  }
  return (
    <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-[var(--surface)] p-3 text-xs whitespace-pre-wrap">
      {JSON.stringify(result.data, null, 2)}
    </pre>
  );
}

function LeadScoreForm() {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '', budget: '', timeline: '', source: '' });
  const [result, setResult] = useState<AssistResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));
  const submit = async () => {
    setBusy(true); setResult(null);
    try {
      const res = await apiFetch('/admin/ai-assist/lead-score', { method: 'POST', body: form });
      setResult(res as AssistResponse);
    } catch (e) { setResult({ ok: false, error: e instanceof Error ? e.message : 'Request failed' }); }
    finally { setBusy(false); }
  };
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-semibold">Lead scoring</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name"><input className={inputClass} value={form.name} onChange={set('name')} /></Field>
        <Field label="Email"><input className={inputClass} value={form.email} onChange={set('email')} /></Field>
        <Field label="Company"><input className={inputClass} value={form.company} onChange={set('company')} /></Field>
        <Field label="Budget"><input className={inputClass} value={form.budget} onChange={set('budget')} /></Field>
        <Field label="Timeline"><input className={inputClass} value={form.timeline} onChange={set('timeline')} /></Field>
        <Field label="Source"><input className={inputClass} value={form.source} onChange={set('source')} /></Field>
      </div>
      <Field label="Message"><textarea className={inputClass} rows={3} value={form.message} onChange={set('message')} /></Field>
      <Button onClick={submit} disabled={busy}>{busy ? 'Scoring…' : 'Score lead'}</Button>
      <ResultView result={result} />
    </Card>
  );
}

function TicketTriageForm() {
  const [form, setForm] = useState({ subject: '', body: '', priority: 'normal', clientName: '' });
  const [result, setResult] = useState<AssistResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));
  const submit = async () => {
    setBusy(true); setResult(null);
    try {
      const res = await apiFetch('/admin/ai-assist/ticket-triage', { method: 'POST', body: form });
      setResult(res as AssistResponse);
    } catch (e) { setResult({ ok: false, error: e instanceof Error ? e.message : 'Request failed' }); }
    finally { setBusy(false); }
  };
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-semibold">Support ticket triage</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Subject"><input className={inputClass} value={form.subject} onChange={set('subject')} /></Field>
        <Field label="Client"><input className={inputClass} value={form.clientName} onChange={set('clientName')} /></Field>
        <Field label="Current priority">
          <select className={inputClass} value={form.priority} onChange={set('priority')}>
            {['low', 'normal', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Body"><textarea className={inputClass} rows={4} value={form.body} onChange={set('body')} /></Field>
      <Button onClick={submit} disabled={busy}>{busy ? 'Triaging…' : 'Triage ticket'}</Button>
      <ResultView result={result} />
    </Card>
  );
}

function ContentSuggestForm() {
  const [form, setForm] = useState({ type: 'blog', topic: '', keywords: '', audience: '' });
  const [result, setResult] = useState<AssistResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));
  const submit = async () => {
    setBusy(true); setResult(null);
    try {
      const body = { ...form, keywords: form.keywords.split(',').map((s) => s.trim()).filter(Boolean) };
      const res = await apiFetch('/admin/ai-assist/content-suggest', { method: 'POST', body });
      setResult(res as AssistResponse);
    } catch (e) { setResult({ ok: false, error: e instanceof Error ? e.message : 'Request failed' }); }
    finally { setBusy(false); }
  };
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-semibold">Content suggestions</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Type">
          <select className={inputClass} value={form.type} onChange={set('type')}>
            {['blog', 'service', 'announcement', 'case_study'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Topic"><input className={inputClass} value={form.topic} onChange={set('topic')} /></Field>
        <Field label="Audience"><input className={inputClass} value={form.audience} onChange={set('audience')} /></Field>
      </div>
      <Field label="Keywords (comma-separated)"><input className={inputClass} value={form.keywords} onChange={set('keywords')} /></Field>
      <Button onClick={submit} disabled={busy}>{busy ? 'Suggesting…' : 'Suggest content'}</Button>
      <ResultView result={result} />
    </Card>
  );
}

function DiffReviewForm() {
  const [form, setForm] = useState({ context: '', diff: '' });
  const [result, setResult] = useState<AssistResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setResult(null);
    try {
      const res = await apiFetch('/admin/ai-assist/review-diff', { method: 'POST', body: form });
      setResult(res as AssistResponse);
    } catch (e) { setResult({ ok: false, error: e instanceof Error ? e.message : 'Request failed' }); }
    finally { setBusy(false); }
  };
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-semibold">Diff review</h3>
      <Field label="Context"><input className={inputClass} value={form.context} onChange={(e) => setForm((p) => ({ ...p, context: e.target.value }))} /></Field>
      <Field label="Diff (unified)"><textarea className={inputClass} rows={10} value={form.diff} onChange={(e) => setForm((p) => ({ ...p, diff: e.target.value }))} /></Field>
      <Button onClick={submit} disabled={busy || !form.diff.trim()}>{busy ? 'Reviewing…' : 'Review diff'}</Button>
      <ResultView result={result} />
    </Card>
  );
}

export function AiAssist() {
  const [tab, setTab] = useState<AssistTab>('lead');
  const tabs: { id: AssistTab; label: string }[] = [
    { id: 'lead', label: 'Lead scoring' },
    { id: 'ticket', label: 'Ticket triage' },
    { id: 'content', label: 'Content' },
    { id: 'diff', label: 'Diff review' },
  ];
  return (
    <div className="space-y-4">
      <PageHeader title="AI Assist" subtitle="Lead scoring, support triage, content suggestions, and diff review powered by the configured AI provider." />
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === t.id ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--surface)]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'lead' && <LeadScoreForm />}
      {tab === 'ticket' && <TicketTriageForm />}
      {tab === 'content' && <ContentSuggestForm />}
      {tab === 'diff' && <DiffReviewForm />}
    </div>
  );
}

export default AiAssist;
