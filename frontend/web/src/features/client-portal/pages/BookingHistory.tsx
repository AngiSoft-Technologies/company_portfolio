import { Link } from 'react-router-dom';
import { Card } from '@angisoft/ui';
import { clientApiGet } from '@angisoft/api-client';
import { formatDate } from '@/lib/format';
import { useAsync } from '@/hooks/useAsync';

interface Booking {
  id: string;
  reference?: string | null;
  service?: string | { title?: string; name?: string } | null;
  date?: string | null;
  status?: string | null;
}

const serviceName = (service: Booking['service']): string => {
  if (typeof service === 'string') return service;
  if (service && typeof service.title === 'string') return service.title;
  if (service && typeof service.name === 'string') return service.name;
  return 'Service';
};

export default function BookingHistory() {
  const history = useAsync(async () => {
    try {
      const res = await clientApiGet<{ data?: Booking[] }>('/client-portal/bookings');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  }, []);

  const bookings = history.data ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold text-[var(--text-primary)]">Booking history</h1>
      <p className="mt-2 text-[var(--text-muted)]">All bookings associated with your account.</p>

      {history.loading ? (
        <div className="animate-spin h-8 w-8 border-4 border-[#0875FF] border-t-transparent rounded-full mx-auto my-20" />
      ) : null}
      {!history.loading && bookings.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] py-16 text-center text-sm text-[var(--text-muted)]">
          No bookings yet. Book your first service and it'll show up here.
        </div>
      ) : null}
      {!history.loading && bookings.length > 0 ? (
        <div className="mt-8 flex flex-col gap-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{serviceName(booking.service)}</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {booking.reference ?? '—'} · {formatDate(booking.date)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {booking.status ? (
                    <span className="rounded-full bg-[#0875FF]/10 px-3 py-1 text-xs font-medium text-[#0875FF]">
                      {booking.status}
                    </span>
                  ) : null}
                  {booking.reference ? (
                    <Link
                      to={`/portal/booking/${booking.reference}`}
                      className="text-sm font-medium text-[#0875FF] hover:underline"
                    >
                      Track →
                    </Link>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}