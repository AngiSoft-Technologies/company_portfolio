import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { assertAccountAccess, canAccessAccount, AccountAccessError } from '../services/access';
import { sendConversationReply, listApprovedTemplates, setConversationParticipant } from '../services/outbound';
import {
  generateAiDraft,
  ConversationRuleError,
} from '../services/conversations';
import { generateSocialReplyDraft } from '../services/metaCapabilities';
import { ProviderCapabilityError } from '../services/capabilities';
import { ProviderConfigurationError } from '../services/providerSecrets';

const assignSchema = z.object({ assigneeId: z.string().nullable() });
const statusSchema = z.object({ status: z.enum(['OPEN', 'PENDING', 'CLOSED', 'SPAM']) });
const sendSchema = z.object({
  body: z.string().max(20000).optional(),
  templateName: z.string().optional(),
  templateLanguage: z.string().optional(),
  objectId: z.string().optional(),
}).refine((value) => Boolean(value.body?.trim() || value.templateName), { message: 'body or templateName is required' });

export default function communicationsWorkflowRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.post('/conversations/:id/assign', requireAccess('communications.inbox.assign', ['ADMIN', 'SUPER_ADMIN', 'MANAGER']), async (req: AuthRequest, res) => {
    const body = assignSchema.parse(req.body);
    const conversation = await prisma.orm.public.Conversation.where({ id: req.params.id } as any).first().catch(() => null) as any;
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    try {
      await assertAccountAccess(prisma, req.user, String(conversation.accountId), 'respond');
    } catch {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const updated = await prisma.orm.public.Conversation.where({ id: conversation.id }).update({ assigneeId: body.assigneeId, updatedAt: ts() } as any);
    if (body.assigneeId) {
      await setConversationParticipant(prisma, {
        conversationId: conversation.id, employeeId: body.assigneeId, role: 'ASSIGNEE', actorId: req.user?.sub,
      }).then(() => undefined, () => undefined);
    }
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any,
      action: 'communications.conversation.assign', entity: 'Conversation', entityId: conversation.id,
      meta: { assigneeId: body.assigneeId },
    });
    res.json({ conversation: updated });
  });

  router.post('/conversations/:id/status', requireAccess('communications.inbox.respond', ['ADMIN', 'SUPER_ADMIN', 'MANAGER']), async (req: AuthRequest, res) => {
    const body = statusSchema.parse(req.body);
    const conversation = await prisma.orm.public.Conversation.where({ id: req.params.id } as any).first().catch(() => null) as any;
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    try {
      await assertAccountAccess(prisma, req.user, String(conversation.accountId), 'respond');
    } catch {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const updated = await prisma.orm.public.Conversation.where({ id: conversation.id }).update({ status: body.status, updatedAt: ts() } as any);
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any,
      action: 'communications.conversation.status', entity: 'Conversation', entityId: conversation.id,
      meta: { status: body.status },
    });
    res.json({ conversation: updated });
  });

  router.post('/conversations/:id/note', requireAccess('communications.inbox.respond', ['ADMIN', 'SUPER_ADMIN', 'MANAGER']), async (req: AuthRequest, res) => {
    const body = z.object({ body: z.string().min(1) }).parse(req.body);
    const conversation = await prisma.orm.public.Conversation.where({ id: req.params.id } as any).first().catch(() => null) as any;
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    try {
      await assertAccountAccess(prisma, req.user, String(conversation.accountId), 'respond');
    } catch {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const note = await prisma.orm.public.ConversationMessage.create({
      id: newId(), conversationId: conversation.id,
      direction: 'INTERNAL', senderType: 'EMPLOYEE', senderId: req.user?.sub ?? null,
      bodyText: body.body, deliveryStatus: 'INTERNAL', createdAt: ts(), sentAt: ts(),
    } as any);
    await prisma.orm.public.Conversation.where({ id: conversation.id }).update({
      lastMessageAt: ts(), lastMessagePreview: `[note] ${body.body.slice(0, 120)}`, updatedAt: ts(),
    } as any);
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any,
      action: 'communications.conversation.note', entity: 'ConversationMessage', entityId: note.id,
      meta: { conversationId: conversation.id },
    });
    res.status(201).json({ message: note });
  });

  /** Add/update an internal participant (watcher/assignee/responder). */
  router.post('/conversations/:id/participants', requireAccess('communications.inbox.assign', ['ADMIN', 'SUPER_ADMIN', 'MANAGER']), async (req: AuthRequest, res) => {
    const body = z.object({ employeeId: z.string().min(1), role: z.enum(['ASSIGNEE', 'WATCHER', 'RESPONDER']).default('WATCHER') }).parse(req.body);
    const conversation = await prisma.orm.public.Conversation.where({ id: req.params.id } as any).first().catch(() => null) as any;
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    try {
      await assertAccountAccess(prisma, req.user, String(conversation.accountId), 'respond');
    } catch {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const participants = await setConversationParticipant(prisma, {
      conversationId: conversation.id, employeeId: body.employeeId, role: body.role, actorId: req.user?.sub,
    });
    res.json({ participants });
  });

  /** Assistive draft only — never sends, always audited. */
  router.post('/conversations/:id/ai-draft', requireAccess('communications.inbox.respond', ['ADMIN', 'SUPER_ADMIN', 'MANAGER']), async (req: AuthRequest, res) => {
    const conversation = await prisma.orm.public.Conversation.where({ id: req.params.id } as any).first().catch(() => null) as any;
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    if (!(await canAccessAccount(prisma, req.user, String(conversation.accountId), 'respond'))) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    try {
      const result = await generateAiDraft(prisma, conversation.id, req.user?.sub);
      return res.json(result);
    } catch (err) {
      if (err instanceof ConversationRuleError) {
        return res.status(err.code === 'NOT_FOUND' ? 404 : 409).json({ error: err.message, code: err.code });
      }
      throw err;
    }
  });

  /** Assistive social reply draft (Meta channels only); never auto-sends. */
  router.post('/conversations/:id/social-draft', requireAccess('communications.inbox.respond', ['ADMIN', 'SUPER_ADMIN', 'MANAGER']), async (req: AuthRequest, res) => {
    const conversation = await prisma.orm.public.Conversation.where({ id: req.params.id } as any).first().catch(() => null) as any;
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    if (!(await canAccessAccount(prisma, req.user, String(conversation.accountId), 'respond'))) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    try {
      const result = await generateSocialReplyDraft(prisma, conversation.id, req.user?.sub);
      return res.json({ ...result, autoSent: false });
    } catch (err) {
      if (err instanceof ProviderCapabilityError) return res.status(400).json({ error: err.message, code: 'CAPABILITY_DISABLED' });
      if (err instanceof ConversationRuleError) return res.status(409).json({ error: err.message, code: err.code });
      throw err;
    }
  });

  /** Same provider-neutral send used by the inbox, available on workflow routes. */
  router.post('/conversations/:id/send', requireAccess('communications.inbox.respond', ['ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const input = sendSchema.parse(req.body);
    try {
      const result = await sendConversationReply(prisma, {
        conversationId: req.params.id, user: req.user,
        reply: { body: input.body, templateName: input.templateName, templateLanguage: input.templateLanguage, objectId: input.objectId },
      });
      return res.status(201).json(result);
    } catch (err) {
      if (err instanceof AccountAccessError) return res.status(403).json({ error: 'Not authorized' });
      if (err instanceof ConversationRuleError && err.code === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      if (err instanceof ConversationRuleError) return res.status(409).json({ error: err.message, code: err.code });
      if (err instanceof ProviderCapabilityError) return res.status(400).json({ error: err.message, code: 'CAPABILITY_DISABLED' });
      if (err instanceof ProviderConfigurationError) return res.status(400).json({ error: err.message, code: 'NOT_CONFIGURED' });
      throw err;
    }
  });

  router.get('/templates', requireAccess('communications.inbox.view', ['ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req, res) => {
    const templates = await listApprovedTemplates(prisma, {
      channel: req.query.channel ? String(req.query.channel) : undefined,
      provider: req.query.provider ? String(req.query.provider) : undefined,
    });
    res.json({ templates });
  });

  return router;
}
