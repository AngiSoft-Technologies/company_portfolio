/**
 * Zoho Mail adapter: OAuth, send and mailbox sync.
 *
 * All credentials come from runtimeConfig (ZOHO_CLIENT_ID / SECRET /
 * REDIRECT_URI) or the encrypted ProviderSecret vault. Missing config throws
 * a descriptive ProviderConfigurationError — the adapter never falls back to
 * a hard-coded credential and never logs a token or secret.
 */

import type { Db } from '../../../db';
import { newId, ts, tsMs } from '../../../prisma/db';
import { getConfig } from '../../../shared/services/runtimeConfig';
import { assertCapability } from './capabilities';
import { ProviderConfigurationError, readProviderSecret, storeProviderSecret } from './providerSecrets';
import { upsertConversation, upsertMessage, ingestInboundMessage } from './conversations';

const DEFAULT_SCOPES = [
  'ZohoMail.accounts.READ',
  'ZohoMail.folders.READ',
  'ZohoMail.messages.READ',
  'ZohoMail.messages.CREATE',
  'openid',
  'profile',
  'email',
].join(',');

function accountsBase(): string {
  return String(getConfig('ZOHO_ACCOUNTS_BASE') || 'https://accounts.zoho.com').replace(/\/+$/, '');
}

function apiBase(): string {
  return String(getConfig('ZOHO_MAIL_API_BASE') || 'https://mail.zoho.com/api').replace(/\/+$/, '');
}

function requiredConfig(key: string): string {
  const value = getConfig(key);
  if (!value || value === '__SET_IN_ADMIN__') throw new ProviderConfigurationError(`${key} is not configured`);
  return value;
}

function sanitizedHttpError(response: { status: number }, fallback: string): Error {
  const err: any = new Error(`${fallback} (HTTP ${response.status})`);
  err.status = response.status;
  return err; // Intentionally do not echo response bodies — they can echo tokens.
}

/** Build the Zoho accounts OAuth authorize URL (no secrets in the URL). */
export function buildZohoAuthorizeUrl(input: { state: string; scopes?: string; redirectUri?: string }): string {
  const clientId = requiredConfig('ZOHO_CLIENT_ID');
  const redirectUri = input.redirectUri || requiredConfig('ZOHO_REDIRECT_URI');
  const params = new URLSearchParams({
    scope: input.scopes || DEFAULT_SCOPES,
    client_id: clientId,
    response_type: 'code',
    access_type: 'offline',
    redirect_uri: redirectUri,
    state: input.state,
    prompt: 'consent',
  });
  return `${accountsBase()}/oauth/v2/auth?${params.toString()}`;
}

