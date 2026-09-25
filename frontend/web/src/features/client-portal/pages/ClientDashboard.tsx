import { Link } from 'react-router-dom';
import { Card } from '@angisoft/ui';
import { clientApiGet } from '@angisoft/api-client';
import { useAsync } from '@/hooks/useAsync';

interface PortalBooking {
  id: string;
  reference?: string | null;
  service?: string | { title?: string; name?: string } | null;
  date?: string | null;
  status?: string | null;
}

interface DashboardPayload {
  client?: { name?: string; email?: string };
  stats?: { label?: string; value?: string | number }[];
  projects?: { id: string; title?: string; status?: string | null }[];
  bookings?: PortalBooking[];
}

const serviceName = (service: PortalBooking['service']): string => {
  if (typeof service === 'string') return service;
  if (service && typeof service.title === 'string') return service.title;
  if (service && typeof service.name === 'string') return service.name;
  return 'Service';
};

export default function ClientDashboard() {
  const dashboard = useAsync(async () => {
    try {
      const res = await clientApiGet<{ data?: DashboardPayload }>('/client-portal/dashboard');
      return (res.data ?? undefined) as DashboardPayload | undefined;
    } catch {
      return undefined;
    }
  }, []);

  const payload = dashboard.data;
  const stats = Array.isArray(payload?.stats) ? payload.stats : [];
  const projects = Array.isArray(payload?.projects) ? payload.projects : [];
  const bookings = Array.isArray(payload?.bookings) ? payload.bookings : [];
  const clientName = payload?.client?.name || 'there';

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Welcome back, {clientName}</h1>
        <p className="mt-2 text-[var(--text-muted)]">Here's what's happening with your projects and bookings.</p>
      </div>

      {dashboard.loading ? (
        <div className="animate-spin h-8 w-8 border-4 border-[#0875FF] border-t-transparent rounded-full mx-auto my-20" />
      ) : null}

      {!dashboard.loading && (!payload || (stats.length === 0 && projects.length === 0 && bookings.length === 0)) ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] py-16 text-center text-sm text-[var(--text-muted)]">
          Your dashboard overview will appear here once you have activity.
        </div>
      ) : null}

      {!dashboard.loading && stats.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Card key={i} className="p-6">
              <div className="text-3xl font-extrabold text-[#0875FF]">{stat.value}</div>
              <div className="mt-1 text-sm font-medium text-[var(--text-muted)]">{stat.label}</div>
            </Card>
          ))}
        </div>
      ) : null}

      {!dashboard.loading && projects.length > 0 ? (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-[var(--text-primary)]">Your projects</h2>
          <div className="flex flex-col gap-4">
            {projects.map((project) => (
              <Link key={project.id} to={`/portal/projects/${project.id}`}>
                <Card hoverable className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-[var(--text-primary)]">{project.title ?? 'Untitled project'}</h3>
                    {project.status ? (
                      <span className="rounded-full bg-[#0875FF]/10 px-3 py-1 text-xs font-medium text-[#0875FF]">
                        {project.status}
                      </span>
                    ) : null}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {!dashboard.loading && bookings.length > 0 ? (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-[var(--text-primary)]">Recent bookings</h2>
          <div className="flex flex-col gap-4">
            {bookings.map((booking) => (
              <Card key={booking.id} className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">{serviceName(booking.service)}</h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {booking.reference ?? '—'} · {booking.date ?? '—'}
                    </p>
                  </div>
                  {booking.status ? (
                    <span className="rounded-full bg-[#0875FF]/10 px-3 py-1 text-xs font-medium text-[#0875FF]">
                      {booking.status}
                    </span>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
          <Link to="/portal/booking/history" className="mt-4 inline-block text-sm font-medium text-[#0875FF] hover:underline">
            View all bookings →
          </Link>
        </div>
      ) : null}
    </div>
  );
}