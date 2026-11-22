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

interface IntegrationEndpoint {
  provider: string;
  domain: string;
  purpose: string;
  method: 'GET' | 'POST';
  path: string;
  authModel: string;
  configKeys: string[];
  tokenized: boolean;
  legacy?: boolean;
  notes?: string;
}

interface IntegrationEndpointsPayload {
  apiOrigin: string;
  siteOrigin: string | null;
  note: string;
  endpoints: IntegrationEndpoint[];
}

/** Read-only catalogue of the canonical /v1 URLs to register in provider dashboards. */
function IntegrationEndpoints() {
  const [data, setData] = useState<IntegrationEndpointsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!show) return;
    let active = true;
    apiFetch('/v1/admin/webhook-inbox/endpoints')
      .then((json) => { if (active) setData(json as IntegrationEndpointsPayload); })
      .catch((e) => { if (active) setError((e as Error).message || 'Failed to load integration endpoints'); });
    return () => { active = false; };
  }, [show]);

  return (
    <Card className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Provider endpoint registry</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Canonical /v1 callback and return URLs to register in each provider dashboard. Read-only — no secret values are shown.
          </p>
        </div>
        <Button variant="outline" onClick={() => setShow((v) => !v)}>
          {show ? 'Hide' : 'Show endpoints'}
        </Button>
      </div>
      {show ? (
        <div className="mt-4">
          {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          {data ? (
            <>
              <div className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] p-3 text-xs">
                <div><span className="text-[var(--text-muted)]">API origin: </span><span className="font-mono">{data.apiOrigin}</span></div>
                {data.siteOrigin ? (
                  <div className="mt-1"><span className="text-[var(--text-muted)]">Site origin: </span><span className="font-mono">{data.siteOrigin}</span></div>
                ) : null}
                <p className="mt-2 text-[var(--text-muted)]">{data.note}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
                      <th className="py-2 pr-4">Provider</th>
                      <th className="py-2 pr-4">Method</th>
                      <th className="py-2 pr-4">Path</th>
                      <th className="py-2 pr-4">Verification</th>
                      <th className="py-2 pr-4">Config keys</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.endpoints.map((ep, i) => (
                      <tr key={`${ep.provider}-${ep.path}-${i}`} className="border-b border-[var(--border-light)] last:border-0 align-top">
                        <td className="py-2 pr-4 whitespace-nowrap">
                          <div className="font-medium">{ep.provider}</div>
                          <div className="text-xs text-[var(--text-muted)]">{ep.domain}</div>
                          {ep.legacy ? <div className="mt-1"><Badge tone="slate">legacy</Badge></div> : null}
                          {ep.tokenized ? <div className="mt-1"><Badge tone="amber">tokenized</Badge></div> : null}
                        </td>
                        <td className="py-2 pr-4 font-mono text-xs">{ep.method}</td>
                        <td className="py-2 pr-4 font-mono text-xs break-all">{ep.path}</td>
                        <td className="py-2 pr-4 text-xs">{ep.authModel}</td>
                        <td className="py-2 pr-4 text-xs">
                          {ep.configKeys.length ? ep.configKeys.map((k) => <div key={k} className="font-mono">{k}</div>) : <span className="text-[var(--text-muted)]">—</span>}
                          {ep.notes ? <div className="mt-1 max-w-xs text-[var(--text-muted)]">{ep.notes}</div> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
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

      <IntegrationEndpoints />

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
