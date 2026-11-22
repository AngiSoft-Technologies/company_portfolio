import express, { Router } from 'express';
import type { Db } from '../../../db';
import { recordProviderEvent } from '../../../shared/services/providerEvents';
import { decryptSecret } from '../../../shared/services/secrets';
import { getConfig } from '../../../shared/services/runtimeConfig';
import { getQueue } from '../../../queue';
import { verifyMetaSignature } from '../services/whatsappCloud';
import { verifyMetaVerifyToken } from '../services/metaSocial';
import { verifyTelegramWebhook } from '../services/telegram';
import { processProviderEvent } from '../services/eventProcessor';
import { ProviderCapabilityError } from '../services/capabilities';

export { processProviderEvent } from '../services/eventProcessor';

const WEBHOOK_QUEUE = 'communications-webhooks';

async function getConnectionSecret(prisma: Db, connectionId: string, kind: string) {
  const row = await prisma.orm.public.ProviderSecret.where({ connectionId, kind } as any)
    .orderBy((s: any) => s.createdAt.desc()).first().catch(() => null) as any;
  if (!row) return null;
  return decryptSecret({ ciphertext: row.ciphertext, iv: row.iv, authTag: row.authTag, keyVersion: Number(row.keyVersion || 1) });
}

function devAllowsUnsigned(flag: string): boolean {
  return process.env.NODE_ENV !== 'production' && getConfig(flag) === 'true';
}

function externalEventIdOf(payload: any): string | null {
  const id = payload?.entry?.[0]?.id ?? payload?.update_id ?? payload?.event_id ?? payload?.events?.[0]?.event_id;
  return id ? String(id) : null;
}

