/**
 * Provider-neutral outbound reply dispatcher used by both inbox and workflow
 * routes. Every branch first passes the capability matrix, account-scoped
 * grant checks and the WhatsApp window/template rules.
 */

import type { Db } from '../../../db';
import { logAudit } from '../../../shared/services/audit';
import { getConfig } from '../../../shared/services/runtimeConfig';
import { assertCapability, ProviderCapabilityError } from './capabilities';
import { assertAccountAccess } from './access';
import { readProviderSecret, ProviderConfigurationError } from './providerSecrets';
import {
  assertOutboundAllowed,
  ConversationRuleError,
  recordOutboundMessage,
  addConversationParticipant,
} from './conversations';
import { sendWhatsAppTemplate, sendWhatsAppText } from './whatsappCloud';
import { sendMail as sendZohoMail } from './zohoMail';
import { sendText as sendTelegramText } from './telegram';
import { sendMetaComment, sendMetaMessage, type MetaNetwork } from './metaSocial';
import type { OutboundInput } from './conversations';

export type ReplyInput = OutboundInput & {
  /** Optional public comment id when replying to a Facebook/Instagram comment. */
  objectId?: string;
};

function identityValue(conversation: any, channel: string): string | null {
  const identities = conversation?.contact?.identities;
  if (Array.isArray(identities)) {
    const match = identities.find((i: any) => String(i.channel).toUpperCase() === channel.toUpperCase());
    if (match?.value) return String(match.value);
  }
  const thread = String(conversation?.externalThreadId ?? '');
  const prefixes: Record<string, string> = {
    WHATSAPP: 'wa:', TELEGRAM: 'tg:', EMAIL: 'email:', META_FACEBOOK: 'meta_facebook:', META_INSTAGRAM: 'meta_instagram:',
  };
  const prefix = prefixes[channel];
  return prefix && thread.startsWith(prefix) ? thread.slice(prefix.length) : null;
}

/**
 * Validate and send a reply on any supported channel. Records the outbound
 * message idempotently only after the provider accepts the send.
 */
