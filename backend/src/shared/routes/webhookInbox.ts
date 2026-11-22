/**
 * Read-only webhook inbox (Phase 7 closeout).
 *
 * A single, cross-domain view of inbound provider events from both the
 * Communications (Meta/WhatsApp/Telegram/TikTok) and Finance
 * (PayPal/PayHero/Daraja) rails. This is an OBSERVABILITY surface only:
 *
 * - GET only. Nothing here can replay, retry, settle, refund or mutate an
 *   event or its upstream provider.
 * - Raw `headers` are NEVER returned (they carry signatures and tokens).
 * - Payload strings are redacted by key name and by value shape (emails,
 *   MSISDNs, credentialed URLs), so no signature, token or raw PII is echoed.
 * - Every view is audit-logged.
 *
 * Gated by `administration.audit` with a SUPER_ADMIN fallback because it spans
 * two HIGH-risk audit domains and exposes provider payload metadata.
 */
import { Router } from 'express';
import type { Db } from '../../db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireAccess } from '../middleware/roles';
import { logAudit } from '../services/audit';

/** Keys whose VALUES must never leave the server. */
const SENSITIVE_KEY = /token|secret|password|authorization|signature|api[-_]?key|apikey|x-api-key|passkey|credential|cookie|private[-_]?key/i;

/** Keys that carry raw personally-identifiable values. */
const PII_KEY = /email|e_mail|phone|msisdn|mobile_number|full[-_]?name|id[-_]?number|payer/i;

/** Redact PII-shaped substrings inside free-form string values. */
export function redactWebhookString(value: string): string {
  let out = String(value)
    // email addresses
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '••••')
    // Kenya MSISDNs / phone numbers (2547XXXXXXXX, 07XXXXXXXX, +254...)
    .replace(/(?:\+?254|0)7\d{8}\b/g, '••••');
  // URLs may carry tokens in query strings — keep only origin + path.
  out = out.replace(/https?:\/\/[^\s"'<>]+/gi, (url) => {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return '••••';
    }
  });
  return out;
}

/** Deeply redact a JSON payload for safe display. Never mutates the input. */
export function redactWebhookValue(value: unknown, depth = 0): unknown {
  if (value == null) return null;
  if (depth > 8) return '••••';
  if (Array.isArray(value)) return value.map((item) => redactWebhookValue(item, depth + 1));
  if (typeof value === 'string') return redactWebhookString(value);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(key) || PII_KEY.test(key)) {
        out[key] = '••••';
      } else {
        out[key] = redactWebhookValue(item, depth + 1);
      }
    }
    return out;
  }
  return value;
}

/** Project a stored ProviderEvent to a safe, read-only row. */
export function toSafeWebhookEvent(row: any) {
  return {
    id: row.id,
    connectionId: row.connectionId ?? null,
    provider: row.provider,
    domain: row.domain,
    eventType: row.eventType,
    externalEventId: row.externalEventId ? redactWebhookString(String(row.externalEventId)) : null,
    signatureValid: Boolean(row.signatureValid),
    status: row.status,
    dedupeKey: redactWebhookString(String(row.dedupeKey ?? '')),
    error: row.error ? redactWebhookString(String(row.error)) : null,
    payload: redactWebhookValue(row.payload),
    createdAt: row.createdAt,
    processedAt: row.processedAt ?? null,
    // `headers` is deliberately omitted — it carries signatures/tokens.
  };
}

export default function webhookInboxRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get(
    '/',
    requireAccess('administration.audit', ['SUPER_ADMIN']),
    async (req: AuthRequest, res) => {
      const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
      const domain = req.query.domain ? String(req.query.domain).toUpperCase() : null;
      const provider = req.query.provider ? String(req.query.provider).toUpperCase() : null;
      const status = req.query.status ? String(req.query.status).toUpperCase() : null;
      const eventType = req.query.eventType ? String(req.query.eventType) : null;

      const rows = await prisma.orm.public.ProviderEvent
        .orderBy((e: any) => e.createdAt.desc())
        .limit(limit * 3)
        .all()
        .then((all: any[]) => all, () => [] as any[]) as any[];

      const filtered = rows.filter((row) => {
        if (domain && String(row.domain ?? '').toUpperCase() !== domain) return false;
        if (provider && String(row.provider ?? '').toUpperCase() !== provider) return false;
        if (status && String(row.status ?? '').toUpperCase() !== status) return false;
        if (eventType && !String(row.eventType ?? '').toLowerCase().includes(eventType.toLowerCase())) return false;
        return true;
      });

      await logAudit({
        actorId: req.user?.sub,
        actorRole: req.user?.role as any,
        action: 'communications.webhook_inbox.view',
        entity: 'ProviderEvent',
        meta: { returned: Math.min(filtered.length, limit), domain, provider, status },
      });

      res.json({ events: filtered.slice(0, limit).map(toSafeWebhookEvent) });
    },
  );

  return router;
}
