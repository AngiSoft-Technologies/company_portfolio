import { Fragment, useCallback, useEffect, useState } from 'react';
import { Button, Card, EmptyState, Field, PageHeader, Spinner, inputClass } from '@/components';
import { Badge } from '@/lib/Badge';
import { apiFetch } from '@/lib/adminApi';

/**
 * Read-only, cross-domain webhook inbox. Shows metadata and redacted payloads
 * for inbound provider events (Meta/WhatsApp/Telegram/TikTok + PayPal/PayHero/
 * Daraja). There are deliberately no replay/retry/refund actions here — the
 * server exposes GET only and redacts all sensitive values before sending.
 */
interface WebhookEvent {
  id: string;
  connectionId: string | null;
  provider: string;
  domain: string;
  eventType: string;
  externalEventId: string | null;
  signatureValid: boolean;
  status: string;
  dedupeKey: string;
  error: string | null;
  payload: unknown;
  createdAt: string;
  processedAt: string | null;
}

const PAGE_SIZE = 100;

function statusTone(status: string): string {
  const s = String(status).toUpperCase();
  if (s === 'PROCESSED' || s === 'COMPLETED') return 'green';
  if (s === 'FAILED') return 'red';
  if (s === 'IGNORED') return 'slate';
  return 'amber';
}

export function WebhookInbox() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [domain, setDomain] = useState('');
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState('');
  const [eventType, setEventType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (domain) params.set('domain', domain);
      if (provider.trim()) params.set('provider', provider.trim());
      if (status) params.set('status', status);
      if (eventType.trim()) params.set('eventType', eventType.trim());
      const json = (await apiFetch(`/v1/admin/webhook-inbox?${params}`)) as { events: WebhookEvent[] };
      setEvents(json.events ?? []);
    } catch (e) {
      setError((e as Error).message || 'Failed to load webhook events');
    } finally {
      setLoading(false);
    }
  }, [domain, provider, status, eventType]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader
        title="Webhook Inbox"
        subtitle="Read-only inbound provider events across communications and finance. Sensitive values are redacted."
      />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-5">
          <Field label="Domain">
            <select value={domain} onChange={(e) => setDomain(e.target.value)} className={inputClass}>
              <option value="">All</option>
              <option value="COMMUNICATIONS">Communications</option>
              <option value="FINANCE">Finance</option>
            </select>
          </Field>
          <Field label="Provider">
            <input
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="e.g. META, PAYPAL"
              className={inputClass}
            />
          </Field>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              <option value="">All</option>
              <option value="RECEIVED">Received</option>
              <option value="PROCESSED">Processed</option>
              <option value="FAILED">Failed</option>
              <option value="IGNORED">Ignored</option>
            </select>
          </Field>
          <Field label="Event type">
            <input
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="e.g. CAPTURE"
              className={inputClass}
            />
          </Field>
          <div className="flex items-end gap-2">
            <Button onClick={() => void load()}>Filter</Button>
            <Button
              variant="outline"
              onClick={() => {
                setDomain('');
                setProvider('');
                setStatus('');
                setEventType('');
                void load();
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {loading ? <Spinner /> : null}

      {!loading && events.length === 0 ? (
        <EmptyState title="No provider events match these filters" />
      ) : null}

      {!loading && events.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Provider</th>
                  <th className="py-2 pr-4">Event type</th>
                  <th className="py-2 pr-4">Signature</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Payload</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <Fragment key={event.id}>
                    <tr className="border-b border-[var(--border-light)] last:border-0">
                      <td className="whitespace-nowrap py-2 pr-4 text-xs text-[var(--text-muted)]">
                        {event.createdAt ? new Date(event.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="font-medium">{event.provider}</div>
                        <div className="text-xs text-[var(--text-muted)]">{event.domain}</div>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">{event.eventType}</td>
                      <td className="py-2 pr-4">
                        <Badge tone={event.signatureValid ? 'green' : 'amber'}>
                          {event.signatureValid ? 'valid' : 'unverified'}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge tone={statusTone(event.status)}>{event.status}</Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Button
                          variant="ghost"
                          onClick={() => setExpanded(expanded === event.id ? null : event.id)}
                        >
                          {expanded === event.id ? 'Hide' : 'View'}
                        </Button>
                      </td>
                    </tr>
                    {expanded === event.id ? (
                      <tr className="border-b border-[var(--border-light)]">
                        <td colSpan={6} className="bg-[var(--bg-subtle)] py-3 pr-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <div className="mb-1 text-xs font-semibold uppercase text-[var(--text-muted)]">Redacted payload</div>
                              <pre className="max-h-64 overflow-auto rounded-lg bg-[var(--bg)] p-3 text-xs">
                                {JSON.stringify(event.payload, null, 2)}
                              </pre>
                            </div>
                            <div className="space-y-2 text-xs">
                              <div><span className="text-[var(--text-muted)]">Event ID: </span><span className="font-mono">{event.externalEventId ?? '—'}</span></div>
                              <div><span className="text-[var(--text-muted)]">Dedupe key: </span><span className="font-mono">{event.dedupeKey}</span></div>
                              <div><span className="text-[var(--text-muted)]">Connection: </span><span className="font-mono">{event.connectionId ?? '—'}</span></div>
                              <div><span className="text-[var(--text-muted)]">Processed: </span>{event.processedAt ? new Date(event.processedAt).toLocaleString() : '—'}</div>
                              {event.error ? (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-800">{event.error}</div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

export default WebhookInbox;
