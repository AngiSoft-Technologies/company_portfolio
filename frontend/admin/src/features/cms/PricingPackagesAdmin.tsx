import { useCallback, useEffect, useState } from 'react';
import { Button, Card, EmptyState, Field, PageHeader, Spinner, Table, inputClass } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';

interface PricingPackage {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  serviceId: string | null;
  price: string | number;
  currency: string;
  billingPeriod: string | null;
  features: string[] | null;
  highlighted: boolean;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  service?: { id: string; title: string; slug: string } | null;
}

interface ServiceOption {
  id: string;
  title: string;
}

const PERIODS = ['one_time', 'monthly', 'yearly', 'project', 'custom'];
const EMPTY = {
  name: '', slug: '', description: '', serviceId: '', price: '',
  currency: 'KES', billingPeriod: 'one_time', features: '',
  highlighted: false, published: false, sortOrder: 0,
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function PricingPackagesAdmin() {
  const [rows, setRows] = useState<PricingPackage[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PricingPackage | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pkgs, svcs] = await Promise.all([
        apiFetch('/api/pricing-packages/admin'),
        apiFetch('/api/services'),
      ]);
      setRows(Array.isArray(pkgs) ? pkgs : []);
      setServices(Array.isArray(svcs) ? svcs : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pricing packages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setModalOpen(true); };
  const openEdit = (r: PricingPackage) => {
    setEditing(r);
    setForm({
      name: r.name,
      slug: r.slug,
      description: r.description ?? '',
      serviceId: r.serviceId ?? '',
      price: String(r.price),
      currency: r.currency,
      billingPeriod: r.billingPeriod ?? 'one_time',
      features: Array.isArray(r.features) ? r.features.join('\n') : '',
      highlighted: r.highlighted,
      published: r.published,
      sortOrder: r.sortOrder,
    });
    setModalOpen(true);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        description: form.description || null,
        serviceId: form.serviceId || null,
        price: Number(form.price),
        currency: form.currency,
        billingPeriod: form.billingPeriod || null,
        features: form.features.split('\n').map((s) => s.trim()).filter(Boolean),
        highlighted: form.highlighted,
        published: form.published,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editing) {
        await apiFetch(`/api/pricing-packages/admin/${editing.id}`, { method: 'PUT', body });
      } else {
        await apiFetch('/api/pricing-packages/admin', { method: 'POST', body });
      }
      setModalOpen(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r: PricingPackage) => {
    if (!window.confirm(`Delete pricing package "${r.name}"?`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/pricing-packages/admin/${r.id}`, { method: 'DELETE' });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const serviceName = (r: PricingPackage) =>
    r.service?.title ?? (r.serviceId ? services.find((s) => s.id === r.serviceId)?.title ?? '—' : '—');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pricing Packages"
        subtitle="Structured pricing tiers/packages. Published packages are served at GET /api/pricing-packages."
        actions={<Button onClick={openCreate}>New package</Button>}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Card className="p-4">
        {loading ? <Spinner /> : rows.length === 0 ? <EmptyState title="No pricing packages" /> : (
          <Table<PricingPackage>
            rows={rows}
            columns={[
              { key: 'name', header: 'Package', render: (r) => (
                <div>
                  <div className="font-medium">
                    {r.name}
                    {r.highlighted && <> <Badge tone="accent">featured</Badge></>}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">/{r.slug} · {serviceName(r)}</div>
                </div>
              ) },
              { key: 'price', header: 'Price', render: (r) => `${r.currency} ${Number(r.price).toLocaleString()}` },
              { key: 'billingPeriod', header: 'Billing', render: (r) => r.billingPeriod ?? '—' },
              { key: 'features', header: 'Features', render: (r) => `${Array.isArray(r.features) ? r.features.length : 0}` },
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
        <Modal onClose={() => setModalOpen(false)} title={editing ? 'Edit package' : 'New package'} footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void save()} disabled={busy || !form.name.trim() || form.price === ''}>{busy ? 'Saving…' : 'Save'}</Button>
          </>
        }>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name"><input className={inputClass} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></Field>
              <Field label="Slug"><input className={inputClass} value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder={slugify(form.name)} /></Field>
            </div>
            <Field label="Description"><textarea className={inputClass} rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Price"><input className={inputClass} type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} /></Field>
              <Field label="Currency"><input className={inputClass} maxLength={3} value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} /></Field>
              <Field label="Billing period">
                <select className={inputClass} value={form.billingPeriod} onChange={(e) => setForm((p) => ({ ...p, billingPeriod: e.target.value }))}>
                  {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Linked service">
              <select className={inputClass} value={form.serviceId} onChange={(e) => setForm((p) => ({ ...p, serviceId: e.target.value }))}>
                <option value="">— none —</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </Field>
            <Field label="Features (one per line)">
              <textarea className={inputClass} rows={4} value={form.features} onChange={(e) => setForm((p) => ({ ...p, features: e.target.value }))} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Sort order"><input className={inputClass} type="number" value={form.sortOrder} onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value === '' ? 0 : Number(e.target.value) }))} /></Field>
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input type="checkbox" checked={form.highlighted} onChange={(e) => setForm((p) => ({ ...p, highlighted: e.target.checked }))} />
                Highlighted
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

export default PricingPackagesAdmin;
