import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, EmptyState, PageHeader, Spinner } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { toArr, type Rec } from '@/lib/records';
import { asStr, formatDate } from '@/lib/format';

export function StaffDashboard() {
  const [work, setWork] = useState<Rec[]>([]);
  const [schedule, setSchedule] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // The staff-dashboard router has no aggregate root route; it exposes
        // per-resource endpoints the dashboard assembles. Each slice loads
        // independently so one failing call cannot blank the whole page.
        const loadSlice = async (endpoint: string): Promise<Rec[]> => {
          try {
            return toArr(await apiFetch(endpoint));
          } catch {
            return [];
          }
        };

        const [projects, bookings, posts, leads] = await Promise.all([
          loadSlice('/api/staff-dashboard/projects'),
          loadSlice('/api/staff-dashboard/bookings'),
          loadSlice('/api/staff-dashboard/posts'),
          loadSlice('/api/leads'),
        ]);

        if (!cancelled) {
          setWork([...projects, ...leads, ...posts]);
          setSchedule(bookings);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message || 'Failed to load staff dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const workTitle = (r: Rec) =>
    asStr(r, 'title') !== '—'
      ? asStr(r, 'title')
      : asStr(r, 'projectName') !== '—'
        ? asStr(r, 'projectName')
        : asStr(r, 'client') !== '—'
          ? `Client: ${asStr(r, 'client')}`
          : asStr(r, 'name') !== '—'
            ? asStr(r, 'name')
            : 'Assigned item';

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

      {loading ? <Spinner /> : null}
      {!loading && error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-base font-semibold">My Assigned Work</h2>
          {work.length === 0 ? (
            <EmptyState title="Nothing assigned to you yet" />
          ) : (
            <ul className="divide-y divide-[var(--border-light)]">
              {work.map((r, i) => (
                <li key={String(r.id ?? i)} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="font-medium">{workTitle(r)}</div>
                    <div className="text-sm text-[var(--text-muted)]">
                      {asStr(r, 'status') !== '—' ? asStr(r, 'status') : ''}
                      {asStr(r, 'client') !== '—' ? ` · ${asStr(r, 'client')}` : ''}
                    </div>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {asStr(r, 'dueDate') !== '—' ? formatDate(r.dueDate) : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold">My Schedule / Bookings</h2>
          {schedule.length === 0 ? (
            <EmptyState title="No upcoming bookings" />
          ) : (
            <ul className="divide-y divide-[var(--border-light)]">
              {schedule.map((r, i) => (
                <li key={String(r.id ?? r.reference ?? i)} className="flex items-center justify-between py-2.5">
                  <span className="font-medium">
                    {asStr(r, 'reference') !== '—' ? asStr(r, 'reference') : asStr(r, 'client')}
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">
                    {formatDate(r.date ?? r.scheduledAt ?? r.startDate ?? r.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export default StaffDashboard;