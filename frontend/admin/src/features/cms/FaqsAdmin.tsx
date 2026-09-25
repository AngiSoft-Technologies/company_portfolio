import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useCrud, Card, Spinner, EmptyState, PageHeader, Button, Table, Field, inputClass, type CrudConfig } from '@/components';
import { truncate, ModalShell, saveJson, SaveStatus } from './shared';

interface Row {
  id: string;
  question: string;
  answer: string;
}

const LIST_ENDPOINT = '/faq/all';
const ENDPOINT = '/faq';

export function FaqsAdmin() {
  const { rows, loading, error, refresh, remove } = useCrud<Row, CrudConfig<Row>>({ endpoint: LIST_ENDPOINT });
  const [editing, setEditing] = useState<Row | null>(null);

  const handleDelete = (r: Row) => {
    if (window.confirm(`Delete FAQ "${r.question || r.id}"?`)) void remove(String(r.id));
  };

  return (
    <div>
      <PageHeader
        title="FAQs"
        subtitle="Frequently asked questions shown on the site"
        actions={<Button onClick={() => setEditing({} as Row)}>New FAQ</Button>}
      />
      {loading ? (
        <Spinner />
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <Table<Row>
          rows={rows}
          onEdit={setEditing}
          onDelete={handleDelete}
          columns={[
            { key: 'question', header: 'Question', render: (r) => <span className="font-medium">{truncate(r.question)}</span> },
            { key: 'answer', header: 'Answer', render: (r) => <span className="text-slate-500">{truncate(r.answer, 80)}</span> },
          ]}
        />
      )}
      {editing && <FaqFormModal row={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}

function FaqFormModal({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(row.id);
  const [form, setForm] = useState<Record<string, string>>(() => ({
    question: String(row.question ?? ''),
    answer: String(row.answer ?? ''),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = (key: string) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await saveJson(isEdit ? 'PUT' : 'POST', `${ENDPOINT}${isEdit ? `/${row.id}` : ''}`, { ...form });
      setSuccess(true);
      onSaved();
    } catch (err) {
      setError((err as Error).message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={`${isEdit ? 'Edit' : 'New'} FAQ`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Question">
          <input className={inputClass} value={form.question} onChange={set('question')} required />
        </Field>
        <Field label="Answer">
          <textarea className={inputClass} rows={6} value={form.answer} onChange={set('answer')} />
        </Field>
        <SaveStatus error={error} success={success} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className={saving ? 'opacity-60' : ''}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create FAQ'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

export default FaqsAdmin;