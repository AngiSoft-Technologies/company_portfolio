/** Facebook / Instagram Graph webhook + reply adapter. */

import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { getConfig, getMetaGraphVersion } from '../../../shared/services/runtimeConfig';
import { assertCapability, type CommunicationProvider } from './capabilities';
import { ProviderConfigurationError, readProviderSecret } from './providerSecrets';
import { ingestInboundMessage } from './conversations';

export type MetaNetwork = 'META_FACEBOOK' | 'META_INSTAGRAM';

export type ParsedMetaItem = {
  kind: 'message' | 'comment';
  pageId: string | null;
  objectId: string | null;
  fromId: string | null;
  fromName: string | null;
  threadId: string;
  providerMessageId: string | null;
  text: string | null;
  timestamp: string | null;
};

function toIso(value: unknown): string | null {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return new Date(n > 1e12 ? n : n * 1000).toISOString();
  if (typeof value === 'string' && value) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
  }
  return null;
}

/** Normalise Graph `messages`, `feed` and `comments` changes (and Messenger `messaging`). */
export function parseMetaWebhook(payload: any, network: MetaNetwork): ParsedMetaItem[] {
  const out: ParsedMetaItem[] = [];
  for (const entry of payload?.entry || []) {
    const pageId = entry?.id ? String(entry.id) : null;
    for (const change of entry?.changes || []) {
      const value = change?.value ?? {};
      const field = String(change?.field ?? '');
      if (field === 'messages' || value?.item === 'message' || value?.message) {
        const fromId = value?.sender?.id ? String(value.sender.id) : (value?.from?.id ? String(value.from.id) : null);
        const messageId = value?.message?.mid || value?.message?.id || value?.id;
        if (!fromId) continue;
        out.push({
          kind: 'message',
          pageId,
          objectId: value?.recipient?.id ? String(value.recipient.id) : pageId,
          fromId,
          fromName: value?.sender?.name || value?.from?.name || null,
          threadId: `msg:${fromId}:${pageId ?? value?.recipient?.id ?? 'unknown'}`,
          providerMessageId: messageId ? String(messageId) : null,
          text: value?.message?.text ?? value?.message?.attachment?.title ?? null,
          timestamp: toIso(value?.timestamp ?? entry?.time),
        });
      } else if (field === 'comments' || field === 'feed' || value?.item === 'comment') {
        const fromId = value?.from?.id ? String(value.from.id) : null;
        if (!fromId) continue;
        const postId = value?.post_id ? String(value.post_id) : null;
        out.push({
          kind: 'comment',
          pageId,
          objectId: postId || pageId,
          fromId,
          fromName: value?.from?.name || null,
          threadId: `comment:${postId ?? pageId ?? 'unknown'}`,
          providerMessageId: value?.comment_id || value?.id ? String(value.comment_id || value.id) : null,
          text: value?.message ?? value?.text ?? null,
          timestamp: toIso(value?.created_time ?? entry?.time),
        });
      }
    }
    for (const messaging of entry?.messaging || []) {
      const fromId = messaging?.sender?.id ? String(messaging.sender.id) : null;
      if (!fromId) continue;
      out.push({
        kind: 'message',
        pageId,
        objectId: messaging?.recipient?.id ? String(messaging.recipient.id) : pageId,
        fromId,
        fromName: null,
        threadId: `msg:${fromId}:${pageId ?? 'unknown'}`,
        providerMessageId: messaging?.message?.mid ? String(messaging.message.mid) : null,
        text: messaging?.message?.text ?? null,
        timestamp: toIso(messaging?.timestamp ?? entry?.time),
      });
    }
  }
  return out;
}

/** True when the hub.verify_token query value matches configured verification. */
export function verifyMetaVerifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const expected = getConfig('META_WEBHOOK_VERIFY_TOKEN') || getConfig('WHATSAPP_VERIFY_TOKEN');
  return Boolean(expected) && token === expected;
}

async function resolveConnection(prisma: Db, network: MetaNetwork, connectionId?: string | null) {
  const connection = connectionId
    ? await prisma.orm.public.ProviderConnection.where({ id: connectionId } as any).first().catch(() => null) as any
    : await prisma.orm.public.ProviderConnection
      .where({ domain: 'COMMUNICATIONS', provider: network } as any).first().catch(() => null) as any;
  if (!connection) throw new ProviderConfigurationError(`No ${network} provider connection found`);
  return connection;
}

export async function resolveMetaAccount(prisma: Db, connection: any, pageId: string | null) {
  let account: any = null;
  if (pageId) {
    account = await prisma.orm.public.CommunicationAccount
      .where({ provider: connection.provider, externalId: pageId } as any).first().catch(() => null) as any;
  }
  if (!account) account = await prisma.orm.public.CommunicationAccount.where({ connectionId: connection.id } as any).first().catch(() => null) as any;
  if (!account) {
    account = await prisma.orm.public.CommunicationAccount.create({
      id: newId(), connectionId: connection.id, channel: connection.provider, provider: connection.provider,
      name: `${connection.provider} page`, externalId: pageId, address: pageId, status: 'ACTIVE',
      capabilities: {} as any, config: {} as any, createdById: connection.createdById ?? null,
      createdAt: ts(), updatedAt: ts(),
    } as any).catch(async () => prisma.orm.public.CommunicationAccount
      .where({ connectionId: connection.id } as any).first() as any);
  }
  return account;
}

