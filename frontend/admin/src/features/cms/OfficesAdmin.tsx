import { useCallback, useEffect, useState } from 'react';
import { Button, Card, EmptyState, Field, PageHeader, Spinner, Table, inputClass } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';

interface Office {
  id: string;
  name: string;
  slug: string;
  addressLine: string | null;
  city: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  hours: Array<{ label?: string; days?: string; hours?: string }> | null;
  mapUrl: string | null;
  isHeadquarters: boolean;
  published: boolean;
  sortOrder: number;
  createdAt: string;
}

const EMPTY = {
  name: '', slug: '', addressLine: '', city: '', country: 'Kenya',
  phone: '', email: '', hours: '', mapUrl: '',
  isHeadquarters: false, published: false, sortOrder: 0,
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const hoursToText = (h: Office['hours']) =>
  Array.isArray(h) ? h.map((x) => [x.days, x.hours].filter(Boolean).join(': ')).filter(Boolean).join('\n') : '';

export function OfficesAdmin() {
  const [rows, setRows] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Office | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/api/offices/admin');
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load offices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setModalOpen(true); };
  const openEdit = (r: Office) => {
    setEditing(r);
    setForm({
      name: r.name,
      slug: r.slug,
      addressLine: r.addressLine ?? '',
      city: r.city ?? '',
      country: r.country || 'Kenya',
      phone: r.phone ?? '',
      email: r.email ?? '',
      hours: hoursToText(r.hours),
      mapUrl: r.mapUrl ?? '',
      isHeadquarters: r.isHeadquarters,
      published: r.published,
      sortOrder: r.sortOrder,
    });
    setModalOpen(true);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const hours = form.hours
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [days, ...rest] = line.split(':');
          return { days: days?.trim() || undefined, hours: rest.join(':').trim() || undefined };
        });
      const body = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        addressLine: form.addressLine || null,
        city: form.city || null,
        country: form.country || 'Kenya',
        phone: form.phone || null,
        email: form.email || null,
        hours: hours.length ? hours : null,
        mapUrl: form.mapUrl || null,
        isHeadquarters: form.isHeadquarters,
        published: form.published,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editing) {
        await apiFetch(`/api/offices/admin/${editing.id}`, { method: 'PUT', body });
      } else {
        await apiFetch('/api/offices/admin', { method: 'POST', body });
      }
      setModalOpen(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r: Office) => {
    if (!window.confirm(`Delete office "${r.name}"?`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/offices/admin/${r.id}`, { method: 'DELETE' });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const location = (r: Office) =>
    [r.addressLine, r.city, r.country].filter(Boolean).join(', ');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Offices & Locations"
        subtitle="Structured office locations shown on the public contact page. Served at GET /api/offices."
        actions={<Button onClick={openCreate}>New office</Button>}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Card className="p-4">
        {loading ? <Spinner /> : rows.length === 0 ? <EmptyState title="No offices" /> : (
          <Table<Office>
            rows={rows}
            columns={[
              { key: 'name', header: 'Office', render: (r) => (
                <div>
                  <div className="font-medium">
                    {r.name}
                    {r.isHeadquarters && <> <Badge tone="accent">HQ</Badge></>}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">/{r.slug}</div>
                </div>
              ) },
              { key: 'location', header: 'Location', render: (r) => location(r) || '—' },
              { key: 'contact', header: 'Contact', render: (r) => [r.phone, r.email].filter(Boolean).join(' · ') || '—' },
              { key: 'hours', header: 'Hours', render: (r) => hoursToText(r.hours).split('\n')[0] || '—' },
              { key: 'published', header: 'Status', render: (r) => <Badge tone={r.published ? 'success' : 'neutral'}>{r.published ? 'published' : 'draft'}</Badge> },
              { key: 'sortOrder', header: 'Order', render: (r) => r.sortOrder },
              { key: 'actions', header: '', render: (r) => (
                <div className="flex gap-1.5">
                  <Button variant="outline" onClick={() => openEdit(r)}>Edit</Button>
                  <Button variant="danger" disabled={busy} onClick={() => void remove(r)}>Delete</Button>
                </div>
              ) },
            ]}
          />
        )}
      </Card>

      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)} title={editing ? 'Edit office' : 'New office'} footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void save()} disabled={busy || !form.name.trim()}>{busy ? 'Saving…' : 'Save'}</Button>
          </>
        }>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name"><input className={inputClass} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></Field>
              <Field label="Slug"><input className={inputClass} value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder={slugify(form.name)} /></Field>
            </div>
            <Field label="Address line"><input className={inputClass} value={form.addressLine} onChange={(e) => setForm((p) => ({ ...p, addressLine: e.target.value }))} /></Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="City"><input className={inputClass} value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} /></Field>
              <Field label="Country"><input className={inputClass} value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} /></Field>
              <Field label="Sort order"><input className={inputClass} type="number" value={form.sortOrder} onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value === '' ? 0 : Number(e.target.value) }))} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone"><input className={inputClass} value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></Field>
              <Field label="Email"><input className={inputClass} type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></Field>
            </div>
            <Field label="Opening hours (one per line: Days: hours)">
              <textarea className={inputClass} rows={3} value={form.hours} onChange={(e) => setForm((p) => ({ ...p, hours: e.target.value }))} placeholder={'Mon–Fri: 8:00–17:00\nSat: 9:00–13:00'} />
            </Field>
            <Field label="Map embed URL"><input className={inputClass} value={form.mapUrl} onChange={(e) => setForm((p) => ({ ...p, mapUrl: e.target.value }))} placeholder="https://maps.google.com/…" /></Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input type="checkbox" checked={form.isHeadquarters} onChange={(e) => setForm((p) => ({ ...p, isHeadquarters: e.target.checked }))} />
                Headquarters
              </label>
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input type="checkbox" checked={form.published} onChange={(e) => setForm((p) => ({ ...p, published: e.target.checked }))} />
                Published
              </label>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default OfficesAdmin;
