/** Telegram Bot API adapter (official API only). */

import crypto from 'crypto';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { getConfig } from '../../../shared/services/runtimeConfig';
import { assertCapability } from './capabilities';
import { ProviderConfigurationError, readProviderSecret } from './providerSecrets';
import { ingestInboundMessage } from './conversations';

export type TelegramUpdate = Record<string, any>;

/** Length-safe constant-time string comparison, same contract as other webhooks. */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export type ParsedTelegramMessage = {
  updateId: string | null;
  messageId: string | null;
  chatId: string | null;
  fromId: string | null;
  fromName: string | null;
  username: string | null;
  text: string | null;
  timestamp: string | null;
  botId: string | null;
};

/** Extract the first usable message from a Telegram webhook update. */
export function parseTelegramUpdate(update: TelegramUpdate): ParsedTelegramMessage | null {
  const raw = update?.message ?? update?.edited_message ?? update?.channel_post ?? update?.callback_query?.message;
  if (!raw) return null;
  const from = raw.from ?? update?.callback_query?.from ?? {};
  const chat = raw.chat ?? {};
  const fromId = from.id !== undefined ? String(from.id) : null;
  const chatId = chat.id !== undefined ? String(chat.id) : fromId;
  const timestamp = raw.date ? new Date(Number(raw.date) * 1000).toISOString() : null;
  return {
    updateId: update.update_id !== undefined ? String(update.update_id) : null,
    messageId: raw.message_id !== undefined ? String(raw.message_id) : null,
    chatId,
    fromId,
    fromName: [from.first_name, from.last_name].filter(Boolean).join(' ') || from.username || null,
    username: from.username ? String(from.username) : null,
    text: typeof raw.text === 'string' ? raw.text : (typeof raw.caption === 'string' ? raw.caption : null),
    timestamp,
    botId: raw.sender_chat?.id !== undefined ? String(raw.sender_chat.id) : null,
  };
}

/**
 * Verify the Telegram secret-token header. When no token is configured the
 * webhook fails closed, except in explicit non-production dev mode.
 */
export async function verifyTelegramWebhook(prisma: Db, input: {
  headerToken?: string | null;
  connectionId?: string | null;
}): Promise<boolean> {
  let expected: string | null = getConfig('TELEGRAM_WEBHOOK_TOKEN') || null;
  if (!expected && input.connectionId) {
    expected = await readProviderSecret(prisma, input.connectionId, 'WEBHOOK_SECRET').catch(() => null);
  }
  if (!expected) {
    return process.env.NODE_ENV !== 'production' && getConfig('TELEGRAM_ALLOW_UNSIGNED_WEBHOOKS') === 'true';
  }
  return safeEqual(input.headerToken, expected);
}

async function getTelegramToken(prisma: Db, connectionId?: string | null): Promise<string> {
  const configToken = getConfig('TELEGRAM_BOT_TOKEN');
  if (configToken) return configToken;
  if (connectionId) {
    const stored = await readProviderSecret(prisma, connectionId, 'ACCESS_TOKEN')
      || await readProviderSecret(prisma, connectionId, 'API_KEY');
    if (stored) return stored;
  }
  throw new ProviderConfigurationError('TELEGRAM_BOT_TOKEN is not configured');
}

async function resolveTelegramConnection(prisma: Db, connectionId?: string | null) {
  const connection = connectionId
    ? await prisma.orm.public.ProviderConnection.where({ id: connectionId } as any).first().catch(() => null) as any
    : await prisma.orm.public.ProviderConnection
      .where({ domain: 'COMMUNICATIONS', provider: 'TELEGRAM' } as any).first().catch(() => null) as any;
  if (!connection) throw new ProviderConfigurationError('No Telegram provider connection found');
  return connection;
}

/** Idempotently ingest an update into the unified inbox. */
export async function processTelegramUpdate(prisma: Db, update: TelegramUpdate, opts: { connectionId?: string | null } = {}) {
  assertCapability('TELEGRAM', 'read');
  const parsed = parseTelegramUpdate(update);
  if (!parsed?.chatId) return { ignored: true as const };
  const connection = await resolveTelegramConnection(prisma, opts.connectionId);
  const botId = parsed.botId || connection.externalAccountId || null;
  let account = botId
    ? await prisma.orm.public.CommunicationAccount.where({ provider: 'TELEGRAM', externalId: botId } as any).first().catch(() => null) as any
    : await prisma.orm.public.CommunicationAccount.where({ connectionId: connection.id } as any).first().catch(() => null) as any;
  if (!account) {
    account = await prisma.orm.public.CommunicationAccount.create({
      id: newId(), connectionId: connection.id, channel: 'TELEGRAM', provider: 'TELEGRAM',
      name: 'Telegram Bot', address: botId ? `bot:${botId}` : null, externalId: botId,
      status: 'ACTIVE', capabilities: {} as any, config: {} as any,
      createdById: connection.createdById ?? null, createdAt: ts(), updatedAt: ts(),
    } as any).catch(async () => prisma.orm.public.CommunicationAccount
      .where({ connectionId: connection.id } as any).first() as any);
  }
  const result = await ingestInboundMessage(prisma, {
    accountId: account.id,
    channel: 'TELEGRAM',
    externalThreadId: `tg:${parsed.chatId}`,
    providerMessageId: parsed.messageId ? `tg:${parsed.messageId}` : null,
    sentAt: parsed.timestamp,
    preview: parsed.text ?? '[telegram message]',
    bodyText: parsed.text,
    bodyRich: { type: 'telegram', raw: update } as any,
    senderAddress: parsed.fromId,
    contact: parsed.fromId
      ? { name: parsed.fromName, identity: { channel: 'TELEGRAM', value: parsed.fromId, externalId: parsed.username } }
      : undefined,
    metadata: { chatId: parsed.chatId, botId } as any,
  });
  return { ignored: false as const, ...result };
}

/** Send a text message with the Bot API. Never logs or returns the token. */
export async function sendText(prisma: Db, input: {
  connectionId?: string | null;
  accountId?: string;
  chatId: string;
  text: string;
  actorId?: string | null;
}) {
  assertCapability('TELEGRAM', 'respond');
  const connection = await resolveTelegramConnection(prisma, input.connectionId);
  const token = await getTelegramToken(prisma, connection.id);
  let response: any;
  try {
    response = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: input.chatId, text: input.text.slice(0, 4096) }),
    });
  } catch {
    throw new ProviderConfigurationError('Telegram Bot API request failed');
  }
  const json: any = await response.json().catch(() => ({}));
  if (!response.ok || json?.ok === false) {
    await prisma.orm.public.CommunicationAccount.where({ connectionId: connection.id }).updateAll({
      lastError: `telegram send failed (HTTP ${response.status})`, updatedAt: ts(),
    } as any).then(() => undefined, () => undefined);
    throw new ProviderConfigurationError(`Telegram send failed (HTTP ${response.status})`);
  }
  return { messageId: json?.result?.message_id ? String(json.result.message_id) : null, chatId: input.chatId };
}