/** Parse + idempotently persist a Facebook/Instagram webhook payload. */
export async function processMetaWebhook(prisma: Db, payload: any, network: MetaNetwork, opts: { connectionId?: string | null } = {}) {
  assertCapability(network, 'read');
  const items = parseMetaWebhook(payload, network);
  if (!items.length) return { ignored: true as const, items: 0 };
  const connection = await resolveConnection(prisma, network, opts.connectionId);
  let stored = 0;
  for (const item of items) {
    const account = await resolveMetaAccount(prisma, connection, item.pageId);
    const result = await ingestInboundMessage(prisma, {
      accountId: account.id,
      channel: network,
      externalThreadId: `${network.toLowerCase()}:${item.threadId}`,
      providerMessageId: item.providerMessageId ? `${item.kind}:${item.providerMessageId}` : null,
      sentAt: item.timestamp,
      preview: item.text ?? `[${item.kind}]`,
      bodyText: item.text,
      bodyRich: { type: item.kind, network, raw: item } as any,
      senderAddress: item.fromId,
      contact: item.fromId
        ? { name: item.fromName, identity: { channel: network, value: item.fromId, externalId: item.fromName } }
        : undefined,
      metadata: { pageId: item.pageId, objectId: item.objectId, kind: item.kind } as any,
    });
    if (result.created) stored += 1;
  }
  return { ignored: false as const, items: items.length, stored };
}

async function metaToken(prisma: Db, connectionId: string): Promise<string> {
  const configured = getConfig('META_SYSTEM_USER_TOKEN') || getConfig('META_PAGE_ACCESS_TOKEN');
  if (configured) return configured;
  const stored = await readProviderSecret(prisma, connectionId, 'ACCESS_TOKEN')
    || await readProviderSecret(prisma, connectionId, 'API_KEY');
  if (stored) return stored;
  throw new ProviderConfigurationError('META_SYSTEM_USER_TOKEN is not configured');
}

function graphBase(): string {
  const version = getMetaGraphVersion();
  return `https://graph.facebook.com/${version}`;
}

async function graphPost(url: string, token: string, payload: unknown, prisma: Db, connectionId: string, description: string) {
  let response: any;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ProviderConfigurationError(`${description} request failed`);
  }
  const json: any = await response.json().catch(() => ({}));
  if (!response.ok || json?.error) {
    await prisma.orm.public.CommunicationAccount.where({ connectionId }).updateAll({
      lastError: `${description} failed (HTTP ${response.status})`, updatedAt: ts(),
    } as any).then(() => undefined, () => undefined);
    // Error payloads can echo request context; keep only the status.
    throw new ProviderConfigurationError(`${description} failed (HTTP ${response.status})`);
  }
  return json;
}

/** Reply to a Page/Instagram conversation via the Graph API. */
export async function sendMetaMessage(prisma: Db, input: {
  network: MetaNetwork;
  connectionId?: string | null;
  recipientId: string;
  text: string;
  actorId?: string | null;
}) {
  assertCapability(input.network, 'respond');
  const connection = await resolveConnection(prisma, input.network, input.connectionId);
  const token = await metaToken(prisma, connection.id);
  const endpointId = input.network === 'META_INSTAGRAM'
    ? (getConfig('META_INSTAGRAM_ACCOUNT_ID') || connection.externalAccountId)
    : (connection.externalAccountId || getConfig('META_FACEBOOK_PAGE_ID'));
  if (!endpointId) throw new ProviderConfigurationError(`${input.network} page/account id is not configured`);
  const json = await graphPost(
    `${graphBase()}/${encodeURIComponent(endpointId)}/messages`,
    token,
    { recipient: { id: input.recipientId }, message: { text: input.text.slice(0, 2000) } },
    prisma, connection.id, `${input.network} send`,
  );
  return { messageId: json?.message_id ?? json?.id ?? null };
}

/** Post a public comment reply on a Page post. */
export async function sendMetaComment(prisma: Db, input: {
  network: MetaNetwork;
  connectionId?: string | null;
  objectId: string;
  text: string;
}) {
  assertCapability(input.network, 'respond');
  const connection = await resolveConnection(prisma, input.network, input.connectionId);
  const token = await metaToken(prisma, connection.id);
  const json = await graphPost(
    `${graphBase()}/${encodeURIComponent(input.objectId)}/comments`,
    token,
    { message: input.text.slice(0, 2000) },
    prisma, connection.id, `${input.network} comment`,
  );
  return { commentId: json?.id ?? null };
}

/** Capability check used by routes that expose write controls for a provider. */
export function assertMetaWritable(provider: string | CommunicationProvider): void {
  assertCapability(provider, 'respond');
}
