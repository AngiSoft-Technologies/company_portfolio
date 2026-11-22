/**
 * Shared, idempotent ProviderEvent processor.
 *
 * HTTP webhook routes and the central retry worker both call
 * `processProviderEvent`. A RECEIVED/FAILED event can be replayed safely:
 * contacts, conversations and messages are keyed by provider ids, so a retry
 * updates existing rows instead of duplicating them.
 */

import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { registerProviderEventProcessor } from '../../../shared/services/providerEvents';
import { assertCapability } from './capabilities';
import { extractWhatsAppMessages, extractWhatsAppStatuses } from './whatsappCloud';
import { ingestInboundMessage } from './conversations';
import { processTelegramUpdate } from './telegram';
import { processMetaWebhook, type MetaNetwork } from './metaSocial';
import { hasMetaLeadEvent, ingestMetaLeadEvent } from './metaCapabilities';
import { processTiktokWebhook } from './tiktok';

function safeErrorMessage(err: unknown): string {
  return String(err instanceof Error ? err.message : err).slice(0, 500);
}

async function whatsappAccount(prisma: Db, connectionId: string | null, phoneNumberId: string | null, displayPhone: string | null) {
  let account: any = null;
  if (phoneNumberId) {
    account = await prisma.orm.public.CommunicationAccount
      .where({ provider: 'WHATSAPP_META', externalId: phoneNumberId } as any).first().catch(() => null) as any;
  }
  if (!account && connectionId) {
    account = await prisma.orm.public.CommunicationAccount
      .where({ connectionId } as any).first().catch(() => null) as any;
  }
  if (!account && connectionId) {
    account = await prisma.orm.public.CommunicationAccount.create({
      id: newId(), connectionId, channel: 'WHATSAPP', provider: 'WHATSAPP_META',
      name: displayPhone ? `WhatsApp ${displayPhone}` : 'WhatsApp Account',
      address: displayPhone ?? null, externalId: phoneNumberId, status: 'ACTIVE',
      capabilities: {} as any, config: {} as any, createdAt: ts(), updatedAt: ts(),
    } as any).catch(async () => connectionId
      ? prisma.orm.public.CommunicationAccount.where({ connectionId } as any).first() as any
      : null);
  }
  return account;
}

async function handleWhatsApp(prisma: Db, event: any) {
  assertCapability('WHATSAPP_META', 'read');
  const payload = event.payload ?? {};
  const statuses = extractWhatsAppStatuses(payload);
  for (const status of statuses) {
    if (!status.id) continue;
    const ids = [`wa:${status.id}`, status.id];
    for (const providerMessageId of ids) {
      await prisma.orm.public.ConversationMessage
        .where({ providerMessageId } as any)
        .updateAll({ deliveryStatus: String(status.status ?? '').toUpperCase(), metadata: { status } as any } as any)
        .then(() => undefined, () => undefined);
    }
  }
  const messages = extractWhatsAppMessages(payload);
  let stored = 0;
  for (const msg of messages) {
    if (!msg.from || !msg.id) continue;
    const account = await whatsappAccount(prisma, event.connectionId ?? null, msg.phoneNumberId ?? null, msg.displayPhoneNumber ?? null);
    if (!account) continue;
    const result = await ingestInboundMessage(prisma, {
      accountId: account.id,
      channel: 'WHATSAPP',
      externalThreadId: `wa:${msg.from}`,
      providerMessageId: `wa:${msg.id}`,
      sentAt: msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : null,
      preview: msg.text ?? `[${msg.type}]`,
      bodyText: msg.text ?? null,
      bodyRich: { type: msg.type, raw: msg } as any,
      senderAddress: msg.from,
      contact: { name: msg.name ?? null, identity: { channel: 'WHATSAPP', value: msg.from, externalId: msg.from, metadata: { name: msg.name } } },
      metadata: { phoneNumberId: msg.phoneNumberId, from: msg.from } as any,
    });
    if (result.created) stored += 1;
  }
  if (!stored && !statuses.length) return 'IGNORED';
  return 'PROCESSED';
}

async function markIgnored(prisma: Db, event: any, reason: string) {
  await prisma.orm.public.ProviderEvent.where({ id: event.id }).update({
    status: 'IGNORED', processedAt: ts(), error: reason,
  } as any).then(() => undefined, () => undefined);
}

/**
 * Process a recorded event. Safe on already-recorded events; a second call on
 * a PROCESSED/IGNORED event is a no-op.
 */
export async function processProviderEvent(prisma: Db, event: any): Promise<void> {
  if (!event?.id) throw new Error('ProviderEvent is required');
  const status = String(event.status ?? '');
  if (status === 'PROCESSED' || status === 'IGNORED') return;

  let nextStatus: 'PROCESSED' | 'IGNORED' = 'PROCESSED';
  try {
    switch (String(event.provider)) {
      case 'WHATSAPP_META':
        nextStatus = await handleWhatsApp(prisma, event) as 'PROCESSED' | 'IGNORED';
        break;
      case 'TELEGRAM': {
        const result = await processTelegramUpdate(prisma, event.payload ?? {}, { connectionId: event.connectionId });
        if (result.ignored) nextStatus = 'IGNORED';
        break;
      }
      case 'META_FACEBOOK':
      case 'META_INSTAGRAM': {
        const result = await processMetaWebhook(prisma, event.payload ?? {}, event.provider as MetaNetwork, { connectionId: event.connectionId });
        if (hasMetaLeadEvent(event.payload)) {
          await ingestMetaLeadEvent(prisma, event.payload, { connectionId: event.connectionId, network: event.provider as MetaNetwork });
        }
        if (result.ignored && !hasMetaLeadEvent(event.payload)) nextStatus = 'IGNORED';
        break;
      }
      case 'TIKTOK': {
        const result = await processTiktokWebhook(prisma, event.payload ?? {}, { connectionId: event.connectionId });
        if (result.ignored) nextStatus = 'IGNORED';
        break;
      }
      default:
        await markIgnored(prisma, event, `No processor registered for provider ${event.provider}`);
        return;
    }
    await prisma.orm.public.ProviderEvent.where({ id: event.id }).update({
      status: nextStatus, processedAt: ts(), error: null,
    } as any).then(() => undefined, () => undefined);
  } catch (err) {
    const message = safeErrorMessage(err);
    await prisma.orm.public.ProviderEvent.where({ id: event.id }).update({
      status: 'FAILED', error: message,
    } as any).then(() => undefined, () => undefined);
    throw err;
  }
}

/**
 * Register every supported communications provider (and a domain wildcard)
 * with the shared provider-events worker. Registration is idempotent and
 * happens on module import, so the webhook retry worker can dispatch events
 * through the same fail-closed processor used by the HTTP handlers.
 */
for (const provider of [
  'WHATSAPP_META',
  'TELEGRAM',
  'META_FACEBOOK',
  'META_INSTAGRAM',
  'TIKTOK',
  '*',
]) {
  registerProviderEventProcessor('COMMUNICATIONS', provider, processProviderEvent);
}

export default processProviderEvent;
