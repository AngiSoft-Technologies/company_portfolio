import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, EmptyState, PageHeader, Spinner } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { deepGet, toArr, toNum, type Rec } from '@/lib/records';
import { asStr, formatDate } from '@/lib/format';
import { useEffectiveAccess } from '@/lib/permissions';
import { DASHBOARD_ENDPOINTS } from './dashboardEndpoints';
import { widgetCount, widgetMeta, WIDGET_META, type WidgetSlice } from './widgetCatalogue';

type SliceKey = WidgetSlice | 'adminStats';

interface Slices {
  projects: Rec[];
  bookings: Rec[];
  posts: Rec[];
  leads: Rec[];
  adminStats: Rec;
}

const EMPTY_SLICES: Slices = {
  projects: [],
  bookings: [],
  posts: [],
  leads: [],
  adminStats: {},
};

const ENDPOINT_BY_SLICE: Record<SliceKey, string> = {
  projects: DASHBOARD_ENDPOINTS.staff.projects,
  bookings: DASHBOARD_ENDPOINTS.staff.bookings,
  posts: DASHBOARD_ENDPOINTS.staff.posts,
  leads: DASHBOARD_ENDPOINTS.staff.leads,
  adminStats: DASHBOARD_ENDPOINTS.admin.stats,
};

/**
 * Staff dashboard generated from the versioned §8 effective-access payload.
 * The server owns widget visibility (`access.widgets`) and assignment counts;
 * no role comparisons are made here. A granted permission with zero assigned
 * records renders an explicit empty state with one clear next action.
 */
