import { useCallback, useEffect, useState } from 'react';
import { Button, Card, EmptyState, PageHeader, Spinner, Table } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';

interface InquiryRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  product?: { id: string; name?: string; title?: string } | null;
  createdAt: string;
}

const STATUSES = ['new', 'in_progress', 'resolved', 'closed'];

export function ProductInquiriesAdmin() {
  const [rows, setRows] = useState<InquiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/api/product-inquiries/admin');
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const setStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/api/product-inquiries/${id}`, { method: 'PUT', body: { status } });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const filtered = statusFilter ? rows.filter((r) => r.status === statusFilter) : rows;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Product Inquiries"
        subtitle="Enquiries submitted from product pages."
        actions={
          <select
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        }
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Card className="p-4">
        {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState title="No inquiries" /> : (
          <Table<InquiryRow>
            rows={filtered}
            columns={[
              { key: 'name', header: 'Contact', render: (r) => (
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{r.email}{r.phone ? ` · ${r.phone}` : ''}</div>
                </div>
              )},
              { key: 'product', header: 'Product', render: (r) => r.product?.name ?? r.product?.title ?? '—' },
              { key: 'message', header: 'Message', render: (r) => <span className="line-clamp-2 max-w-xs">{r.message}</span> },
              { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status}>{r.status.replace('_', ' ')}</Badge> },
              { key: 'createdAt', header: 'Received', render: (r) => new Date(r.createdAt).toLocaleDateString() },
              { key: 'actions', header: '', render: (r) => (
                <select
                  className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs"
                  value={r.status}
                  onChange={(e) => void setStatus(r.id, e.target.value)}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              ) },
            ]}
          />
        )}
      </Card>
    </div>
  );
}

export default ProductInquiriesAdmin;
