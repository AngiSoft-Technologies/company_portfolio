import { Router, raw } from 'express';
import type { Db } from '../../../db';
import { recordProviderEvent } from '../../../shared/services/providerEvents';
import { logAudit } from '../../../shared/services/audit';
import { normalizeProvider } from '../services/capabilityMatrix';
import { verifyWebhook } from '../services/providers';
import { errorStatus } from './helpers';

// Importing the processor registers FINANCE handlers with the central worker.
import '../services/eventProcessor';
export { processProviderEvent } from '../services/eventProcessor';

const ALLOWED = new Set(['PESAFLOW', 'PAYPAL', 'PAYHERO', 'MPESA', 'GENERIC']);

/** Never persist raw credentials or signature material in ProviderEvent.headers. */
export function safeWebhookHeaders(headers: Record<string, any>): Record<string, string> {
  const safe: Record<string, string> = {};
  const interesting = [
    'paypal-auth-algo', 'paypal-cert-url', 'paypal-transmission-id', 'paypal-transmission-time',
    'x-pesaflow-signature', 'x-signature', 'x-callback-token', 'x-payhero-token', 'token',
    'content-type', 'x-request-id', 'x-event-id',
  ];
  for (const key of interesting) {
    const value = headers?.[key];
    if (value === undefined) continue;
    safe[key] = /token|signature|secret|password/i.test(key) ? '***' : String(value).slice(0, 500);
  }
  return safe;
}

export default function financeWebhooksRouter(prisma: Db) {
  const router = Router();

  /** Provider webhook inbox: verify → dedupe/record → enqueue processing. */
  router.post('/:provider', raw({ type: '*/*' }), async (req: any, res) => {
    const provider = normalizeProvider(req.params.provider);
    if (!ALLOWED.has(provider)) return res.status(404).json({ error: 'Unknown finance webhook provider' });
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));

    let payload: any = {};
    try { payload = JSON.parse(rawBody.toString('utf8') || '{}'); } catch { payload = { raw: rawBody.toString('utf8') }; }

    let signatureValid = false;
    try {
      // GENERIC is intentionally fail-closed in production (no verifier).
      signatureValid = provider === 'GENERIC'
        ? process.env.NODE_ENV !== 'production'
        // Only HTTP headers are signature material. Query params are routing
        // data and must never be merged into the verifier's header bag.
        : await verifyWebhook(provider, rawBody, req.headers as Record<string, any>);
    } catch (err: any) {
      return res.status(errorStatus(err)).json({ error: String(err?.message || 'Webhook verification failed').slice(0, 500) });
    }
    if (!signatureValid) {
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    const externalEventId = String(
      payload?.id || payload?.eventId || payload?.resource?.id || payload?.data?.id
      || payload?.Body?.stkCallback?.CheckoutRequestID || '',
    );
    const event = await recordProviderEvent(prisma, {
      provider,
      domain: 'FINANCE',
      externalEventId: externalEventId || null,
      eventType: String(payload?.event_type || payload?.event || payload?.type || `${provider.toLowerCase()}.webhook`),
      signatureValid,
      payload,
      headers: safeWebhookHeaders(req.headers as Record<string, any>) as any,
      status: 'RECEIVED',
    });
    await logAudit({
      action: 'finance.webhook.received', entity: 'ProviderEvent', entityId: event.event.id,
      meta: { provider, externalEventId: externalEventId || null, deduped: event.deduped },
    }).catch(() => undefined);
    return res.status(event.deduped ? 200 : 202).json({ received: true, deduped: event.deduped });
  });

  return router;
}
