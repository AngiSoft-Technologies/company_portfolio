import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, EmptyState, PageHeader, Spinner } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { deepGet, toArr, toNum, type Rec } from '@/lib/records';
import { asStr, formatKsh, formatDate } from '@/lib/format';
import { useEffectiveAccess } from '@/lib/permissions';
import { DASHBOARD_ENDPOINTS } from './dashboardEndpoints';

interface KpiDef {
  label: string;
  keys: string[];
  /** Canonical registry key; never a role comparison. */
  permission: string;
  money?: boolean;
}

interface Kpi extends KpiDef {
  value: string;
}

interface PanelItem {
  id: string;
  title: string;
  subtitle: string;
}

/**
 * Stat cards are gated by effective permissions from the versioned §8 payload,
 * never by role comparisons. Every value still comes from the verified
 * `/v1/admin/dashboard/stats` mount; keys not yet returned by that endpoint
 * render a neutral dash until the backend adds them.
 */
const KPI_DEFS: KpiDef[] = [
  { label: 'Total Bookings', keys: ['totalBookings', 'total_bookings', 'bookingCount', 'bookings'], permission: 'bookings.view_all' },
  { label: 'Pending Bookings', keys: ['pendingBookings', 'pending_bookings'], permission: 'bookings.view_all' },
  { label: 'Total Services', keys: ['totalServices', 'total_services', 'services'], permission: 'services.view' },
  { label: 'Active Projects', keys: ['totalProjects', 'total_projects', 'projectCount', 'projects'], permission: 'projects.view' },
  { label: 'Total Staff', keys: ['totalStaff', 'total_staff', 'staff'], permission: 'staff.view' },
  { label: 'Total Clients', keys: ['totalClients', 'total_clients', 'clients'], permission: 'analytics.view' },
  { label: 'Total Leads', keys: ['totalLeads', 'total_leads', 'leadCount', 'leads'], permission: 'leads.view' },
  { label: 'Revenue (KSh)', keys: ['revenue', 'totalRevenue', 'revenueTotal', 'paymentsTotal', 'totalPayments'], permission: 'payments.view_all', money: true },
  { label: 'Enquiries', keys: ['totalEnquiries', 'enquiriesCount', 'enquiries'], permission: 'enquiries.view_all' },
  { label: 'Publications in review', keys: ['publicationsInReview', 'pendingPublications', 'reviewsInReview', 'publications'], permission: 'publications.review' },
  { label: 'Media files', keys: ['totalMedia', 'mediaCount', 'media', 'files'], permission: 'media.upload' },
];

export function EnhancedAdminDashboard() {
  const { access, loading: accessLoading, can } = useEffectiveAccess();
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [bookings, setBookings] = useState<PanelItem[]>([]);
  const [leads, setLeads] = useState<PanelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Each card is independently permission-gated from the versioned payload.
  // The stats endpoint is `requireAdmin`, so avoid calling it when the access
  // profile grants no dashboard permission at all.
  const visibleDefs = KPI_DEFS.filter((def) => can(def.permission));
  const visibleDefKey = visibleDefs.map((def) => def.permission).join('|');
  const showBookings = can('bookings.view_all');
  const showLeads = can('leads.view');

  useEffect(() => {
    if (accessLoading) return;
    if (access && visibleDefKey.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      let rec: Rec = {};
      try {
        const json = await apiFetch(DASHBOARD_ENDPOINTS.admin.stats);
        rec = (json ?? {}) as Rec;
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message || 'Failed to load dashboard');
          setLoading(false);
        }
        return;
      }

      const computed = KPI_DEFS.filter((def) => can(def.permission)).map((def) => {
        const raw = deepGet(rec, def.keys);
        let value = '—';
        if (Array.isArray(raw)) value = raw.length.toLocaleString('en-US');
        else if (toNum(raw) !== null) {
          value = def.money ? formatKsh(raw) : toNum(raw)!.toLocaleString('en-US');
        }
        return { ...def, value };
      });

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
        setKpis(computed);
        setBookings(bookingItems);
        setLeads(leadItems);
        setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [access, accessLoading, visibleDefKey, can]);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="High-level overview of bookings, leads, projects and revenue." />
      {loading || accessLoading ? <Spinner /> : null}
      {!loading && error ? (
        <div className="dashboard-inline-alert mb-6" role="status">{error}</div>
      ) : null}

      {!accessLoading && access && visibleDefs.length === 0 ? (
        <Card>
          <EmptyState title="No dashboard modules are enabled for your access profile" />
          <p className="text-center text-xs text-[var(--text-muted)]">
            Ask an administrator to grant permissions, or open your{' '}
            <Link to="/workspace" className="font-medium text-[var(--color-primary)] hover:underline">workspace</Link>.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k) => (
              <Card key={k.label}>
                <div className="text-sm text-[var(--text-muted)]">{k.label}</div>
                <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{k.value}</div>
              </Card>
            ))}
          </div>

          {showBookings || showLeads ? (
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {showBookings ? (
                <Card>
                  <h2 className="mb-4 text-base font-semibold">Recent bookings</h2>
                  {bookings.length === 0 ? (
                    <EmptyState title="No recent bookings" />
                  ) : (
                    <ul className="divide-y divide-[var(--border-light)]">
                      {bookings.map((b) => (
                        <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                          <span className="truncate font-medium">{b.title}</span>
                          <span className="shrink-0 text-sm text-[var(--text-muted)]">{b.subtitle}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              ) : null}
              {showLeads ? (
                <Card>
                  <h2 className="mb-4 text-base font-semibold">Recent leads</h2>
                  {leads.length === 0 ? (
                    <EmptyState title="No recent leads" />
                  ) : (
                    <ul className="divide-y divide-[var(--border-light)]">
                      {leads.map((l) => (
                        <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                          <span className="truncate font-medium">{l.title}</span>
                          <span className="shrink-0 text-sm text-[var(--text-muted)]">{l.subtitle}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default EnhancedAdminDashboard;
