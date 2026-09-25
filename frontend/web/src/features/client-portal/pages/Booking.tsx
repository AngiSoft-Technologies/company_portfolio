import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card } from '@angisoft/ui';
import { apiPost, safeGet } from '@angisoft/api-client';
import { useAsync } from '@/hooks/useAsync';

interface MetaService {
  id: string;
  title?: string;
  name?: string;
}

interface BookingMeta {
  services?: MetaService[];
}

interface BookingResponse {
  data?: { reference?: string; referenceNumber?: string };
  reference?: string;
  referenceNumber?: string;
  result?: { reference?: string };
}

const extractReference = (res: BookingResponse): string =>
  res.data?.reference ?? res.reference ?? res.data?.referenceNumber ?? res.referenceNumber ?? res.result?.reference ?? '';

export default function Booking() {
  const navigate = useNavigate();
  const meta = useAsync(async () => {
    const res = await safeGet<{ data?: BookingMeta }>('/bookings/meta');
    return res.ok ? (res.data?.data ?? undefined) : undefined;
  }, []);

  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedRef, setBookedRef] = useState<string | null>(null);

  useEffect(() => {
    if (meta.data?.services && meta.data.services.length > 0 && !serviceId) {
      setServiceId(meta.data.services[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.data]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!serviceId.trim()) {
      setError('Please select a service.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiPost<BookingResponse>('/bookings', {
        serviceId,
        date,
        time,
        phone,
        notes,
      });
      const ref = extractReference(res);
      if (ref) {
        setBookedRef(ref);
        setTimeout(() => navigate(`/portal/booking/${ref}`), 900);
      } else {
        setTimeout(() => navigate('/portal/booking/history'), 900);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (bookedRef) {
    return (
      <div className="flex justify-center pt-16">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-2xl text-emerald-400">
            ✓
          </div>
          <h1 className="mt-5 text-2xl font-bold text-[var(--text-primary)]">Booking confirmed</h1>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Your booking reference is <span className="font-semibold text-[#0875FF]">{bookedRef}</span>. We'll be in
            touch shortly.
          </p>
          <div className="mt-8">
            <Link to={`/portal/booking/${bookedRef}`}>
              <Button className="w-full">View booking progress</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const services = meta.data?.services ?? [];
  const inputClass =
    'h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#0875FF]';

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold text-[var(--text-primary)]">Book a service</h1>
      <p className="mt-2 text-[var(--text-muted)]">
        Choose a service and a preferred time — we'll confirm by SMS or email.
      </p>

      <Card className="mt-8 p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
            Service
            {services.length > 0 ? (
              <select
                required
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className={inputClass}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title ?? s.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                required
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                placeholder="Service id or name"
                className={inputClass}
              />
            )}
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
              Preferred date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
              Preferred time
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
            Phone
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+254 700 000 000"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
            Notes (optional)
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything we should know?"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#0875FF]"
            />
          </label>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button type="submit" disabled={submitting} className="mt-2">
            {submitting ? 'Booking…' : 'Book now'}
          </Button>
        </form>
      </Card>
    </div>
  );
}