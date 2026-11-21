import { useEffect, useState } from 'react';
import { Card, PageHeader, Spinner } from '@/components';
import { apiFetch } from '@/lib/adminApi';

interface ReportsOverview {
  pipeline?: {
    leadsByStage?: Record<string, number>;
    leadsByStatus?: Record<string, number>;
    opportunitiesByStage?: Record<string, number>;
    opportunityValueByCurrency?: Record<string, number>;
    newLast30d?: Record<string, number>;
  };
  delivery?: {
    projectsByStatus?: Record<string, number>;
    avgProgress?: number;
    deliveredLast30d?: number;
  };
  finance?: {
    invoicesByStatus?: Record<string, number>;
    invoicedByCurrency?: Record<string, number>;
    collectedByCurrency?: Record<string, number>;
    outstandingByCurrency?: Record<string, number>;
    paymentsByStatus?: Record<string, number>;
    paymentsByProvider?: Record<string, number>;
    paymentVolumeByCurrency?: Record<string, number>;
  };
  satisfaction?: {
    testimonialsByRating?: Record<string, number>;
    averageRating?: number | null;
    confirmedTestimonials?: number;
    pendingModeration?: number;
    ticketsByStatus?: Record<string, number>;
  };
  generatedAt?: string;
}

const money = (map?: Record<string, number>) =>
  Object.entries(map ?? {})
    .map(([cur, v]) => `${cur} ${Number(v).toLocaleString()}`)
    .join(' · ') || '—';

const Bar = ({ label, value, max }: { label: string; value: number; max: number }) => (
  <div className="mb-1.5">
    <div className="mb-0.5 flex justify-between text-xs">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-hover)]">
      <div
        className="h-full rounded-full bg-[var(--color-primary)]"
        style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }}
      />
    </div>
  </div>
);

const CountCard = ({ title, data }: { title: string; data?: Record<string, number> }) => {
  const entries = Object.entries(data ?? {}).sort((a, b) => b[1] - a[1]);
  const max = entries[0]?.[1] ?? 0;
  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">No data.</p>
      ) : (
        entries.map(([k, v]) => <Bar key={k} label={k.replaceAll('_', ' ')} value={v} max={max} />)
      )}
    </Card>
  );
};

const MoneyCard = ({ title, lines }: { title: string; lines: Array<[string, string]> }) => (
  <Card>
    <h3 className="mb-3 text-sm font-semibold">{title}</h3>
    <dl className="space-y-2">
      {lines.map(([label, value]) => (
        <div key={label} className="flex justify-between text-sm">
          <dt className="text-[var(--text-muted)]">{label}</dt>
          <dd className="font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  </Card>
);

export function ReportsAdmin() {
  const [data, setData] = useState<ReportsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const json = (await apiFetch('/api/admin/reports/overview')) as ReportsOverview;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError((e as Error).message || 'Failed to load reports');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const p = data?.pipeline;
  const d = data?.delivery;
  const f = data?.finance;
  const s = data?.satisfaction;

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle={data?.generatedAt ? `Cross-department overview · generated ${new Date(data.generatedAt).toLocaleString()}` : 'Pipeline, delivery, finance and satisfaction.'}
      />
      {loading ? <Spinner /> : null}
      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {!loading && data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 text-base font-semibold">Sales pipeline</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <CountCard title="Leads by stage" data={p?.leadsByStage} />
              <CountCard title="Opportunities by stage" data={p?.opportunitiesByStage} />
            </div>
            <div className="mt-4">
              <MoneyCard
                title="Open opportunity value"
                lines={Object.entries(p?.opportunityValueByCurrency ?? {}).map(([cur, v]) => [cur, Number(v).toLocaleString()])}
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {(['leads', 'opportunities', 'tickets'] as const).map((k) => (
                <Card key={k}>
                  <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">New {k} · 30d</p>
                  <p className="mt-1 text-2xl font-bold">{p?.newLast30d?.[k] ?? 0}</p>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold">Delivery</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <CountCard title="Client projects by status" data={d?.projectsByStatus} />
              <Card>
                <h3 className="mb-3 text-sm font-semibold">Delivery metrics</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <dt className="text-[var(--text-muted)]">Avg progress</dt>
                    <dd className="font-semibold">{d?.avgProgress ?? 0}%</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-[var(--text-muted)]">Delivered · 30d</dt>
                    <dd className="font-semibold">{d?.deliveredLast30d ?? 0}</dd>
                  </div>
                </dl>
              </Card>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold">Finance</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <CountCard title="Invoices by status" data={f?.invoicesByStatus} />
              <CountCard title="Payments by status" data={f?.paymentsByStatus} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <MoneyCard
                title="Invoice totals"
                lines={[
                  ['Invoiced', money(f?.invoicedByCurrency)],
                  ['Collected', money(f?.collectedByCurrency)],
                  ['Outstanding', money(f?.outstandingByCurrency)],
                ]}
              />
              <MoneyCard
                title="Succeeded payment volume"
                lines={Object.entries(f?.paymentVolumeByCurrency ?? {}).map(([cur, v]) => [cur, Number(v).toLocaleString()])}
              />
            </div>
            <div className="mt-4">
              <CountCard title="Payments by provider" data={f?.paymentsByProvider} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold">Satisfaction</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <h3 className="mb-3 text-sm font-semibold">Testimonials</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <dt className="text-[var(--text-muted)]">Average rating</dt>
                    <dd className="font-semibold">{s?.averageRating ?? '—'} / 5</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-[var(--text-muted)]">Confirmed</dt>
                    <dd className="font-semibold">{s?.confirmedTestimonials ?? 0}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-[var(--text-muted)]">Pending moderation</dt>
                    <dd className="font-semibold">{s?.pendingModeration ?? 0}</dd>
                  </div>
                </dl>
              </Card>
              <CountCard title="Support tickets by status" data={s?.ticketsByStatus} />
            </div>
            <div className="mt-4">
              <CountCard title="Ratings distribution" data={s?.testimonialsByRating} />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default ReportsAdmin;