async function requestToken(params: Record<string, string>) {
  const body = new URLSearchParams({
    client_id: requiredConfig('ZOHO_CLIENT_ID'),
    client_secret: requiredConfig('ZOHO_CLIENT_SECRET'),
    ...params,
  });
  const response = await fetch(`${accountsBase()}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json: any = await response.json().catch(() => ({}));
  if (!response.ok || !json?.access_token) throw sanitizedHttpError(response, 'Zoho token request failed');
  return json as { access_token: string; refresh_token?: string; expires_in?: number; scope?: string; token_type?: string };
}

/** Exchange an authorization code and persist the refresh/access tokens encrypted. */
export async function exchangeZohoCode(prisma: Db, input: { connectionId: string; code: string; actorId?: string | null }) {
  if (!input.code) throw new ProviderConfigurationError('Zoho authorization code is missing');
  const connection = await prisma.orm.public.ProviderConnection.where({ id: input.connectionId } as any).first().catch(() => null) as any;
  if (!connection) throw new ProviderConfigurationError('Provider connection not found');
  const redirectUri = connection.config?.zohoRedirectUri ? String(connection.config.zohoRedirectUri) : requiredConfig('ZOHO_REDIRECT_URI');
  const token = await requestToken({
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: redirectUri,
  });
  await storeProviderSecret(prisma, { connectionId: connection.id, kind: 'ACCESS_TOKEN', value: token.access_token, actorId: input.actorId });
  if (token.refresh_token) {
    await storeProviderSecret(prisma, { connectionId: connection.id, kind: 'OAUTH_REFRESH', value: token.refresh_token, actorId: input.actorId });
  }
  await prisma.orm.public.ProviderConnection.where({ id: connection.id }).update({
    status: 'CONNECTED', lastError: null, updatedAt: ts(),
    config: { ...(connection.config ?? {}), zohoScope: token.scope ?? null } as any,
  } as any).then(() => undefined, () => undefined);
  // Only non-secret metadata is returned to the API layer.
  return { scope: token.scope ?? null, expiresIn: token.expires_in ?? null, hasRefreshToken: Boolean(token.refresh_token) };
}

/** Refresh the access token from the encrypted refresh token. */
export async function refreshZohoAccessToken(prisma: Db, connectionId: string, actorId?: string | null): Promise<string> {
  const refreshToken = await readProviderSecret(prisma, connectionId, 'OAUTH_REFRESH');
  if (!refreshToken && getConfig('ZOHO_REFRESH_TOKEN')) {
    const fallback = getConfig('ZOHO_REFRESH_TOKEN');
    await storeProviderSecret(prisma, { connectionId, kind: 'OAUTH_REFRESH', value: fallback, actorId });
  }
  const tokenToUse = refreshToken || getConfig('ZOHO_REFRESH_TOKEN');
  if (!tokenToUse) throw new ProviderConfigurationError('Zoho refresh token is not configured for this connection');
  const token = await requestToken({ grant_type: 'refresh_token', refresh_token: tokenToUse });
  await storeProviderSecret(prisma, { connectionId, kind: 'ACCESS_TOKEN', value: token.access_token, actorId });
  if (token.refresh_token) {
    await storeProviderSecret(prisma, { connectionId, kind: 'OAUTH_REFRESH', value: token.refresh_token, actorId });
  }
  await prisma.orm.public.ProviderConnection.where({ id: connectionId }).update({ status: 'CONNECTED', lastError: null, updatedAt: ts() } as any).then(() => undefined, () => undefined);
  return token.access_token;
}

export async function getZohoAccessToken(prisma: Db, connectionId: string, actorId?: string | null): Promise<string> {
  const stored = await readProviderSecret(prisma, connectionId, 'ACCESS_TOKEN');
  if (stored) return stored;
  return refreshZohoAccessToken(prisma, connectionId, actorId);
}

async function resolveAccount(prisma: Db, input: { connectionId?: string; accountId?: string }) {
  const account = input.accountId
    ? await prisma.orm.public.CommunicationAccount.where({ id: input.accountId } as any).first().catch(() => null) as any
    : await prisma.orm.public.CommunicationAccount.where({ connectionId: input.connectionId } as any).first().catch(() => null) as any;
  if (!account) throw new ProviderConfigurationError('Zoho mail account not found');
  const connectionId = String(input.connectionId || account.connectionId);
  const connection = await prisma.orm.public.ProviderConnection.where({ id: connectionId } as any).first().catch(() => null) as any;
  if (!connection) throw new ProviderConfigurationError('Zoho provider connection not found');
  return { account, connection, connectionId };
}

function resolveMailUserId(account: any, connection: any): string {
  const id = account?.externalId || connection?.externalAccountId || getConfig('ZOHO_MAIL_USER_ID');
  if (!id) throw new ProviderConfigurationError('Zoho mail account id is not configured (ZOHO_MAIL_USER_ID)');
  return String(id);
}

function asAddressList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).map((v) => String(v).trim()).filter(Boolean);
}

/** Send a message through the official Zoho Mail API. */
export async function sendMail(prisma: Db, input: {
  connectionId?: string;
  accountId?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body: string;
  html?: string;
  from?: string;
  actorId?: string | null;
  inReplyTo?: string;
}) {
  assertCapability('ZOHO_MAIL', 'respond');
  const to = asAddressList(input.to);
  if (!to.length) throw new ProviderConfigurationError('At least one recipient is required');
  const { account, connection, connectionId } = await resolveAccount(prisma, input);
  const mailUserId = resolveMailUserId(account, connection);
  const token = await getZohoAccessToken(prisma, connectionId, input.actorId);
  const payload: Record<string, unknown> = {
    fromAddress: input.from || account.address || getConfig('EMAIL_FROM') || getConfig('ZOHO_MAIL_DOMAIN'),
    toAddress: to.join(','),
    ccAddress: asAddressList(input.cc).join(','),
    bccAddress: asAddressList(input.bcc).join(','),
    subject: input.subject,
    content: input.html || `<p>${String(input.body).replace(/[<>]/g, (c) => (c === '<' ? '&lt;' : '&gt;')).replace(/\n/g, '<br/>')}</p>`,
    mailFormat: 'html',
  };
  if (input.inReplyTo) payload.inReplyTo = input.inReplyTo;
  const response = await fetch(`${apiBase()}/api/accounts/${encodeURIComponent(mailUserId)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Zoho-oauthtoken ${token}` },
    body: JSON.stringify(payload),
  });
  const json: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    await prisma.orm.public.CommunicationAccount.where({ id: account.id }).update({ lastError: `send failed (HTTP ${response.status})`, updatedAt: ts() } as any).then(() => undefined, () => undefined);
    throw sanitizedHttpError(response, 'Zoho Mail send failed');
  }
  await prisma.orm.public.CommunicationAccount.where({ id: account.id }).update({ lastSyncAt: ts(), lastError: null, updatedAt: ts() } as any).then(() => undefined, () => undefined);
  return { id: json?.data?.messageId ?? json?.messageId ?? null, status: json?.status ?? 'SUCCESS' };
}

type ZohoMessage = Record<string, any>;

async function zohoFetchJson(url: string, token: string): Promise<any> {
  const response = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}`, Accept: 'application/json' } });
  if (!response.ok) throw sanitizedHttpError(response, 'Zoho Mail API request failed');
  return response.json().catch(() => ({}));
}

