/**
 * Shared unified-inbox primitives used by every communications adapter.
 *
 * All writes are idempotent (provider message id / account+thread id keys) so
 * webhook retries and queue replays cannot create duplicate contacts or
 * messages. Outbound sends are never performed here — this module only
 * validates policy and records results produced by the provider adapters.
 */

import type { Db } from '../../../db';
import { newId, ts, tsMs } from '../../../prisma/db';
import { getConfig } from '../../../shared/services/runtimeConfig';
import { logAudit } from '../../../shared/services/audit';
import { assertCapability, type CapabilityAction } from './capabilities';
import { createNotification } from '../../notifications/services/notifications';
import * as aiProvider from '../../ai/services/aiProvider';

export class ConversationRuleError extends Error {
  readonly code: string;
  constructor(message: string, code = 'RULE_VIOLATION') {
    super(message);
    this.name = 'ConversationRuleError';
    this.code = code;
  }
}

function positiveConfigNumber(key: string, fallback: number): number {
  const parsed = Number(getConfig(key, String(fallback)));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// ─── Window / SLA calculation ─────────────────────────────────────────────

/** WhatsApp's 24-hour customer-service window starts at the last inbound message. */
export function computeWindowExpiresAt(channel: string, sentAt?: string | null): string | null {
  if (String(channel).toUpperCase() !== 'WHATSAPP') return null;
  const hours = positiveConfigNumber('COMMUNICATIONS_WHATSAPP_WINDOW_HOURS', 24);
  const base = sentAt ? tsMs(sentAt) : Date.now();
  return ts((base || Date.now()) + hours * 3600_000);
}

export function isWindowOpen(conversation: any, now = Date.now()): boolean {
  if (String(conversation?.channel ?? '').toUpperCase() !== 'WHATSAPP') return true;
  if (!conversation?.windowExpiresAt) return false;
  return tsMs(conversation.windowExpiresAt) > now;
}

/** SLA comes from the first enabled routing rule with an `sla` action, else config. */
export async function computeSlaDue(prisma: Db, channel: string, receivedAt?: string | null): Promise<string> {
  const rules = await prisma.orm.public.RoutingRule
    .where((r: any) => r.enabled.eq(true))
    .orderBy((r: any) => r.priority.asc())
    .limit(50)
    .all()
    .then((rows: any[]) => rows, () => [] as any[]) as any[];
  let minutes = positiveConfigNumber('COMMUNICATIONS_SLA_RESPONSE_MINUTES', 60);
  for (const rule of rules) {
    const conditions: any = rule.conditions ?? {};
    if (conditions?.channel && String(conditions.channel).toUpperCase() !== String(channel).toUpperCase()) continue;
    const actionMinutes = Number((rule.actions as any)?.sla);
    if (Number.isFinite(actionMinutes) && actionMinutes > 0) {
      minutes = actionMinutes;
      break;
    }
  }
  const base = receivedAt ? tsMs(receivedAt) : Date.now();
  return ts((base || Date.now()) + minutes * 60_000);
}

// ─── Idempotent contact / conversation / message upserts ──────────────────

export type UpsertContactInput = {
  name?: string | null;
  company?: string | null;
  notes?: string | null;
  clientId?: string | null;
  leadId?: string | null;
  employeeId?: string | null;
  identity?: {
    channel: string;
    value: string;
    externalId?: string | null;
    metadata?: unknown;
  } | null;
};

export async function upsertContact(prisma: Db, input: UpsertContactInput): Promise<any> {
  const identity = input.identity;
  let existingIdentity: any = null;
  if (identity?.value) {
    existingIdentity = await prisma.orm.public.ContactIdentity
      .where({ channel: identity.channel, value: identity.value } as any)
      .first()
      .catch(() => null) as any;
  }
  if (existingIdentity) {
    const contact = await prisma.orm.public.Contact.where({ id: existingIdentity.contactId } as any).first().catch(() => null) as any;
    const linkPatch: Record<string, unknown> = {};
    for (const key of ['clientId', 'leadId', 'employeeId'] as const) {
      if (input[key] && !contact?.[key]) linkPatch[key] = input[key];
    }
    if ((input.name && !contact?.name) || (input.company && !contact?.company)) {
      if (input.name && !contact?.name) linkPatch.name = input.name;
      if (input.company && !contact?.company) linkPatch.company = input.company;
    }
    if (Object.keys(linkPatch).length) {
      await prisma.orm.public.Contact.where({ id: existingIdentity.contactId }).update({ ...linkPatch, updatedAt: ts() } as any).then(() => undefined, () => undefined);
    }
    return prisma.orm.public.Contact.where({ id: existingIdentity.contactId }).first() as Promise<any>;
  }

  let contact: any = null;
  const linkKeys = ['clientId', 'leadId', 'employeeId'] as const;
  for (const key of linkKeys) {
    if (!input[key]) continue;
    contact = await prisma.orm.public.Contact.where({ [key]: input[key] } as any).first().catch(() => null) as any;
    if (contact) break;
  }
  if (!contact) {
    contact = await prisma.orm.public.Contact.create({
      id: newId(),
      name: input.name ?? null,
      company: input.company ?? null,
      notes: input.notes ?? null,
      clientId: input.clientId ?? null,
      leadId: input.leadId ?? null,
      employeeId: input.employeeId ?? null,
      createdAt: ts(),
      updatedAt: ts(),
    } as any);
  }
  if (identity?.value) {
    try {
      await prisma.orm.public.ContactIdentity.create({
        id: newId(),
        contactId: contact.id,
        channel: identity.channel,
        value: identity.value,
        externalId: identity.externalId ?? identity.value,
        metadata: (identity.metadata ?? null) as any,
        createdAt: ts(),
      } as any);
    } catch {
      // Concurrent webhook created the identity first; reuse it.
      const raced = await prisma.orm.public.ContactIdentity
        .where({ channel: identity.channel, value: identity.value } as any).first().catch(() => null) as any;
      if (raced?.contactId && raced.contactId !== contact.id) contact = await prisma.orm.public.Contact.where({ id: raced.contactId }).first() as any;
    }
  }
  return contact;
}

export type UpsertConversationInput = {
  accountId: string;
  channel: string;
  externalThreadId: string;
  contactId?: string | null;
  subject?: string | null;
  sentAt?: string | null;
  preview?: string | null;
  metadata?: unknown;
  priority?: string;
  status?: string;
};

export async function upsertConversation(prisma: Db, input: UpsertConversationInput): Promise<any> {
  const existing = await prisma.orm.public.Conversation
    .where({ accountId: input.accountId, externalThreadId: input.externalThreadId } as any)
    .first()
    .catch(() => null) as any;
  const now = ts();
  if (existing) {
    const patch: Record<string, unknown> = {
      lastMessageAt: input.sentAt ? ts(input.sentAt) : now,
      lastMessagePreview: (input.preview ?? '').slice(0, 240),
      updatedAt: now,
    };
    // Every inbound WhatsApp message restarts the 24h free-form window.
    if (String(input.channel).toUpperCase() === 'WHATSAPP') patch.windowExpiresAt = computeWindowExpiresAt(input.channel, input.sentAt);
    if (input.contactId && !existing.contactId) patch.contactId = input.contactId;
    if (input.subject && !existing.subject) patch.subject = input.subject;
    if (input.status) patch.status = input.status;
    if (!existing.slaDueAt) patch.slaDueAt = await computeSlaDue(prisma, input.channel, input.sentAt);
    const updated = await prisma.orm.public.Conversation.where({ id: existing.id }).update(patch as any).catch(() => null) as any;
    return updated ?? existing;
  }
  return prisma.orm.public.Conversation.create({
    id: newId(),
    accountId: input.accountId,
    contactId: input.contactId ?? null,
    channel: input.channel,
    externalThreadId: input.externalThreadId,
    subject: input.subject ?? null,
    status: input.status ?? 'OPEN',
    priority: input.priority ?? 'NORMAL',
    lastMessageAt: input.sentAt ? ts(input.sentAt) : now,
    lastMessagePreview: (input.preview ?? '').slice(0, 240),
    windowExpiresAt: computeWindowExpiresAt(input.channel, input.sentAt),
    slaDueAt: await computeSlaDue(prisma, input.channel, input.sentAt),
    metadata: (input.metadata ?? null) as any,
    createdAt: now,
    updatedAt: now,
  } as any);
}

export type UpsertMessageInput = {
  conversationId: string;
  providerMessageId?: string | null;
  dedupeKey?: string | null;
  direction?: 'INBOUND' | 'OUTBOUND' | 'INTERNAL';
  senderType?: string;
  senderId?: string | null;
  senderAddress?: string | null;
  bodyText?: string | null;
  bodyRich?: unknown;
  attachments?: unknown;
  deliveryStatus?: string;
  sentAt?: string | null;
  receivedAt?: string | null;
  metadata?: unknown;
};

export async function upsertMessage(prisma: Db, input: UpsertMessageInput): Promise<{ message: any; created: boolean }> {
  const externalId = input.providerMessageId ?? (input.dedupeKey ? `local:${input.dedupeKey}` : null);
  if (externalId) {
    const existing = await prisma.orm.public.ConversationMessage
      .where({ providerMessageId: externalId } as any).first().catch(() => null) as any;
    if (existing) return { message: existing, created: false };
  }
  const now = ts();
  const message = await prisma.orm.public.ConversationMessage.create({
    id: newId(),
    conversationId: input.conversationId,
    providerMessageId: externalId,
    direction: input.direction ?? 'INBOUND',
    senderType: input.senderType ?? 'CONTACT',
    senderId: input.senderId ?? null,
    senderAddress: input.senderAddress ?? null,
    bodyText: input.bodyText ?? null,
    bodyRich: (input.bodyRich ?? null) as any,
    attachments: (input.attachments ?? null) as any,
    deliveryStatus: input.deliveryStatus ?? 'RECEIVED',
    sentAt: input.sentAt ? ts(input.sentAt) : now,
    receivedAt: input.receivedAt ? ts(input.receivedAt) : now,
    metadata: (input.metadata ?? null) as any,
    createdAt: now,
  } as any);
  return { message, created: true };
}

export type InboundMessageInput = {
  accountId: string;
  channel: string;
  externalThreadId: string;
  providerMessageId?: string | null;
  sentAt?: string | null;
  subject?: string | null;
  preview?: string | null;
  bodyText?: string | null;
  bodyRich?: unknown;
  attachments?: unknown;
  senderAddress?: string | null;
  contact?: UpsertContactInput;
  metadata?: unknown;
  runRouting?: boolean;
};

/** Full idempotent inbound pipeline, including routing and participants. */
export async function ingestInboundMessage(prisma: Db, input: InboundMessageInput) {
  const contact = input.contact ? await upsertContact(prisma, input.contact) : null;
  const conversation = await upsertConversation(prisma, {
    accountId: input.accountId,
    channel: input.channel,
    externalThreadId: input.externalThreadId,
    contactId: contact?.id ?? null,
    subject: input.subject,
    sentAt: input.sentAt,
    preview: input.preview ?? input.bodyText,
    metadata: input.metadata,
  });
  const { message, created } = await upsertMessage(prisma, {
    conversationId: conversation.id,
    providerMessageId: input.providerMessageId,
    dedupeKey: `${input.channel}:${input.accountId}:${input.externalThreadId}:${input.providerMessageId ?? ''}`,
    direction: 'INBOUND',
    senderType: 'CONTACT',
    senderId: contact?.id ?? null,
    senderAddress: input.senderAddress ?? null,
    bodyText: input.bodyText ?? null,
    bodyRich: input.bodyRich,
    attachments: input.attachments,
    deliveryStatus: 'RECEIVED',
    sentAt: input.sentAt,
    receivedAt: ts(),
    metadata: input.metadata,
  });
  const routing = created && input.runRouting !== false
    ? await applyRoutingRules(prisma, conversation, message, contact)
    : [];
  return { contact, conversation, message, created, routing };
}

// ─── Participants / routing rules ─────────────────────────────────────────

export async function addConversationParticipant(
  prisma: Db,
  conversationId: string,
  employeeId: string,
  role = 'WATCHER',
  actorId?: string | null,
): Promise<void> {
  const existing = await prisma.orm.public.ConversationParticipant
    .where({ conversationId, employeeId } as any).first().catch(() => null) as any;
  if (existing) {
    if (existing.role !== role) {
      await prisma.orm.public.ConversationParticipant.where({ id: existing.id }).update({ role } as any).then(() => undefined, () => undefined);
    }
    return;
  }
  await prisma.orm.public.ConversationParticipant.create({
    id: newId(), conversationId, employeeId, role, createdAt: ts(),
  } as any).then(() => undefined, () => undefined);
  if (actorId) {
    await logAudit({
      actorId, action: 'communications.conversation.participant.add', entity: 'ConversationParticipant',
      entityId: conversationId, meta: { employeeId, role },
    });
  }
}

export async function applyRoutingRules(prisma: Db, conversation: any, message: any, contact?: any): Promise<any[]> {
  const rules = await prisma.orm.public.RoutingRule
    .where((r: any) => r.enabled.eq(true))
    .orderBy((r: any) => r.priority.asc())
    .limit(50)
    .all()
    .then((rows: any[]) => rows, () => [] as any[]) as any[];
  const metadata: any = conversation.metadata && typeof conversation.metadata === 'object' ? { ...conversation.metadata } : {};
  const applied: string[] = Array.isArray(metadata.routingApplied) ? metadata.routingApplied : [];
  const tags: string[] = Array.isArray(metadata.tags) ? metadata.tags : [];
  const results: any[] = [];
  let patch: Record<string, unknown> = {};

  for (const rule of rules) {
    if (applied.includes(rule.id)) continue;
    const conditions: any = rule.conditions ?? {};
    if (conditions.channel && String(conditions.channel).toUpperCase() !== String(conversation.channel).toUpperCase()) continue;
    if (conditions.priority && String(conditions.priority).toUpperCase() !== String(conversation.priority ?? '').toUpperCase()) continue;
    if (conditions.from && String(message?.senderAddress ?? '') !== String(conditions.from)) continue;
    if (Array.isArray(conditions.keywords) && conditions.keywords.length) {
      const haystack = String(message?.bodyText ?? '').toLowerCase();
      if (!conditions.keywords.some((k: unknown) => haystack.includes(String(k).toLowerCase()))) continue;
    }

    const actions: any = rule.actions ?? {};
    if (actions.assign) {
      patch.assigneeId = actions.assign;
      await addConversationParticipant(prisma, conversation.id, String(actions.assign), 'ASSIGNEE');
    }
    if (actions.tag && !tags.includes(String(actions.tag))) tags.push(String(actions.tag));
    if (Number(actions.sla) > 0) patch.slaDueAt = ts(Date.now() + Number(actions.sla) * 60_000);
    if (Array.isArray(actions.notify)) {
      for (const employeeId of actions.notify) {
        if (!employeeId) continue;
        await addConversationParticipant(prisma, conversation.id, String(employeeId), 'WATCHER');
        await createNotification(
          String(employeeId), 'communications.routing.notify', 'New conversation routed to you',
          `Conversation on ${conversation.channel} matched rule "${rule.name}"`,
          '/admin/communications/inbox', { conversationId: conversation.id, ruleId: rule.id },
        ).then(() => undefined, () => undefined);
      }
    }
    if (actions.create_lead && contact?.id) {
      const identity = await prisma.orm.public.ContactIdentity
        .where({ contactId: contact.id } as any).first().catch(() => null) as any;
      const email = String(identity?.value ?? '');
      const existingLead = email
        ? await prisma.orm.public.Lead.where((l: any) => l.email.eq(email)).first().catch(() => null) as any
        : null;
      if (!existingLead && email) {
        await prisma.orm.public.Lead.create({
          id: newId(),
          name: String(contact.name ?? 'Communication lead'),
          email,
          phone: null,
          source: `communication:${conversation.channel}`,
          status: 'new',
          notes: `Created by routing rule ${rule.name}`,
          createdAt: ts(), updatedAt: ts(),
        } as any).then(() => undefined, () => undefined);
      }
    }
    if (actions.create_ticket) {
      const existingTicket = await prisma.orm.public.SupportTicket
        .where((t: any) => t.subject.eq(`Conversation ${conversation.id}`))
        .first().catch(() => null) as any;
      if (!existingTicket) {
        await prisma.orm.public.SupportTicket.create({
          id: newId(),
          clientId: contact?.clientId ?? null,
          subject: `Conversation ${conversation.id}`,
          body: String(message?.bodyText ?? '').slice(0, 4000) || '(no message body)',
          status: 'open', priority: 'normal',
          assignedToId: actions.assign ?? null,
          createdAt: ts(), updatedAt: ts(),
        } as any).then(() => undefined, () => undefined);
      }
    }
    applied.push(rule.id);
    results.push({ ruleId: rule.id, name: rule.name, actions });
  }

  if (results.length) {
    metadata.routingApplied = applied;
    if (tags.length) metadata.tags = tags;
    patch.metadata = metadata as any;
    patch.updatedAt = ts();
    await prisma.orm.public.Conversation.where({ id: conversation.id }).update(patch as any).then(() => undefined, () => undefined);
    for (const result of results) {
      await logAudit({
        action: 'communications.routing.applied', entity: 'Conversation', entityId: conversation.id,
        meta: { ruleId: result.ruleId, ruleName: result.name, actions: result.actions },
      });
    }
  }
  return results;
}

// ─── Outbound policy checks ───────────────────────────────────────────────

export type OutboundInput = {
  body?: string | null;
  templateName?: string | null;
  templateLanguage?: string | null;
};

/**
 * Enforce capability + WhatsApp 24h/template rules before any provider call.
 * Templates must exist locally with APPROVED status (or be an externally
 * approved template mirrored with status APPROVED).
 */
export async function assertOutboundAllowed(prisma: Db, conversation: any, input: OutboundInput): Promise<{ provider: string; account: any; connection: any; useTemplate: boolean }> {
  const account = await prisma.orm.public.CommunicationAccount
    .where({ id: conversation.accountId } as any)
    .include('connection')
    .first().catch(() => null) as any;
  if (!account?.connection) throw new ConversationRuleError('Conversation account/connection not found', 'NOT_FOUND');
  const provider = String(account.provider || account.connection.provider || '');
  assertCapability(provider, 'respond' as CapabilityAction);

  const useTemplate = Boolean(input.templateName);
  if (useTemplate) assertCapability(provider, 'send_template');
  if (!useTemplate && !(input.body ?? '').trim()) {
    throw new ConversationRuleError('A message body or templateName is required', 'MISSING_CONTENT');
  }

  if (String(conversation.channel).toUpperCase() === 'WHATSAPP' && !isWindowOpen(conversation)) {
    if (!useTemplate) {
      throw new ConversationRuleError(
        'WhatsApp 24-hour service window has closed. Use an approved template.',
        'WINDOW_CLOSED',
      );
    }
    const template = await prisma.orm.public.CommunicationTemplate
      .where((t: any) => t.name.eq(String(input.templateName)))
      .first().catch(() => null) as any;
    if (!template || String(template.status ?? '').toUpperCase() !== 'APPROVED') {
      throw new ConversationRuleError('An approved WhatsApp template is required outside the 24-hour window', 'TEMPLATE_NOT_APPROVED');
    }
  }
  return { provider, account, connection: account.connection, useTemplate };
}

/** Record a successfully delivered outbound message and refresh conversation state. */
export async function recordOutboundMessage(prisma: Db, input: {
  conversationId: string;
  account: any;
  actorId?: string | null;
  bodyText: string;
  providerMessageId?: string | null;
  templateName?: string | null;
  result?: unknown;
}): Promise<any> {
  const now = ts();
  const message = await prisma.orm.public.ConversationMessage.create({
    id: newId(),
    conversationId: input.conversationId,
    providerMessageId: input.providerMessageId ?? null,
    direction: 'OUTBOUND',
    senderType: 'EMPLOYEE',
    senderId: input.actorId ?? null,
    senderAddress: input.account?.address ?? null,
    bodyText: input.bodyText,
    bodyRich: ({ type: input.templateName ? 'template' : 'text', templateName: input.templateName ?? null } as any),
    deliveryStatus: 'SENT',
    sentAt: now,
    createdAt: now,
    metadata: (input.result ? { providerResult: input.result } : null) as any,
  } as any);
  await prisma.orm.public.Conversation.where({ id: input.conversationId }).update({
    lastMessageAt: now, lastMessagePreview: input.bodyText.slice(0, 240), updatedAt: now,
  } as any).then(() => undefined, () => undefined);
  if (input.actorId) {
    await addConversationParticipant(prisma, input.conversationId, input.actorId, 'RESPONDER');
  }
  return message;
}

// ─── Assistive AI drafts (never auto-send) ────────────────────────────────

export async function generateAiDraft(prisma: Db, conversationId: string, actorId?: string | null): Promise<{ draft: string; messageId: string; model: string }> {
  if (getConfig('COMMUNICATIONS_AI_DRAFTS_ENABLED', 'true') !== 'true') {
    throw new ConversationRuleError('AI drafts are disabled', 'AI_DISABLED');
  }
  const conversation = await prisma.orm.public.Conversation.where({ id: conversationId } as any).first().catch(() => null) as any;
  if (!conversation) throw new ConversationRuleError('Conversation not found', 'NOT_FOUND');
  const messages = await prisma.orm.public.ConversationMessage
    .where({ conversationId } as any).orderBy((m: any) => m.createdAt.asc()).limit(20).all().then((rows: any[]) => rows, () => [] as any[]) as any[];
  const config = await aiProvider.loadAIConfig(prisma);
  if (!config.config.enabled || !config.config.apiKey) {
    throw new ConversationRuleError('AI assistant is not configured', 'AI_NOT_CONFIGURED');
  }
  const transcript = messages.map((m) => `${m.direction}: ${String(m.bodyText ?? '').slice(0, 1000)}`).join('\n');
  const draft = await aiProvider.aiComplete(config.config, [
    {
      role: 'system',
      content: 'You draft customer replies for a software agency. Produce one concise, professional reply only. Never claim an action was taken, never include credentials, and never attempt to send the message. The human operator reviews and sends it.',
    },
    { role: 'user', content: `Channel: ${conversation.channel}\nSubject: ${conversation.subject ?? '(none)'}\n\nRecent transcript:\n${transcript || '(no messages)'}` },
  ], { maxTokens: 500, temperature: 0.3 });

  const now = ts();
  const message = await prisma.orm.public.ConversationMessage.create({
    id: newId(), conversationId, direction: 'INTERNAL', senderType: 'AI', senderId: null,
    bodyText: draft.slice(0, 6000), deliveryStatus: 'DRAFT', sentAt: now, createdAt: now,
    metadata: { aiAssisted: true, autoSent: false, model: config.config.model, requestedBy: actorId ?? null } as any,
  } as any);
  await logAudit({
    actorId: actorId ?? null, action: 'communications.inbox.ai_draft', entity: 'ConversationMessage', entityId: message.id,
    meta: { conversationId, assistive: true, autoSent: false, model: config.config.model },
  });
  return { draft: draft.slice(0, 6000), messageId: message.id, model: config.config.model };
}
