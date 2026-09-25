import { useCallback, useEffect, useState } from 'react';
import { Button, EmptyState, PageHeader, Spinner, Table } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { toArr, rowId, type Rec } from '@/lib/records';
import { asStr, formatKsh, formatDate, formatDateTime } from '@/lib/format';
import { Badge } from '@/lib/Badge';

export interface BookingRow extends Rec {
  id: string;
}

const STATUS_FLOW = ['pending', 'confirmed', 'in-progress', 'completed'];

export function BookingsManagement() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyRef, setBusyRef] = useState<string | null>(null);
  const [detail, setDetail] = useState<Rec | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const arr = toArr(await apiFetch('/api/bookings'));
      setRows(arr.map((r) => ({ ...r, id: rowId(r) })));
    } catch (e) {
      setError((e as Error).message || 'Failed to load bookings');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (row: BookingRow) => {
    const ref = asStr(row, 'reference');
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    try {
      const json = await apiFetch(`/api/bookings/${encodeURIComponent(ref)}`);
      setDetail((json ?? {}) as Rec);
    } catch (e) {
      setDetailError((e as Error).message || 'Failed to load booking detail');
      setDetail(row as Rec);
    } finally {
      setDetailLoading(false);
    }
  };

  const setStatus = async (row: BookingRow, status: string) => {
    const ref = asStr(row, 'reference');
    setBusyRef(ref);
    setError(null);
    try {
      await apiFetch(`/api/bookings/${encodeURIComponent(ref)}/status`, { method: 'PATCH', body: { status } });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)));
      setDetail((prev) => (prev && String(prev.reference) === ref ? { ...prev, status } : prev));
    } catch (e) {
      setError((e as Error).message || 'Failed to update status');
    } finally {
      setBusyRef(null);
    }
  };

  const advance = async (row: BookingRow) => {
    const current = String(row.status ?? '').toLowerCase();
    const idx = STATUS_FLOW.indexOf(current);
    const next = STATUS_FLOW[Math.min(STATUS_FLOW.length - 1, Math.max(0, idx + 1))];
    if (next !== current) await setStatus(row, next);
  };

  const removeBooking = async (row: BookingRow) => {
    const ref = asStr(row, 'reference');
    setBusyRef(ref);
    setError(null);
    try {
      await apiFetch(`/api/bookings/${encodeURIComponent(ref)}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError((e as Error).message || 'Failed to delete booking');
    } finally {
      setBusyRef(null);
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setDetailError(null);
  };

  const statusOf = (r: Rec) => asStr(r, 'status');
  const refOf = (r: Rec) => asStr(r, 'reference');

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle="Track and advance booking lifecycle stages."
        actions={
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {loading ? <Spinner /> : null}
      {!loading && error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState title="No bookings" />
        </div>
      ) : (
        <Table<BookingRow>
          rows={rows}
          onEdit={openDetail}
          onDelete={(r) => void removeBooking(r)}
          columns={[
            { key: 'reference', header: 'Reference', render: (r) => <span className="font-medium">{refOf(r)}</span> },
            {
              key: 'client',
              header: 'Client / Service',
              render: (r) => {
                const client = asStr(r, 'client') !== '—' ? asStr(r, 'client') : asStr(r, 'clientName');
                const service = asStr(r, 'service') !== '—' ? asStr(r, 'service') : asStr(r, 'serviceType');
                return client === '—' && service === '—' ? '—' : `${client} · ${service}`;
              },
            },
            {
              key: 'date',
              header: 'Date',
              render: (r) => formatDate(r.date ?? r.scheduledAt ?? r.startDate ?? r.createdAt),
            },
            { key: 'status', header: 'Status', render: (r) => <Badge>{statusOf(r)}</Badge> },
            { key: 'amount', header: 'Amount', render: (r) => formatKsh(r.amount ?? r.totalAmount) },
            {
              key: 'actions',
              header: 'Advance',
              render: (r) => (
                <button
                  onClick={() => void advance(r)}
                  disabled={busyRef === refOf(r)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  {busyRef === refOf(r) ? 'Updating…' : 'Advance →'}
                </button>
              ),
            },
          ]}
        />
      )}

      {detail || detailLoading ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={closeDetail}>
          <aside
            className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="text-base font-semibold">Booking detail</div>
                <div className="text-sm text-slate-500">{refOf(detail ?? {})}</div>
              </div>
              <Button variant="ghost" onClick={closeDetail}>
                Close
              </Button>
            </div>
            <div className="p-5">
              {detailLoading ? (
                <Spinner />
              ) : detailError ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {detailError}
                </div>
              ) : null}
              {detail ? (
                <dl className="divide-y divide-slate-100">
                  {(
                    [
                      ['Reference', refOf(detail)],
                      ['Status', statusOf(detail)],
                      ['Client', asStr(detail, 'client') !== '—' ? asStr(detail, 'client') : asStr(detail, 'clientName')],
                      ['Service', asStr(detail, 'service') !== '—' ? asStr(detail, 'service') : asStr(detail, 'serviceType')],
                      ['Date', formatDate(detail.date ?? detail.scheduledAt ?? detail.startDate)],
                      ['Amount', formatKsh(detail.amount ?? detail.totalAmount)],
                      ['Notes', asStr(detail, 'notes')],
                      ['Created', formatDateTime(detail.createdAt)],
                    ] as [string, string][]
                  ).map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-4 py-3">
                      <dt className="text-sm text-slate-500">{label}</dt>
                      <dd className="text-right text-sm font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {detail ? (
                <div className="mt-6">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Update status</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0875FF]"
                    value={String(detail.status ?? '')}
                    disabled={busyRef === refOf(detail)}
                    onChange={(e) => {
                      const row = rows.find((r) => asStr(r, 'reference') === refOf(detail));
                      if (row) void setStatus(row, e.target.value);
                    }}
                  >
                    {STATUS_FLOW.concat(['cancelled']).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

export default BookingsManagement;