function normalizeZohoMessage(message: ZohoMessage) {
  const receivedAt = message.receivedTime || message.date || message.sentTime || null;
  return {
    providerMessageId: String(message.messageId ?? message.id ?? ''),
    threadId: String(message.threadId ?? message.conversationId ?? message.messageId ?? message.id ?? ''),
    subject: String(message.subject ?? '(no subject)'),
    from: String(message.fromAddress ?? message.senderAddress ?? ''),
    to: String(message.toAddress ?? ''),
    body: String(message.content ?? message.summary ?? ''),
    timestamp: receivedAt ? (tsMs(receivedAt) ? new Date(tsMs(receivedAt)).toISOString() : null) : null,
    folderId: message.folderId ? String(message.folderId) : null,
    hasAttachment: Boolean(message.hasAttachment || message.attachment?.length),
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
  };
}

/**
 * Poll folders/messages and materialize the mailbox in the unified model.
 * Idempotent on provider message id, thread id and sync cursor.
 */
export async function syncMailbox(prisma: Db, connectionId: string, input: { accountId?: string; limit?: number; actorId?: string | null } = {}) {
  assertCapability('ZOHO_MAIL', 'sync_inbox');
  const { account, connection } = await resolveAccount(prisma, { connectionId, accountId: input.accountId });
  const mailUserId = resolveMailUserId(account, connection);
  const token = await getZohoAccessToken(prisma, connectionId, input.actorId);
  const limit = Math.min(Math.max(Number(input.limit) || 50, 1), 200);

  let folders: any[] = [];
  try {
    const folderJson = await zohoFetchJson(`${apiBase()}/api/accounts/${encodeURIComponent(mailUserId)}/folders`, token);
    folders = Array.isArray(folderJson?.data) ? folderJson.data.slice(0, 10) : [];
  } catch (err) {
    const message = err instanceof Error ? err.message : 'folder fetch failed';
    await prisma.orm.public.CommunicationAccount.where({ id: account.id }).update({ lastError: message, updatedAt: ts() } as any).then(() => undefined, () => undefined);
    throw err;
  }

  let synced = 0;
  for (const folder of folders) {
    const folderId = String(folder.folderId ?? folder.id ?? '');
    if (!folderId) continue;
    await prisma.orm.public.EmailFolder.create({
      id: newId(), accountId: account.id, name: String(folder.folderName ?? folder.name ?? folderId),
      externalId: folderId, unreadCount: Number(folder.unreadCount ?? 0), createdAt: ts(), updatedAt: ts(),
    } as any).catch(async () => {
      const existing = await prisma.orm.public.EmailFolder.where({ accountId: account.id, name: String(folder.folderName ?? folder.name ?? folderId) } as any).first().catch(() => null) as any;
      if (existing) {
        await prisma.orm.public.EmailFolder.where({ id: existing.id }).update({
          externalId: folderId, unreadCount: Number(folder.unreadCount ?? 0), updatedAt: ts(),
        } as any).then(() => undefined, () => undefined);
      }
    });

    const resourceType = `zoho-mail:${folderId}`;
    const cursorRow = await prisma.orm.public.ExternalSyncCursor
      .where({ connectionId, resourceType } as any).first().catch(() => null) as any;
    try {
      const url = `${apiBase()}/api/accounts/${encodeURIComponent(mailUserId)}/messages/folders/${encodeURIComponent(folderId)}/view?limit=${limit}`;
      const json = await zohoFetchJson(url, token);
      const messages: ZohoMessage[] = Array.isArray(json?.data) ? json.data : [];
      let newestCursor = cursorRow?.cursor ?? null;

      for (const raw of messages) {
        const message = normalizeZohoMessage(raw);
        if (!message.providerMessageId) continue;
        const conversation = await upsertConversation(prisma, {
          accountId: account.id,
          channel: 'EMAIL',
          externalThreadId: `email:${message.threadId}`,
          subject: message.subject,
          sentAt: message.timestamp,
          preview: message.body.slice(0, 200),
        });
        const emailThread = await prisma.orm.public.EmailThread
          .where({ accountId: account.id, externalThreadId: message.threadId } as any).first().catch(() => null) as any;
        if (!emailThread) {
          await prisma.orm.public.EmailThread.create({
            id: newId(), accountId: account.id, externalThreadId: message.threadId,
            subject: message.subject, lastMessageAt: message.timestamp ? ts(message.timestamp) : ts(), createdAt: ts(),
          } as any).then(() => undefined, () => undefined);
        } else {
          await prisma.orm.public.EmailThread.where({ id: emailThread.id }).update({
            lastMessageAt: message.timestamp ? ts(message.timestamp) : ts(),
          } as any).then(() => undefined, () => undefined);
        }
        const { message: stored, created } = await upsertMessage(prisma, {
          conversationId: conversation.id,
          providerMessageId: message.providerMessageId,
          direction: 'INBOUND',
          senderType: 'CONTACT',
          senderAddress: message.from,
          bodyText: message.body,
          bodyRich: { type: 'email', raw } as any,
          deliveryStatus: 'RECEIVED',
          sentAt: message.timestamp,
          receivedAt: message.timestamp,
          metadata: { folderId, to: message.to, threadId: message.threadId } as any,
        });
        if (created) {
          for (const attachment of message.attachments) {
            await prisma.orm.public.EmailAttachment.create({
              id: newId(), messageId: stored.id,
              filename: String(attachment.name ?? attachment.fileName ?? 'attachment'),
              mimeType: attachment.mimeType ? String(attachment.mimeType) : null,
              size: Number(attachment.size ?? 0),
              storageKey: attachment.attachmentId ? String(attachment.attachmentId) : null,
              createdAt: ts(),
            } as any).then(() => undefined, () => undefined);
          }
          synced += 1;
        }
        if (!newestCursor || (message.timestamp && tsMs(message.timestamp) > tsMs(newestCursor))) {
          newestCursor = message.timestamp || message.providerMessageId;
        }
      }
      const now = ts();
      if (cursorRow) {
        await prisma.orm.public.ExternalSyncCursor.where({ id: cursorRow.id }).update({
          cursor: newestCursor, lastSuccessAt: now, lastError: null, updatedAt: now,
        } as any).then(() => undefined, () => undefined);
      } else {
        await prisma.orm.public.ExternalSyncCursor.create({
          id: newId(), connectionId, resourceType, cursor: newestCursor,
          lastSuccessAt: now, lastError: null, metadata: { accountId: account.id } as any,
          createdAt: now, updatedAt: now,
        } as any).then(() => undefined, () => undefined);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'message sync failed';
      await prisma.orm.public.ExternalSyncCursor.where({ connectionId, resourceType }).updateAll({ lastError: message, updatedAt: ts() } as any).then(() => undefined, () => undefined);
      await prisma.orm.public.CommunicationAccount.where({ id: account.id }).update({ lastError: message, updatedAt: ts() } as any).then(() => undefined, () => undefined);
      throw err;
    }
  }

  await prisma.orm.public.ProviderConnection.where({ id: connectionId }).update({
    lastSyncAt: ts(), lastError: null, status: 'CONNECTED', updatedAt: ts(),
  } as any).then(() => undefined, () => undefined);
  await prisma.orm.public.CommunicationAccount.where({ id: account.id }).update({
    lastSyncAt: ts(), lastError: null, updatedAt: ts(),
  } as any).then(() => undefined, () => undefined);
  return { folders: folders.length, messages: synced };
}

/** Convenience used by the webhook processor for email-shaped events. */
export async function ingestZohoMessageEvent(prisma: Db, accountId: string, raw: ZohoMessage) {
  const message = normalizeZohoMessage(raw);
  const account = await prisma.orm.public.CommunicationAccount.where({ id: accountId } as any).first().catch(() => null) as any;
  return ingestInboundMessage(prisma, {
    accountId, channel: 'EMAIL', externalThreadId: `email:${message.threadId}`,
    providerMessageId: message.providerMessageId, sentAt: message.timestamp, subject: message.subject,
    bodyText: message.body, senderAddress: message.from,
    contact: message.from ? { identity: { channel: 'EMAIL', value: message.from } } : undefined,
  }).then((result) => ({ ...result, account }));
}