export default function communicationsWebhooksRouter(prisma: Db) {
  const router = Router();

  /** Meta/WhatsApp webhook verification handshake. */
  router.get('/whatsapp', async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = String(req.query['hub.verify_token'] || '');
    const challenge = req.query['hub.challenge'];
    const expected = getConfig('WHATSAPP_VERIFY_TOKEN');
    if (mode === 'subscribe' && expected && token === expected) {
      return res.status(200).send(String(challenge ?? ''));
    }
    const connections = await prisma.orm.public.ProviderConnection
      .where({ domain: 'COMMUNICATIONS', provider: 'WHATSAPP_META' } as any).all().then((rows: any[]) => rows, () => [] as any[]) as any[];
    for (const connection of connections) {
      const dbVerify = await getConnectionSecret(prisma, connection.id, 'WEBHOOK_SECRET').catch(() => null);
      if (mode === 'subscribe' && dbVerify && token === dbVerify) return res.status(200).send(String(challenge ?? ''));
    }
    return res.sendStatus(403);
  });

  /** Facebook/Instagram webhook verification handshake. */
  router.get('/meta', async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = String(req.query['hub.verify_token'] || '');
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && verifyMetaVerifyToken(token)) {
      return res.status(200).send(String(challenge ?? ''));
    }
    const connections = await prisma.orm.public.ProviderConnection
      .where((c: any) => c.domain.eq('COMMUNICATIONS'))
      .where((c: any) => c.provider.in(['META_FACEBOOK', 'META_INSTAGRAM']))
      .all().then((rows: any[]) => rows, () => [] as any[]) as any[];
    for (const connection of connections) {
      const dbVerify = await getConnectionSecret(prisma, connection.id, 'WEBHOOK_SECRET').catch(() => null);
      if (mode === 'subscribe' && dbVerify && token === dbVerify) return res.status(200).send(String(challenge ?? ''));
    }
    return res.sendStatus(403);
  });

  /** TikTok verification (challenge + configured token / vault secret). */
  router.get('/tiktok', async (req, res) => {
    const token = String(req.query['hub.verify_token'] || req.query['verify_token'] || '');
    const challenge = req.query['hub.challenge'] ?? req.query.challenge;
    const expected = getConfig('TIKTOK_VERIFY_TOKEN');
    if (expected && token === expected) return res.status(200).send(String(challenge ?? ''));
    const connections = await prisma.orm.public.ProviderConnection
      .where({ domain: 'COMMUNICATIONS', provider: 'TIKTOK' } as any).all().then((rows: any[]) => rows, () => [] as any[]) as any[];
    for (const connection of connections) {
      const dbVerify = await getConnectionSecret(prisma, connection.id, 'WEBHOOK_SECRET').catch(() => null);
      if (token && dbVerify === token) return res.status(200).send(String(challenge ?? ''));
    }
    return res.sendStatus(403);
  });

  type VerifyResult = { valid: boolean; connection: any | null; provider: string; ignored?: boolean };

  async function verifyRequest(route: string, req: any, payload: any, raw: Buffer): Promise<VerifyResult> {
    if (route === 'whatsapp') {
      const signature = req.headers['x-hub-signature-256'] as string | undefined;
      const connections = await prisma.orm.public.ProviderConnection
        .where({ domain: 'COMMUNICATIONS', provider: 'WHATSAPP_META' } as any).all().then((rows: any[]) => rows, () => [] as any[]) as any[];
      for (const connection of connections) {
        let secret = getConfig('WHATSAPP_APP_SECRET') || getConfig('META_APP_SECRET');
        const dbSecret = await getConnectionSecret(prisma, connection.id, 'API_SECRET').catch(() => null);
        if (dbSecret) secret = dbSecret;
        if (secret && verifyMetaSignature(raw, signature, secret)) {
          return { valid: true, connection, provider: 'WHATSAPP_META' };
        }
      }
      if (devAllowsUnsigned('WHATSAPP_ALLOW_UNSIGNED_WEBHOOKS')) {
        return { valid: true, connection: connections[0] ?? null, provider: 'WHATSAPP_META' };
      }
      return { valid: false, connection: null, provider: 'WHATSAPP_META' };
    }

    if (route === 'telegram') {
      const connection = await prisma.orm.public.ProviderConnection
        .where({ domain: 'COMMUNICATIONS', provider: 'TELEGRAM' } as any).first().catch(() => null) as any;
      const valid = await verifyTelegramWebhook(prisma, {
        headerToken: req.headers['x-telegram-bot-api-secret-token'] as string | undefined,
        connectionId: connection?.id,
      });
      return { valid, connection: valid ? connection : null, provider: 'TELEGRAM' };
    }

    if (route === 'meta') {
      const requested = String(req.query.network || '').toUpperCase();
      const provider = requested === 'META_FACEBOOK' || requested === 'META_INSTAGRAM'
        ? requested
        : String(payload?.object || '').toLowerCase().includes('instagram') ? 'META_INSTAGRAM' : 'META_FACEBOOK';
      const signature = req.headers['x-hub-signature-256'] as string | undefined;
      const connections = await prisma.orm.public.ProviderConnection
        .where({ domain: 'COMMUNICATIONS', provider } as any).all().then((rows: any[]) => rows, () => [] as any[]) as any[];
      for (const connection of connections) {
        let secret = getConfig('META_APP_SECRET') || getConfig('WHATSAPP_APP_SECRET');
        const dbSecret = await getConnectionSecret(prisma, connection.id, 'API_SECRET').catch(() => null);
        if (dbSecret) secret = dbSecret;
        if (secret && verifyMetaSignature(raw, signature, secret)) return { valid: true, connection, provider };
      }
      if (devAllowsUnsigned('META_ALLOW_UNSIGNED_WEBHOOKS')) {
        return { valid: true, connection: connections[0] ?? null, provider };
      }
      return { valid: false, connection: null, provider };
    }

    // TikTok
    const signature = req.headers['x-tiktok-signature'] as string | undefined;
    const connection = await prisma.orm.public.ProviderConnection
      .where({ domain: 'COMMUNICATIONS', provider: 'TIKTOK' } as any).first().catch(() => null) as any;
    let secret = getConfig('TIKTOK_WEBHOOK_SECRET');
    if (connection?.id) secret = await getConnectionSecret(prisma, connection.id, 'WEBHOOK_SECRET').catch(() => null) || secret;
    const valid = Boolean(secret && signature && verifyMetaSignature(raw, signature, secret));
    return {
      valid: valid || (Boolean(connection) && devAllowsUnsigned('TIKTOK_ALLOW_UNSIGNED_WEBHOOKS')),
      connection: valid || devAllowsUnsigned('TIKTOK_ALLOW_UNSIGNED_WEBHOOKS') ? connection : null,
      provider: 'TIKTOK',
    };
  }

  async function handleWebhook(route: string, req: any, res: any) {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
    let payload: any;
    try {
      payload = JSON.parse(raw.toString('utf8') || '{}');
    } catch {
      await recordProviderEvent(prisma, {
        provider: route.toUpperCase(), domain: 'COMMUNICATIONS', eventType: `${route}.webhook.invalid_json`,
        signatureValid: false, payload: { raw: raw.toString('utf8').slice(0, 500) },
        status: 'FAILED', error: 'Invalid JSON payload',
      }).then(() => undefined, () => undefined);
      return res.sendStatus(400);
    }

    const verified = await verifyRequest(route, req, payload, raw).catch(() => ({ valid: false, connection: null, provider: route.toUpperCase() }));
    const signatureHeader = route === 'telegram'
      ? { 'x-telegram-bot-api-secret-token': req.headers['x-telegram-bot-api-secret-token'] ? 'present' : null }
      : route === 'tiktok'
        ? { 'x-tiktok-signature': req.headers['x-tiktok-signature'] ? 'present' : null }
        : { 'x-hub-signature-256': req.headers['x-hub-signature-256'] ? 'present' : null };

    if (!verified.valid) {
      await recordProviderEvent(prisma, {
        connectionId: verified.connection?.id ?? null, provider: verified.provider, domain: 'COMMUNICATIONS',
        externalEventId: externalEventIdOf(payload), eventType: `${route}.webhook.rejected`,
        signatureValid: false, payload, headers: signatureHeader, status: 'FAILED',
        error: 'Missing or invalid webhook signature/token',
      }).then(() => undefined, () => undefined);
      return res.sendStatus(403);
    }
    if (!verified.connection) {
      await recordProviderEvent(prisma, {
        connectionId: null, provider: verified.provider, domain: 'COMMUNICATIONS',
        externalEventId: externalEventIdOf(payload), eventType: `${route}.webhook.unmatched`,
        signatureValid: true, payload, headers: signatureHeader, status: 'FAILED',
        error: 'No matching provider connection found',
      }).then(() => undefined, () => undefined);
      return res.sendStatus(403);
    }

    const { event, deduped } = await recordProviderEvent(prisma, {
      connectionId: verified.connection.id,
      provider: verified.provider,
      domain: 'COMMUNICATIONS',
      externalEventId: externalEventIdOf(payload),
      eventType: `${route}.webhook`,
      signatureValid: true,
      payload,
      headers: signatureHeader,
      status: 'RECEIVED',
    });
    if (deduped && (event as any)?.status === 'PROCESSED') return res.sendStatus(200);
    if (deduped && (event as any)?.status === 'IGNORED') return res.sendStatus(200);

    // A queued replay uses the same idempotent processor; the HTTP response is
    // only acknowledged after inline processing succeeds (or is ignored).
    try {
      await getQueue(WEBHOOK_QUEUE).add('process-provider-event', { eventId: event.id, provider: verified.provider });
    } catch (err) {
      console.warn('[communications] webhook queue enqueue failed; processing inline:', err instanceof Error ? err.message : err);
    }
    try {
      await processProviderEvent(prisma, event);
      return res.sendStatus(200);
    } catch (err) {
      const message = err instanceof ProviderCapabilityError ? err.message : 'Webhook processing failed';
      console.warn('[communications] webhook processing failed:', message);
      // Non-2xx tells the provider to retry; the event stays FAILED for the
      // retry worker. Never acknowledge an unprocessed event.
      return res.status(500).json({ error: message });
    }
  }

  router.post('/whatsapp', express.raw({ type: '*/*' }) as any, (req, res) => handleWebhook('whatsapp', req, res));
  router.post('/telegram', express.raw({ type: '*/*' }) as any, (req, res) => handleWebhook('telegram', req, res));
  router.post('/meta', express.raw({ type: '*/*' }) as any, (req, res) => handleWebhook('meta', req, res));
  router.post('/tiktok', express.raw({ type: '*/*' }) as any, (req, res) => handleWebhook('tiktok', req, res));

  return router;
}
