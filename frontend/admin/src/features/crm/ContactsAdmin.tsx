import { useCallback, useEffect, useState } from 'react';
import { Button, Card, EmptyState, PageHeader, Spinner, Table } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { toArr, rowId, type Rec } from '@/lib/records';
import { asStr, formatDateTime } from '@/lib/format';
import { Badge } from '@/lib/Badge';

export interface LeadRow extends Rec {
  id: string;
}

const FILTERS = ['All', 'New', 'Contacted', 'Qualified', 'Closed'];
const STATUS_OPTIONS = ['New', 'Contacted', 'Qualified', 'Closed'];

export function ContactsAdmin() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let arr: Rec[] = [];
    let err: string | null = null;
    try {
      arr = toArr(await apiFetch('/api/leads'));
    } catch (e) {
      err = (e as Error).message || 'Failed to load leads';
    }
    if (arr.length === 0) {
      try {
        arr = toArr(await apiFetch('/api/contact-enquiries'));
        err = null;
      } catch {
        /* keep primary error */
      }
    }
    setRows(arr.map((r) => ({ ...r, id: rowId(r) })));
    setError(err);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (row: LeadRow, status: string) => {
    setBusyId(row.id);
    setError(null);
    try {
      await apiFetch(`/api/leads/${encodeURIComponent(row.id)}`, { method: 'PUT', body: { status } });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)));
    } catch (e) {
      setError((e as Error).message || 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  };

  const removeLead = async (row: LeadRow) => {
    setBusyId(row.id);
    setError(null);
    try {
      await apiFetch(`/api/leads/${encodeURIComponent(row.id)}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError((e as Error).message || 'Failed to delete lead');
    } finally {
      setBusyId(null);
    }
  };

  const visible = rows.filter((r) => {
    if (filter === 'All') return true;
    return String(r.status ?? '').toLowerCase().startsWith(filter.toLowerCase());
  });

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle="Leads and enquiries from across channels."
        actions={
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[#0875FF] text-white'
                : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : null}
      {!loading && error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {!loading && (rows.length === 0 ? (
        <Card>
          <EmptyState title="No leads yet" />
        </Card>
      ) : (
        <Table<LeadRow>
          rows={visible}
          onDelete={removeLead}
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (r) => {
                const name = asStr(r, 'name') !== '—' ? asStr(r, 'name') : asStr(r, 'fullName');
                return <span className="font-medium">{name}</span>;
              },
            },
            { key: 'email', header: 'Email', render: (r) => asStr(r, 'email') },
            { key: 'phone', header: 'Phone', render: (r) => asStr(r, 'phone') },
            { key: 'source', header: 'Source', render: (r) => asStr(r, 'source') },
            {
              key: 'status',
              header: 'Status',
              render: (r) => (
                <div className="flex items-center gap-2">
                  <Badge tone={undefined}>{asStr(r, 'status')}</Badge>
                  <select
                    value={String(r.status ?? '')
                      .split(' ')
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' ')}
                    disabled={busyId === r.id}
                    onChange={(e) => void updateStatus(r, e.target.value)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-[#0875FF]"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              ),
            },
            { key: 'createdAt', header: 'Created', render: (r) => formatDateTime(r.createdAt) },
          ]}
        />
      ))}
    </div>
  );
}

export default ContactsAdmin;