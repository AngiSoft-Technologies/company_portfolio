import { Button, EmptyState, PageHeader, Spinner, Table, useCrud, type CrudConfig } from '@/components';
import { formatDate, formatKsh } from '@/lib/format';
import { Badge } from '@/lib/Badge';

export interface PaymentRow {
  id: string;
  bookingRef?: string;
  amount?: number;
  method?: string;
  status?: string;
  createdAt?: string;
}

export function PaymentsAdmin() {
  const { rows, loading, error, refresh } = useCrud<PaymentRow, CrudConfig<PaymentRow>>({
    endpoint: '/payments',
    transform: (data: unknown) => {
      const list = Array.isArray(data)
        ? data
        : (data as Record<string, unknown>)?.data ?? (data as Record<string, unknown>)?.items ?? [];
      return (Array.isArray(list) ? list : []).map((r) => {
        const rec = r as Record<string, unknown>;
        return {
          id: String(rec.id ?? ''),
          bookingRef: rec.bookingRef ? String(rec.bookingRef) : rec.reference ? String(rec.reference) : undefined,
          amount: typeof rec.amount === 'number' ? rec.amount : Number(rec.amount ?? 0),
          method: rec.method ? String(rec.method) : rec.paymentMethod ? String(rec.paymentMethod) : undefined,
          status: rec.status ? String(rec.status) : undefined,
          createdAt: rec.createdAt ? String(rec.createdAt) : undefined,
        } as PaymentRow;
      });
    },
  });

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="All payment records (read-only)."
        actions={
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
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
          <EmptyState title="No payments" />
        </div>
      ) : (
        <Table<PaymentRow>
          rows={rows}
          columns={[
            { key: 'bookingRef', header: 'Booking Ref', render: (r) => <span className="font-medium">{r.bookingRef ?? '—'}</span> },
            { key: 'amount', header: 'Amount', render: (r) => formatKsh(r.amount) },
            { key: 'method', header: 'Method', render: (r) => r.method ?? '—' },
            { key: 'status', header: 'Status', render: (r) => <Badge>{r.status ?? '—'}</Badge> },
            { key: 'createdAt', header: 'Date', render: (r) => formatDate(r.createdAt) },
          ]}
        />
      )}
    </div>
  );
}

export default PaymentsAdmin;