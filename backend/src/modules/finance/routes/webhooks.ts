import { Router, raw } from 'express';
import type { Db } from '../../../db';
import { recordProviderEvent } from '../../../shared/services/providerEvents';
import { logAudit } from '../../../shared/services/audit';

export default function financeWebhooksRouter(prisma: Db) {
  const router = Router();

  // Generic capability-gated webhook endpoint for providers not yet fully wired.
  // It records ProviderEvent for audit/idempotency; production provider-specific signature validation must be added per adapter before enabling live.
  router.post('/:provider', raw({ type: '*/*' }), async (req: any, res) => {
    const provider = String(req.params.provider || '').toUpperCase();
    const allowed = new Set(['PESAFLOW', 'PAYPAL', 'GENERIC']);
    if (!allowed.has(provider)) return res.status(404).json({ error: 'Unknown finance webhook provider' });
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body || {});
    let payload: any = {};
    try { payload = JSON.parse(rawBody || '{}'); } catch { payload = { raw: rawBody }; }
    const externalEventId = String(payload?.id || payload?.eventId || payload?.resource?.id || payload?.data?.id || '');
    const event = await recordProviderEvent(prisma, {
      provider, domain: 'FINANCE', externalEventId: externalEventId || null,
      eventType: String(payload?.event_type || payload?.event || payload?.type || `${provider.toLowerCase()}.webhook`),
      signatureValid: false, payload, headers: req.headers as any, status: 'RECEIVED',
      error: 'Signature verification not configured for this provider adapter',
    }).catch((e: any) => ({ error: e?.message || 'failed' } as any));
    await logAudit({ action: 'finance.webhook.received', entity: 'ProviderEvent', entityId: (event as any)?.event?.id, meta: { provider, externalEventId: externalEventId || null } }).catch(() => {});
    // Fail closed in production until adapter verifies signature.
    if (process.env.NODE_ENV === 'production') return res.status(202).json({ received: true, verification: 'pending_adapter' });
    return res.status(200).json({ received: true, deduped: Boolean((event as any)?.deduped) });
  });

  return router;
}
