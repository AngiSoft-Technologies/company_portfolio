import { useCallback, useEffect, useState } from 'react';
import { Button, Card, EmptyState, Field, PageHeader, Spinner, Table, inputClass } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';

interface SurveyRow {
  id: string;
  title: string;
  description: string | null;
  audience: string;
  status: string;
  questions: { id?: string; type: string; label: string; options?: string[]; required?: boolean }[];
  _count?: { responses: number };
  createdAt: string;
}

interface SurveyResponse {
  id: string;
  answers: Record<string, unknown>;
  createdAt: string;
}

const STATUSES = ['draft', 'active', 'closed'];
const EMPTY_QUESTION = { type: 'text', label: '', options: '', required: false };

export function SurveysAdmin() {
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SurveyRow | null>(null);
  const [responsesFor, setResponsesFor] = useState<SurveyRow | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [form, setForm] = useState({ title: '', description: '', audience: 'clients', status: 'draft' });
  const [questions, setQuestions] = useState<typeof EMPTY_QUESTION[]>([{ ...EMPTY_QUESTION }]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/v1/surveys');
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load surveys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', audience: 'clients', status: 'draft' });
    setQuestions([{ ...EMPTY_QUESTION }]);
    setModalOpen(true);
  };

  const openEdit = (r: SurveyRow) => {
    setEditing(r);
    setForm({ title: r.title, description: r.description ?? '', audience: r.audience, status: r.status });
    setQuestions((r.questions ?? []).map((q) => ({
      type: q.type,
      label: q.label,
      options: (q.options ?? []).join(', '),
      required: Boolean(q.required),
    })));
    setModalOpen(true);
  };

  const setQ = (i: number, patch: Partial<typeof EMPTY_QUESTION>) =>
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        ...form,
        questions: questions
          .filter((q) => q.label.trim())
          .map((q) => ({
            type: q.type,
            label: q.label.trim(),
            options: q.type === 'select' || q.type === 'multi' ? q.options.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
            required: q.required,
          })),
      };
      if (editing) {
        await apiFetch(`/v1/surveys/${editing.id}`, { method: 'PUT', body: payload });
      } else {
        await apiFetch('/v1/surveys', { method: 'POST', body: payload });
      }
      setModalOpen(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (r: SurveyRow, status: string) => {
    try {
      await apiFetch(`/v1/surveys/${r.id}`, { method: 'PUT', body: { status } });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const remove = async (r: SurveyRow) => {
    if (!window.confirm(`Delete "${r.title}"?`)) return;
    try {
      await apiFetch(`/v1/surveys/${r.id}`, { method: 'DELETE' });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const viewResponses = async (r: SurveyRow) => {
    setResponsesFor(r);
    setResponses([]);
    try {
      const data = await apiFetch(`/v1/surveys/${r.id}/responses`);
      setResponses(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load responses');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Surveys" subtitle="Client feedback surveys and response review." actions={<Button onClick={openCreate}>New survey</Button>} />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Card className="p-4">
        {loading ? <Spinner /> : rows.length === 0 ? <EmptyState title="No surveys yet" /> : (
          <Table<SurveyRow>
            rows={rows}
            columns={[
              { key: 'title', header: 'Title' },
              { key: 'audience', header: 'Audience', render: (r) => <Badge tone="blue">{r.audience}</Badge> },
              { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status}>{r.status}</Badge> },
              { key: 'questions', header: 'Questions', render: (r) => r.questions?.length ?? 0 },
              { key: 'responses', header: 'Responses', render: (r) => r._count?.responses ?? 0 },
              { key: 'createdAt', header: 'Created', render: (r) => new Date(r.createdAt).toLocaleDateString() },
              { key: 'actions', header: '', render: (r) => (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => openEdit(r)}>Edit</Button>
                  {r.status !== 'active' && r.status !== 'closed' && <Button variant="outline" onClick={() => void setStatus(r, 'active')}>Activate</Button>}
                  {r.status === 'active' && <Button variant="outline" onClick={() => void setStatus(r, 'closed')}>Close</Button>}
                  <Button variant="outline" onClick={() => void viewResponses(r)}>Responses</Button>
                  <Button variant="danger" onClick={() => void remove(r)}>Delete</Button>
                </div>
              ) },
            ]}
          />
        )}
      </Card>

      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)} title={editing ? 'Edit survey' : 'New survey'} wide footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void save()} disabled={busy || !form.title.trim() || questions.every((q) => !q.label.trim())}>{busy ? 'Saving…' : 'Save'}</Button>
          </>
        }>
          <div className="space-y-3">
            <Field label="Title"><input className={inputClass} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></Field>
            <Field label="Description"><input className={inputClass} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Audience">
                <select className={inputClass} value={form.audience} onChange={(e) => setForm((p) => ({ ...p, audience: e.target.value }))}>
                  {['clients', 'staff', 'public'].map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select className={inputClass} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-secondary)]">Questions</span>
                <Button variant="outline" onClick={() => setQuestions((qs) => [...qs, { ...EMPTY_QUESTION }])}>Add question</Button>
              </div>
              {questions.map((q, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-[var(--border)] p-3 sm:grid-cols-[1fr_140px_auto]">
                  <input className={inputClass} placeholder="Question label" value={q.label} onChange={(e) => setQ(i, { label: e.target.value })} />
                  <select className={inputClass} value={q.type} onChange={(e) => setQ(i, { type: e.target.value })}>
                    {['text', 'select', 'multi', 'rating'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={q.required} onChange={(e) => setQ(i, { required: e.target.checked })} />Req</label>
                    <Button variant="ghost" onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}>✕</Button>
                  </div>
                  {(q.type === 'select' || q.type === 'multi') && (
                    <input className={inputClass + ' sm:col-span-3'} placeholder="Options, comma-separated" value={q.options} onChange={(e) => setQ(i, { options: e.target.value })} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {responsesFor && (
        <Modal onClose={() => setResponsesFor(null)} title={`Responses — ${responsesFor.title}`} wide>
          {responses.length === 0 ? <EmptyState title="No responses yet" /> : (
            <ul className="space-y-3">
              {responses.map((r) => (
                <li key={r.id} className="rounded-lg border border-[var(--border)] p-3 text-sm">
                  <div className="mb-1 text-xs text-[var(--text-muted)]">{new Date(r.createdAt).toLocaleString()}</div>
                  <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(r.answers, null, 2)}</pre>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}

export default SurveysAdmin;