export async function sendConversationReply(prisma: Db, input: {
  conversationId: string;
  user: { sub?: string; role?: string } | undefined;
  reply: ReplyInput;
}) {
  const conversation = await prisma.orm.public.Conversation
    .where({ id: input.conversationId } as any)
    .include('account', (a: any) => a.include('connection'))
    .include('contact', (c: any) => c.include('identities'))
    .first().catch(() => null) as any;
  if (!conversation) throw new ConversationRuleError('Conversation not found', 'NOT_FOUND');
  await assertAccountAccess(prisma, input.user, String(conversation.accountId), 'respond');
  const policy = await assertOutboundAllowed(prisma, conversation, input.reply);
  const { provider, account, connection } = policy;
  const body = String(input.reply.body ?? '').trim();
  const sendAsTemplate = policy.useTemplate;

  let result: any = null;
  let providerMessageId: string | null = null;
  let storedBody = body || `[template:${input.reply.templateName}]`;

  if (provider === 'WHATSAPP_META') {
    const to = identityValue(conversation, 'WHATSAPP');
    const phoneNumberId = account.externalId || connection.externalAccountId;
    const token = await readProviderSecret(prisma, connection.id, 'ACCESS_TOKEN')
      || await readProviderSecret(prisma, connection.id, 'API_KEY')
      || getConfig('WHATSAPP_ACCESS_TOKEN')
      || null;
    if (!to || !phoneNumberId || !token) {
      throw new ProviderConfigurationError('Missing WhatsApp recipient, phoneNumberId or access token');
    }
    result = sendAsTemplate
      ? await sendWhatsAppTemplate({
        accessToken: token, phoneNumberId, to,
        name: String(input.reply.templateName), languageCode: input.reply.templateLanguage ?? 'en',
        components: [],
      })
      : await sendWhatsAppText({ accessToken: token, phoneNumberId, to, body });
    providerMessageId = result?.messages?.[0]?.id ?? null;
  } else if (provider === 'ZOHO_MAIL') {
    const to = identityValue(conversation, 'EMAIL');
    if (!to) throw new ProviderConfigurationError('No EMAIL identity is known for this conversation');
    result = await sendZohoMail(prisma, {
      connectionId: connection.id, accountId: account.id, to,
      subject: String(conversation.subject ?? 'Reply'),
      body, html: input.reply.body ? `<p>${input.reply.body.replace(/\n/g, '<br/>')}</p>` : undefined,
      from: account.address ?? undefined,
      actorId: input.user?.sub,
    });
    providerMessageId = result?.id ?? null;
  } else if (provider === 'TELEGRAM') {
    const chatId = identityValue(conversation, 'TELEGRAM');
    if (!chatId) throw new ProviderConfigurationError('No Telegram chat id is known for this conversation');
    result = await sendTelegramText(prisma, {
      connectionId: connection.id, accountId: account.id, chatId, text: body, actorId: input.user?.sub,
    });
    providerMessageId = result?.messageId ?? null;
  } else if (provider === 'META_FACEBOOK' || provider === 'META_INSTAGRAM') {
    const recipientId = identityValue(conversation, provider);
    if (!recipientId) throw new ProviderConfigurationError(`No ${provider} identity is known for this conversation`);
    const metadata: any = conversation.metadata ?? {};
    if (metadata.kind === 'comment' && input.reply.objectId) {
      result = await sendMetaComment(prisma, {
        network: provider as MetaNetwork, connectionId: connection.id, objectId: input.reply.objectId, text: body,
      });
      providerMessageId = result?.commentId ?? null;
    } else {
      result = await sendMetaMessage(prisma, {
        network: provider as MetaNetwork, connectionId: connection.id, recipientId, text: body, actorId: input.user?.sub,
      });
      providerMessageId = result?.messageId ?? null;
    }
  } else {
    // Unknown/unsupported providers never reach a network call.
    assertCapability(provider, 'respond');
    throw new ProviderCapabilityError(provider, 'respond');
  }

  const message = await recordOutboundMessage(prisma, {
    conversationId: conversation.id, account, actorId: input.user?.sub,
    bodyText: storedBody, providerMessageId, templateName: input.reply.templateName ?? null, result,
  });
  if (input.user?.sub) {
    await addConversationParticipant(prisma, conversation.id, input.user.sub, 'RESPONDER');
  }
  await logAudit({
    actorId: input.user?.sub, actorRole: input.user?.role as any,
    action: `communications.${provider.toLowerCase()}.send`,
    entity: 'Conversation', entityId: conversation.id,
    meta: {
      accountId: account.id, channel: conversation.channel,
      templateName: input.reply.templateName ?? null,
      providerMessageId, recipientRedacted: true,
    },
  });
  return { message, result, provider };
}

/** Approved templates for the compose picker (only actions the provider supports). */
export async function listApprovedTemplates(prisma: Db, opts: { channel?: string; provider?: string } = {}) {
  const templates = await prisma.orm.public.CommunicationTemplate
    .orderBy((t: any) => t.updatedAt.desc()).limit(200).all().then((rows: any[]) => rows, () => [] as any[]) as any[];
  return templates.filter((template) => {
    if (String(template.status ?? '').toUpperCase() !== 'APPROVED') return false;
    if (opts.channel && String(template.channel).toUpperCase() !== String(opts.channel).toUpperCase()) return false;
    if (opts.provider && template.provider && String(template.provider).toUpperCase() !== String(opts.provider).toUpperCase()) return false;
    return true;
  });
}

export async function listConversationParticipants(prisma: Db, conversationId: string) {
  return prisma.orm.public.ConversationParticipant
    .where({ conversationId } as any).all().then((rows: any[]) => rows, () => [] as any[]) as Promise<any[]>;
}

export async function setConversationParticipant(prisma: Db, input: {
  conversationId: string; employeeId: string; role?: string; actorId?: string | null;
}) {
  const role = input.role ?? 'WATCHER';
  await addConversationParticipant(prisma, input.conversationId, input.employeeId, role, input.actorId);
  await logAudit({
    actorId: input.actorId ?? null, action: 'communications.conversation.participant.set',
    entity: 'Conversation', entityId: input.conversationId,
    meta: { employeeId: input.employeeId, role },
  });
  return listConversationParticipants(prisma, input.conversationId);
}
