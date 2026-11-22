/**
 * TikTok adapter — READ ONLY by policy.
 *
 * The capability matrix marks TikTok as read-only and external-approval-gated.
 * This module intentionally exposes no write API call: `assertTiktokApproval`
 * and `sendTiktokMessage` always fail closed so a caller can never accidentally
 * reply, comment or publish through this adapter.
 */

import type { Db } from '../../../db';
import { newId, ts, tsMs } from '../../../prisma/db';
import { assertCapability, ProviderCapabilityError } from './capabilities';
import { ingestInboundMessage } from './conversations';

export type ParsedTiktokEvent = {
  eventId: string | null;
  eventType: string;
  objectId: string | null;
  fromId: string | null;
  fromName: string | null;
  text: string | null;
  timestamp: string | null;
};

export function parseTiktokWebhook(payload: any): ParsedTiktokEvent[] {
  const events = Array.isArray(payload?.events) ? payload.events : [payload];
  return events.filter(Boolean).map((event: any) => {
    const object = event?.object ?? event?.data ?? {};
    const from = object?.user ?? object?.from ?? event?.from ?? {};
    const rawTimestamp = event?.timestamp ?? object?.create_time ?? object?.created_at;
    const numeric = Number(rawTimestamp);
    const timestamp = Number.isFinite(numeric) && numeric > 0
      ? new Date(numeric > 1e12 ? numeric : numeric * 1000).toISOString()
      : (typeof rawTimestamp === 'string' && rawTimestamp ? new Date(rawTimestamp).toISOString() : null);
    return {
      eventId: event?.event_id ? String(event.event_id) : null,
      eventType: String(event?.event_type ?? event?.type ?? 'unknown'),
      objectId: object?.id ? String(object.id) : (object?.video_id ? String(object.video_id) : null),
      fromId: from?.id ? String(from.id) : (from?.open_id ? String(from.open_id) : null),
      fromName: from?.username ? String(from.username) : null,
      text: object?.text ?? object?.comment ?? event?.text ?? null,
      timestamp: timestamp && Number.isFinite(Date.parse(timestamp)) ? timestamp : null,
    };
  });
}

/** Ingest read-only TikTok events into the inbox (no outbound side effects). */
export async function processTiktokWebhook(prisma: Db, payload: any, opts: { connectionId?: string | null } = {}) {
  assertCapability('TIKTOK', 'read');
  const events = parseTiktokWebhook(payload);
  if (!events.length) return { ignored: true as const, events: 0 };
  const connection = opts.connectionId
    ? await prisma.orm.public.ProviderConnection.where({ id: opts.connectionId } as any).first().catch(() => null) as any
    : await prisma.orm.public.ProviderConnection
      .where({ domain: 'COMMUNICATIONS', provider: 'TIKTOK' } as any).first().catch(() => null) as any;
  if (!connection) throw new Error('TikTok webhook received but no TikTok provider connection exists');
  let account = await prisma.orm.public.CommunicationAccount.where({ connectionId: connection.id } as any).first().catch(() => null) as any;
  if (!account) {
    account = await prisma.orm.public.CommunicationAccount.create({
      id: newId(), connectionId: connection.id, channel: 'TIKTOK', provider: 'TIKTOK',
      name: 'TikTok (read-only)', externalId: connection.externalAccountId,
      status: 'ACTIVE', capabilities: { read: true, external_approval_required: true } as any, config: {} as any,
      createdById: connection.createdById ?? null, createdAt: ts(), updatedAt: ts(),
    } as any).catch(async () => prisma.orm.public.CommunicationAccount.where({ connectionId: connection.id } as any).first() as any);
  }
  let stored = 0;
  for (const event of events) {
    const result = await ingestInboundMessage(prisma, {
      accountId: account.id,
      channel: 'TIKTOK',
      externalThreadId: `tiktok:${event.objectId ?? event.fromId ?? 'global'}`,
      providerMessageId: event.eventId ? `tiktok:${event.eventId}` : null,
      sentAt: event.timestamp,
      preview: event.text ?? `[${event.eventType}]`,
      bodyText: event.text,
      bodyRich: { type: 'tiktok', eventType: event.eventType, raw: event } as any,
      senderAddress: event.fromId,
      contact: event.fromId
        ? { name: event.fromName, identity: { channel: 'TIKTOK', value: event.fromId } }
        : undefined,
      metadata: { readOnly: true, externalApprovalRequired: true, objectId: event.objectId } as any,
    });
    if (result.created) stored += 1;
  }
  return { ignored: false as const, events: events.length, stored };
}

/** Always throws — TikTok writes require an external, approved workflow. */
export function assertTiktokApproval(): never {
  throw new ProviderCapabilityError(
    'TIKTOK', 'respond',
    'TikTok is read-only in this platform. Responses require external approval and must be executed outside the adapter.',
  );
}

export async function sendTiktokMessage(): Promise<never> {
  return assertTiktokApproval();
}

/** Keep a used import alive for type-check clarity around timestamp helpers. */
export const tiktokTimestamp = (value: string | null): number => (value ? tsMs(value) : 0);
