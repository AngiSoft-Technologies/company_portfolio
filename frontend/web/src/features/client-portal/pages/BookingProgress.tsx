import { Link, useParams } from 'react-router-dom';
import { Button, Card } from '@angisoft/ui';
import { safeGet } from '@angisoft/api-client';
import { formatDateTime } from '@/lib/format';
import { useAsync } from '@/hooks/useAsync';

interface EventItem {
  id?: string;
  type?: string;
  title?: string;
  message?: string;
  status?: string;
  createdAt?: string | null;
}

interface ProgressPayload {
  reference?: string;
  status?: string;
  service?: string | { title?: string; name?: string };
  date?: string;
  events?: EventItem[];
}

const serviceName = (service: ProgressPayload['service']): string => {
  if (typeof service === 'string') return service;
  if (service && typeof service.title === 'string') return service.title;
  if (service && typeof service.name === 'string') return service.name;
  return 'Booking';
};

export default function BookingProgress() {
  const { ref = '' } = useParams<{ ref: string }>();
  const progress = useAsync(async () => {
    const res = await safeGet<{ data?: ProgressPayload } | ProgressPayload>(`/bookings/${encodeURIComponent(ref)}`);
    if (!res.ok || !res.data) return null;
    const payload = (res.data as { data?: ProgressPayload }).data ?? (res.data as ProgressPayload);
    return payload;
  }, [ref]);

  if (progress.loading) {
    return <div className="animate-spin h-8 w-8 border-4 border-[#0875FF] border-t-transparent rounded-full mx-auto my-20" />;
  }

  if (progress.error || !progress.data) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="text-6xl font-black text-[var(--border)]">404</div>
        <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">Booking not found</h1>
        <p className="mt-3 text-[var(--text-muted)]">No booking matches that reference.</p>
        <div className="mt-8 flex justify-center gap-4">
          <Link to="/booking/lookup">
            <Button variant="outline">Try another reference</Button>
          </Link>
          <Link to="/contact">
            <Button>Contact us</Button>
          </Link>
        </div>
      </div>
    );
  }

  const p = progress.data;
  const events = Array.isArray(p.events) ? p.events : [];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold text-[var(--text-primary)]">Booking progress</h1>
      <p className="mt-2 text-[var(--text-muted)]">
        {serviceName(p.service)} · {p.reference ?? ref} · {p.date ?? '—'}
      </p>

      {p.status ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0875FF]/10 text-[#0875FF]">
            {(p.status ?? '').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Current status</div>
            <div className="font-semibold text-[var(--text-primary)]">{p.status}</div>
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] py-12 text-center text-sm text-[var(--text-muted)]">
            Status updates will appear here as your booking progresses.
          </div>
        ) : (
          <ol className="relative flex flex-col gap-8 border-l border-[var(--border)] pl-8">
            {events.map((event, i) => (
              <li key={event.id ?? i} className="relative">
                <span
                  className={`absolute -left-[41px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-[var(--bg-primary)] ${
                    i === 0 ? 'bg-[#0875FF]' : 'bg-[var(--text-muted)]'
                  }`}
                >
                  {i === 0 ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                </span>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  {event.title ?? event.status ?? event.type ?? 'Update'}
                </div>
                {event.message ? (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{event.message}</p>
                ) : null}
                {event.createdAt ? (
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{formatDateTime(event.createdAt)}</div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}