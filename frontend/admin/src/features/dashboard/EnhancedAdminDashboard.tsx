import { useEffect, useState } from 'react';
import { Card, EmptyState, PageHeader, Spinner } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { deepGet, toArr, toNum, type Rec } from '@/lib/records';
import { asStr, formatKsh, formatDate } from '@/lib/format';

interface Kpi {
  label: string;
  key: string;
  value: string;
}

interface PanelItem {
  id: string;
  title: string;
  subtitle: string;
}

export function EnhancedAdminDashboard() {
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [bookings, setBookings] = useState<PanelItem[]>([]);
  const [leads, setLeads] = useState<PanelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      let rec: Rec = {};
      try {
        const json = await apiFetch('/api/admin/dashboard/overview');
        rec = (json ?? {}) as Rec;
      } catch {
        try {
          const fallback = await apiFetch('/api/admin/staff-dashboard');
          rec = (fallback ?? {}) as Rec;
        } catch (e) {
          if (!cancelled) {
            setError((e as Error).message || 'Failed to load dashboard');
            setLoading(false);
          }
          return;
        }
      }

      const kpiDefs: { label: string; keys: string[] }[] = [
        { label: 'Total Bookings', keys: ['totalBookings', 'total_bookings', 'bookingCount', 'bookings'] },
        { label: 'Total Leads', keys: ['totalLeads', 'total_leads', 'leadCount', 'leads'] },
        { label: 'Active Projects', keys: ['totalProjects', 'total_projects', 'projectCount', 'projects'] },
        { label: 'Revenue (KSh)', keys: ['revenue', 'totalRevenue', 'revenueTotal', 'paymentsTotal', 'totalPayments'] },
      ];

      const computed = kpiDefs.map((def) => {
        const raw = deepGet(rec, def.keys);
        let value = '—';
        if (Array.isArray(raw)) value = raw.length.toLocaleString('en-US');
        else if (toNum(raw) !== null) {
          value = def.label.includes('Revenue') ? formatKsh(raw) : toNum(raw)!.toLocaleString('en-US');
        }
        return { label: def.label, key: def.keys[0], value };
      });
      setKpis(computed);

      let bookingRows = toArr(deepGet(rec, ['recentBookings', 'recent_bookings']));
      if (bookingRows.length === 0) bookingRows = toArr(deepGet(rec, ['bookings'])).slice(0, 6);
      let leadRows = toArr(deepGet(rec, ['recentLeads', 'recent_leads']));
      if (leadRows.length === 0) leadRows = toArr(deepGet(rec, ['leads'])).slice(0, 6);

      const bookingItems = bookingRows.slice(0, 6).map((r, i) => ({
        id: String(r.id ?? r.reference ?? i),
        title: asStr(r, 'reference') !== '—' ? asStr(r, 'reference') : asStr(r, 'client') !== '—' ? asStr(r, 'client') : 'Booking',
        subtitle: `${asStr(r, 'client')} · ${formatDate(r.date ?? r.createdAt)}`,
      }));
      const leadItems = leadRows.slice(0, 6).map((r, i) => ({
        id: String(r.id ?? i),
        title: asStr(r, 'name') !== '—' ? asStr(r, 'name') : asStr(r, 'fullName'),
        subtitle: `${asStr(r, 'email')}${asStr(r, 'source') !== '—' ? ` · ${asStr(r, 'source')}` : ''}`,
      }));

      if (!cancelled) {
        setBookings(bookingItems);
        setLeads(leadItems);
        setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="High-level overview of bookings, leads, projects and revenue." />
      {loading ? <Spinner /> : null}
      {!loading && error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.key}>
            <div className="text-sm text-slate-500">{k.label}</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight">{k.value}</div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-base font-semibold">Recent bookings</h2>
          {bookings.length === 0 ? (
            <EmptyState title="No recent bookings" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-2.5">
                  <span className="font-medium">{b.title}</span>
                  <span className="text-sm text-slate-500">{b.subtitle}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-4 text-base font-semibold">Recent leads</h2>
          {leads.length === 0 ? (
            <EmptyState title="No recent leads" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {leads.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2.5">
                  <span className="font-medium">{l.title}</span>
                  <span className="text-sm text-slate-500">{l.subtitle}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export default EnhancedAdminDashboard;