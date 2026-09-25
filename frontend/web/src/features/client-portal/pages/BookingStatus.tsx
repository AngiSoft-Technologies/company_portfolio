import { useState, type FormEvent } from 'react';
import { Button, Card } from '@angisoft/ui';
import { safeGet } from '@angisoft/api-client';

interface StatusPayload {
  reference?: string;
  status?: string;
  service?: string | { title?: string; name?: string };
  date?: string;
  time?: string;
}

const serviceName = (service: StatusPayload['service']): string => {
  if (typeof service === 'string') return service;
  if (service && typeof service.title === 'string') return service.title;
  if (service && typeof service.name === 'string') return service.name;
  return 'Service';
};

export default function BookingStatus() {
  const [ref, setRef] = useState('');
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ref.trim()) return;
    setChecking(true);
    setError(null);
    setStatus(null);
    const res = await safeGet<{ data?: StatusPayload } | StatusPayload>(`/bookings/status/${encodeURIComponent(ref.trim())}`);
    setChecking(false);
    if (res.ok && res.data) {
      const payload = (res.data as { data?: StatusPayload }).data ?? (res.data as StatusPayload);
      setStatus(payload);
    } else {
      setError(res.error ?? 'Could not find a booking with that reference.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold text-[var(--text-primary)]">Booking status</h1>
      <p className="mt-2 text-[var(--text-muted)]">Enter your booking reference to see its current status.</p>

      <Card className="mt-8 p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
            Booking reference
            <input
              required
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="e.g. ANG-7F3K2Q"
              className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#0875FF]"
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button type="submit" disabled={checking} className="w-fit">
            {checking ? 'Checking…' : 'Check status'}
          </Button>
        </form>

        {status ? (
          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-hover)] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {serviceName(status.service)}
                </h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {status.reference ?? ref} · {status.date ?? '—'}
                  {status.time ? ` · ${status.time}` : ''}
                </p>
              </div>
              {status.status ? (
                <span className="rounded-full bg-[#0875FF]/10 px-4 py-1.5 text-sm font-semibold text-[#0875FF]">
                  {status.status}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}