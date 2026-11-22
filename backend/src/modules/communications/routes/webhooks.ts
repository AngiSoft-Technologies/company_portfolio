import express, { Router } from 'express';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { recordProviderEvent } from '../../../shared/services/providerEvents';
import { decryptSecret } from '../../../shared/services/secrets';
import { extractWhatsAppMessages, extractWhatsAppStatuses, verifyMetaSignature } from '../services/whatsappCloud';

async function getConnectionSecret(prisma: Db, connectionId: string, kind: string) {
  const row = await prisma.orm.public.ProviderSecret.where({ connectionId, kind } as any).orderBy((s: any) => s.createdAt.desc()).first();
  if (!row) return null;
  return decryptSecret({ ciphertext: row.ciphertext, iv: row.iv, authTag: row.authTag, keyVersion: row.keyVersion });
}

export default function communicationsWebhooksRouter(prisma: Db) {
  const router = Router();

  // Meta webhook verification
  router.get('/whatsapp', async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = String(req.query['hub.verify_token'] || '');
    const challenge = req.query['hub.challenge'];
    const connections = await prisma.orm.public.ProviderConnection.where({ domain: 'COMMUNICATIONS', provider: 'WHATSAPP_META' } as any).all();
    for (const c of connections) {
      const cfg: any = c.config || {};
      const expected = cfg.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN;
      if (mode === 'subscribe' && expected && token === expected) {
        return res.status(200).send(String(challenge ?? ''));
      }
    }
    return res.sendStatus(403);
  });

  // Meta webhook events (raw body for signature verification)
  router.post('/whatsapp', express.raw({ type: '*/*' }) as any, async (req: any, res) => {
    try {
      const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
      const payload = JSON.parse(raw.toString('utf8') || '{}');
      const signature = req.headers['x-hub-signature-256'] as string | undefined;

      const connections = await prisma.orm.public.ProviderConnection.where({ domain: 'COMMUNICATIONS', provider: 'WHATSAPP_META' } as any).all();
      let matched: any = null;
      let signatureValid = false;
      for (const c of connections) {
        let secret = (c.config as any)?.appSecret || process.env.WHATSAPP_APP_SECRET || '';
        try {
          const dbSecret = await getConnectionSecret(prisma, c.id, 'API_SECRET');
          if (dbSecret) secret = dbSecret;
        } catch {}
        if (secret && verifyMetaSignature(raw, signature, secret)) {
          matched = c; signatureValid = true; break;
        }
      }
      const allowUnsigned = process.env.WHATSAPP_ALLOW_UNSIGNED_WEBHOOKS === 'true' && process.env.NODE_ENV !== 'production';
      if (!signatureValid) {
        await recordProviderEvent(prisma, {
          connectionId: matched?.id ?? null,
          provider: 'WHATSAPP_META',
          domain: 'COMMUNICATIONS',
          externalEventId: payload?.entry?.[0]?.id,
          eventType: 'whatsapp.webhook.rejected',
          signatureValid: false,
          payload,
          headers: { 'x-hub-signature-256': signature },
          status: allowUnsigned ? 'RECEIVED' : 'FAILED',
          error: 'Invalid or missing X-Hub-Signature-256',
        }).catch(() => {});
        if (!allowUnsigned) return res.sendStatus(403);
      }
      if (!matched) {
        await recordProviderEvent(prisma, {
          connectionId: null, provider: 'WHATSAPP_META', domain: 'COMMUNICATIONS',
          externalEventId: payload?.entry?.[0]?.id, eventType: 'whatsapp.webhook.unmatched',
          signatureValid, payload, headers: { 'x-hub-signature-256': signature },
          status: 'FAILED', error: 'No matching WhatsApp connection found',
        }).catch(() => {});
        return res.sendStatus(403);
      }

      const externalEventId = payload?.entry?.[0]?.id;
      const { event, deduped } = await recordProviderEvent(prisma, {
        connectionId: matched.id,
        provider: 'WHATSAPP_META',
        domain: 'COMMUNICATIONS',
        externalEventId,
        eventType: 'whatsapp.webhook',
        signatureValid,
        payload,
        headers: { 'x-hub-signature-256': signature },
        status: 'RECEIVED',
      });
      if (deduped) return res.sendStatus(200);

      const statuses = extractWhatsAppStatuses(payload);
      for (const st of statuses) {
        if (!st.id) continue;
        await prisma.orm.public.ConversationMessage.where({ providerMessageId: st.id } as any).updateAll({ deliveryStatus: st.status.toUpperCase(), metadata: { status: st } as any } as any).catch(() => {});
      }

      const messages = extractWhatsAppMessages(payload);
      for (const msg of messages) {
        let account = await prisma.orm.public.CommunicationAccount.where({ provider: 'WHATSAPP_META', externalId: msg.phoneNumberId ?? null } as any).first();
        if (!account && matched) {
          account = await prisma.orm.public.CommunicationAccount.create({
            id: newId(), connectionId: matched.id, channel: 'WHATSAPP', provider: 'WHATSAPP_META',
            name: msg.displayPhoneNumber ? `WhatsApp ${msg.displayPhoneNumber}` : 'WhatsApp Account',
            address: msg.displayPhoneNumber ?? null, externalId: msg.phoneNumberId ?? null,
            status: 'ACTIVE', capabilities: {} as any, config: {} as any, createdById: matched.createdById ?? null,
            createdAt: ts(), updatedAt: ts(),
          } as any);
        }
        if (!account) continue;

        const identityValue = msg.from;
        let identity: any = await prisma.orm.public.ContactIdentity.where({ channel: 'WHATSAPP', value: identityValue } as any).include('contact').first();
        if (!identity) {
          const contact = await prisma.orm.public.Contact.create({ id: newId(), name: msg.name ?? null, createdAt: ts(), updatedAt: ts() } as any);
          const createdIdentity = await prisma.orm.public.ContactIdentity.create({
            id: newId(), contactId: contact.id, channel: 'WHATSAPP', value: identityValue, externalId: identityValue, metadata: { name: msg.name } as any, createdAt: ts(),
          } as any);
          identity = { ...(createdIdentity as any), contact };
        }

        const threadId = `wa:${msg.from}`;
        let convo = await prisma.orm.public.Conversation.where({ accountId: account.id, externalThreadId: threadId } as any).first();
        const now = ts();
        if (!convo) {
          convo = await prisma.orm.public.Conversation.create({
            id: newId(), accountId: account.id, contactId: (identity as any).contactId, channel: 'WHATSAPP', externalThreadId: threadId,
            subject: msg.name ? `WhatsApp: ${msg.name}` : `WhatsApp: ${msg.from}`,
            status: 'OPEN', priority: 'NORMAL', lastMessageAt: now, lastMessagePreview: msg.text ?? `[${msg.type}]`,
            metadata: { from: msg.from } as any, createdAt: now, updatedAt: now,
          } as any);
        } else {
          await prisma.orm.public.Conversation.where({ id: convo.id }).update({ lastMessageAt: now, lastMessagePreview: msg.text ?? `[${msg.type}]`, updatedAt: now, status: 'OPEN' } as any);
        }

        const existingMsg = msg.id ? await prisma.orm.public.ConversationMessage.where({ providerMessageId: msg.id } as any).first() : null;
        if (!existingMsg) {
          await prisma.orm.public.ConversationMessage.create({
            id: newId(), conversationId: convo.id, providerMessageId: msg.id ?? null, direction: 'INBOUND', senderType: 'CONTACT',
            senderId: (identity as any).contactId, senderAddress: msg.from, bodyText: msg.text ?? null,
            bodyRich: { type: msg.type, raw: msg } as any, deliveryStatus: 'RECEIVED',
            sentAt: msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : now, receivedAt: now, createdAt: now,
          } as any);
        }
      }

      await prisma.orm.public.ProviderEvent.where({ id: event.id }).update({ status: 'PROCESSED', processedAt: ts(), signatureValid } as any);
      return res.sendStatus(200);
    } catch (err: any) {
      console.error('whatsapp webhook error', err);
      return res.sendStatus(200); // acknowledge to avoid retries storm; event/error logged above where possible
    }
  });

  return router;
}
