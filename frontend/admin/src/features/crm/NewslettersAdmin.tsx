import { useCallback, useEffect, useState } from 'react';
import { Button, Card, EmptyState, Field, PageHeader, Spinner, Table, inputClass } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';

interface NewsletterRow {
  id: string;
  subject: string;
  status: string;
  recipientCount: number;
  openCount: number;
  clickCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface Stats { total: number; sent: number; totalSubscribers: number }

const EMPTY = { subject: '', body: '', htmlBody: '', status: 'draft', scheduledAt: '' };

export function NewslettersAdmin() {
  const [rows, setRows] = useState<NewsletterRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NewsletterRow | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, s] = await Promise.all([
        apiFetch('/api/newsletters'),
        apiFetch('/api/newsletters/stats').catch(() => null),
      ]);
      setRows(Array.isArray(list) ? list : []);
      setStats(s as Stats | null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load newsletters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setModalOpen(true); };
  const openEdit = (r: NewsletterRow) => {
    setEditing(r);
    setForm({
      subject: r.subject,
      body: '',
      htmlBody: '',
      status: r.status,
      scheduledAt: r.scheduledAt ? r.scheduledAt.slice(0, 16) : '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = { ...form, scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null };
      if (editing) {
        await apiFetch(`/api/newsletters/${editing.id}`, { method: 'PUT', body });
      } else {
        await apiFetch('/api/newsletters', { method: 'POST', body });
      }
      setModalOpen(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const send = async (id: string) => {
    setBusy(true);
    try {
      await apiFetch(`/api/newsletters/${id}/send`, { method: 'POST' });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      await apiFetch(`/api/newsletters/${id}`, { method: 'DELETE' });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Newsletters"
        subtitle="Campaigns and subscriber broadcast."
        actions={<Button onClick={openCreate}>New campaign</Button>}
      />
      {stats && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4"><div className="text-2xl font-bold">{stats.total}</div><div className="text-sm text-[var(--text-secondary)]">Campaigns</div></Card>
          <Card className="p-4"><div className="text-2xl font-bold">{stats.sent}</div><div className="text-sm text-[var(--text-secondary)]">Sent</div></Card>
          <Card className="p-4"><div className="text-2xl font-bold">{stats.totalSubscribers}</div><div className="text-sm text-[var(--text-secondary)]">Subscribers</div></Card>
        </div>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Card className="p-4">
        {loading ? <Spinner /> : rows.length === 0 ? <EmptyState title="No campaigns yet" /> : (
          <Table<NewsletterRow>
            rows={rows}
            columns={[
              { key: 'subject', header: 'Subject' },
              { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status}>{r.status}</Badge> },
              { key: 'recipientCount', header: 'Sent to' },
              { key: 'openCount', header: 'Opens' },
              { key: 'clickCount', header: 'Clicks' },
              { key: 'createdAt', header: 'Created', render: (r) => new Date(r.createdAt).toLocaleDateString() },
              { key: 'actions', header: '', render: (r) => (
                <div className="flex gap-2">
                  {r.status !== 'sent' && <Button variant="outline" onClick={() => openEdit(r)}>Edit</Button>}
                  {r.status !== 'sent' && <Button variant="outline" disabled={busy} onClick={() => void send(r.id)}>Send</Button>}
                  <Button variant="danger" onClick={() => void remove(r.id)}>Delete</Button>
                </div>
              ) },
            ]}
          />
        )}
      </Card>

      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)} title={editing ? 'Edit campaign' : 'New campaign'} wide footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void save()} disabled={busy || !form.subject.trim() || !form.body.trim()}>{busy ? 'Saving…' : 'Save'}</Button>
          </>
        }>
          <div className="space-y-3">
            <Field label="Subject"><input className={inputClass} value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} /></Field>
            <Field label="Body (plain text)"><textarea className={inputClass} rows={6} value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} /></Field>
            <Field label="HTML body (optional)"><textarea className={inputClass} rows={4} value={form.htmlBody} onChange={(e) => setForm((p) => ({ ...p, htmlBody: e.target.value }))} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Status">
                <select className={inputClass} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                  {['draft', 'scheduled', 'sent'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Schedule at">
                <input className={inputClass} type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))} />
              </Field>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default NewslettersAdmin;
