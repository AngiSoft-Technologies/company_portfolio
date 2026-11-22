import { useCallback, useEffect, useState } from 'react';
import { Button, Card, EmptyState, Field, PageHeader, Spinner, Table, inputClass } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';

interface ExpenseRow {
  id: string;
  title: string;
  description: string | null;
  amount: string | number;
  currency: string;
  category: string | null;
  status: string;
  submittedBy?: { id: string; firstName?: string; lastName?: string; email?: string } | null;
  reviewedBy?: { id: string; firstName?: string; lastName?: string } | null;
  reviewNote: string | null;
  createdAt: string;
}

const STATUSES = ['draft', 'submitted', 'approved', 'rejected', 'paid'];
const EMPTY = { title: '', description: '', amount: '', currency: 'KES', category: '' };

const personName = (p?: { firstName?: string; lastName?: string; email?: string } | null) =>
  p ? [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || '—' : '—';

export function ExpensesAdmin() {
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const data = await apiFetch(`/v1/expenses${qs}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setModalOpen(true); };
  const openEdit = (r: ExpenseRow) => {
    setEditing(r);
    setForm({
      title: r.title,
      description: r.description ?? '',
      amount: String(r.amount),
      currency: r.currency,
      category: r.category ?? '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = {
        title: form.title,
        description: form.description || null,
        amount: Number(form.amount),
        currency: form.currency,
        category: form.category || null,
      };
      if (editing) {
        await apiFetch(`/v1/expenses/${editing.id}`, { method: 'PUT', body });
      } else {
        await apiFetch('/v1/expenses', { method: 'POST', body });
      }
      setModalOpen(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const act = async (id: string, action: string, body?: unknown) => {
    setBusy(true);
    try {
      await apiFetch(`/v1/expenses/${id}/${action}`, { method: 'POST', body });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setBusy(false);
    }
  };

  const review = async (r: ExpenseRow, decision: 'approved' | 'rejected') => {
    const note = window.prompt(`Review note for "${r.title}" (optional):`) ?? undefined;
    await act(r.id, 'review', { decision, note: note || null });
  };

  const filtered = rows;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Expenses"
        subtitle="Expense claims with approval workflow."
        actions={
          <div className="flex gap-2">
            <select className={inputClass + ' w-auto'} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Button onClick={openCreate}>New expense</Button>
          </div>
        }
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Card className="p-4">
        {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState title="No expenses" /> : (
          <Table<ExpenseRow>
            rows={filtered}
            columns={[
              { key: 'title', header: 'Expense', render: (r) => (
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{r.category ?? '—'} · {personName(r.submittedBy)}</div>
                </div>
              )},
              { key: 'amount', header: 'Amount', render: (r) => `${r.currency} ${Number(r.amount).toLocaleString()}` },
              { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status}>{r.status}</Badge> },
              { key: 'reviewNote', header: 'Review', render: (r) => r.reviewNote ? <span className="line-clamp-1 max-w-40 text-xs">{r.reviewNote}</span> : '—' },
              { key: 'createdAt', header: 'Created', render: (r) => new Date(r.createdAt).toLocaleDateString() },
              { key: 'actions', header: '', render: (r) => (
                <div className="flex flex-wrap gap-1.5">
                  {r.status === 'draft' && <Button variant="outline" onClick={() => openEdit(r)}>Edit</Button>}
                  {r.status === 'draft' && <Button variant="outline" disabled={busy} onClick={() => void act(r.id, 'submit')}>Submit</Button>}
                  {r.status === 'submitted' && (
                    <>
                      <Button variant="outline" disabled={busy} onClick={() => void review(r, 'approved')}>Approve</Button>
                      <Button variant="danger" disabled={busy} onClick={() => void review(r, 'rejected')}>Reject</Button>
                    </>
                  )}
                  {r.status === 'approved' && <Button variant="outline" disabled={busy} onClick={() => void act(r.id, 'mark-paid')}>Mark paid</Button>}
                </div>
              ) },
            ]}
          />
        )}
      </Card>

      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)} title={editing ? 'Edit expense' : 'New expense'} footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void save()} disabled={busy || !form.title.trim() || !form.amount}>{busy ? 'Saving…' : 'Save'}</Button>
          </>
        }>
          <div className="space-y-3">
            <Field label="Title"><input className={inputClass} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></Field>
            <Field label="Description"><textarea className={inputClass} rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Amount"><input className={inputClass} type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} /></Field>
              <Field label="Currency"><input className={inputClass} maxLength={3} value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} /></Field>
              <Field label="Category"><input className={inputClass} value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} /></Field>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ExpensesAdmin;