export function StaffDashboard() {
  const { access, loading: accessLoading, error: accessError, can, refresh } = useEffectiveAccess();
  const [slices, setSlices] = useState<Slices>(EMPTY_SLICES);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [loadedSliceKey, setLoadedSliceKey] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  const widgets = useMemo(() => access?.widgets ?? [], [access]);
  const counts = access?.assignmentCounts;

  // Only fetch slices that a granted widget actually needs. `adminStats` uses
  // the verified /v1/admin/dashboard/stats mount, never the stale overview URL.
  const sliceKey = useMemo(() => {
    const needed = new Set<SliceKey>();
    for (const id of widgets) {
      const meta = WIDGET_META[id];
      if (meta?.slice) needed.add(meta.slice);
      if (id === 'analytics' && can('analytics.view')) needed.add('adminStats');
    }
    return [...needed].sort().join(',');
  }, [widgets, can]);

  useEffect(() => {
    if (accessLoading || !access) return;

    const needed = sliceKey ? (sliceKey.split(',') as SliceKey[]) : [];
    if (needed.length === 0) {
      setDataLoading(false);
      setLoadedSliceKey(sliceKey);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setDataLoading(true);
      setDataError(null);
      const requests = needed.map((key) => [key, apiFetch(ENDPOINT_BY_SLICE[key])] as const);
      const results = await Promise.allSettled(requests.map(([, request]) => request));
      if (cancelled) return;

      const next: Slices = { ...EMPTY_SLICES };
      let failed = false;
      results.forEach((result, index) => {
        const key = requests[index][0];
        if (result.status === 'fulfilled') {
          if (key === 'adminStats') next.adminStats = (result.value ?? {}) as Rec;
          else next[key] = toArr(result.value);
        } else {
          failed = true;
        }
      });

      setSlices(next);
      setDataError(failed ? 'A few widgets did not refresh. You can try again.' : null);
      setDataLoading(false);
      setLoadedSliceKey(sliceKey);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [access, accessLoading, sliceKey, reloadToken]);

  const workTitle = (r: Rec) => {
    const candidates = ['title', 'projectName', 'client', 'name', 'subject'];
    for (const key of candidates) {
      const value = asStr(r, key);
      if (value !== '—') return key === 'client' ? `Client: ${value}` : value;
    }
    return 'Assigned item';
  };

  const renderRows = (items: Rec[]) => (
    <ul className="divide-y divide-[var(--border-light)]">
      {items.map((r, i) => (
        <li key={String(r.id ?? r.reference ?? i)} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <div className="truncate font-medium">{workTitle(r)}</div>
            <div className="truncate text-sm text-[var(--text-muted)]">
              {asStr(r, 'status') !== '—' ? asStr(r, 'status') : ''}
              {asStr(r, 'client') !== '—' ? ` · ${asStr(r, 'client')}` : ''}
            </div>
          </div>
          <span className="shrink-0 text-xs tabular-nums text-[var(--text-muted)]">
            {formatDate(r.dueDate ?? r.date ?? r.scheduledAt ?? r.startDate ?? r.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );

  const renderSummary = () => {
    const stat = slices.adminStats;
    const metrics = [
      { label: 'Bookings', value: toNum(deepGet(stat, ['totalBookings', 'bookings'])) },
      { label: 'Pending', value: toNum(deepGet(stat, ['pendingBookings'])) },
      { label: 'Projects', value: toNum(deepGet(stat, ['totalProjects', 'projects'])) },
    ];
    return (
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg bg-[var(--surface-hover)] p-2.5">
            <dt className="text-[11px] text-[var(--text-muted)]">{metric.label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">
              {metric.value === null ? '—' : metric.value.toLocaleString('en-US')}
            </dd>
          </div>
        ))}
      </dl>
    );
  };

  if (accessLoading || (dataLoading && loadedSliceKey !== sliceKey)) {
    return (
      <div>
        <PageHeader title="Staff Dashboard" subtitle="Your assigned work, schedule and next actions." />
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Staff Dashboard"
        subtitle="Your assigned work, schedule and next actions."
        actions={
          <>
            <Link to="/projects">
              <Button variant="outline">Projects</Button>
            </Link>
            <Link to="/bookings">
              <Button>Bookings</Button>
            </Link>
          </>
        }
      />

      {accessError ? (
        <div className="dashboard-inline-alert mb-4" role="status">
          <span>{accessError}</span>
          <Button variant="outline" onClick={() => void refresh()}>Retry</Button>
        </div>
      ) : null}
      {dataError ? (
        <div className="dashboard-inline-alert dashboard-inline-alert--warning mb-4" role="status">
          <span>{dataError}</span>
          <Button variant="outline" onClick={() => setReloadToken((token) => token + 1)}>Retry</Button>
        </div>
      ) : null}

      {!access ? (
        <Card>
          <EmptyState title="Your access profile could not be loaded" />
        </Card>
      ) : widgets.length === 0 ? (
        <Card>
          <EmptyState title="No modules are enabled for your access profile" />
          <p className="text-center text-xs text-[var(--text-muted)]">
            Ask an administrator to grant permissions on the Roles &amp; Permissions screen.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {widgets.map((id) => {
            const meta = widgetMeta(id);
            const count = widgetCount(id, counts);
            const isEmpty = count === 0;
            const items = meta.slice ? slices[meta.slice] : [];

            return (
              <Card key={id} className="flex flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">{meta.label}</h2>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{meta.help}</p>
                  </div>
                  {typeof count === 'number' ? (
                    <span className="rounded-full bg-[var(--surface-hover)] px-2 py-1 text-xs font-semibold tabular-nums">
                      {count}
                    </span>
                  ) : null}
                </div>

                {isEmpty ? (
                  <div className="mt-4">
                    <EmptyState title={`No ${meta.noun ?? 'records'} assigned yet`} />
                    <Link
                      to={meta.to}
                      className="block text-center text-xs font-medium text-[var(--color-primary)] hover:underline"
                    >
                      {meta.emptyCta ?? `Create first ${meta.noun ?? 'record'}`} →
                    </Link>
                  </div>
                ) : (
                  <>
                    {meta.slice ? (
                      items.length === 0 ? (
                        <EmptyState title="No items to show" />
                      ) : (
                        renderRows(items)
                      )
                    ) : null}
                    {meta.showsSummary ? renderSummary() : null}
                    <Link
                      to={meta.to}
                      className="mt-4 inline-block text-xs font-medium text-[var(--color-primary)] hover:underline"
                    >
                      {meta.cta} →
                    </Link>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default StaffDashboard;
