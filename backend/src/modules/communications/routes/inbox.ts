import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { canAccessAccount, assertAccountAccess } from '../services/access';
import { sendConversationReply } from '../services/outbound';
import { listConversationParticipants, listApprovedTemplates } from '../services/outbound';
import { AccountAccessError } from '../services/access';
import { ConversationRuleError } from '../services/conversations';
import { ProviderCapabilityError } from '../services/capabilities';
import { ProviderConfigurationError } from '../services/providerSecrets';

const sendSchema = z.object({
  body: z.string().max(20000).optional(),
  templateName: z.string().optional(),
  templateLanguage: z.string().optional(),
  templateComponents: z.array(z.any()).optional(),
  objectId: z.string().optional(),
}).refine((value) => Boolean(value.body?.trim() || value.templateName), { message: 'body or templateName is required' });

export default function communicationsInboxRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/conversations', requireAccess('communications.inbox.view', ['ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const channel = req.query.channel ? String(req.query.channel) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const accountId = req.query.accountId ? String(req.query.accountId) : undefined;
    let query = prisma.orm.public.Conversation.orderBy((c: any) => c.lastMessageAt.desc());
    if (channel) query = query.where((c: any) => c.channel.eq(channel));
    if (status) query = query.where((c: any) => c.status.eq(status));
    if (accountId) query = query.where((c: any) => c.accountId.eq(accountId));
    const all = await query.limit(limit * 4)
      .include('contact')
      .include('account', (a: any) => a.select('id', 'name', 'channel', 'provider', 'address'))
      .include('assignee', (a: any) => a.select('id', 'firstName', 'lastName', 'email'))
      .all().then((rows: any[]) => rows, () => [] as any[]) as any[];
    const filtered: any[] = [];
    for (const conversation of all) {
      // Strict account grants — no global role/permission fallback.
      if (!(await canAccessAccount(prisma, req.user, String(conversation.accountId), 'read'))) continue;
      filtered.push(conversation);
      if (filtered.length >= limit) break;
    }
    res.json({ conversations: filtered });
  });

  router.get('/conversations/:id', requireAccess('communications.inbox.view', ['ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const conversation = await prisma.orm.public.Conversation.where({ id: req.params.id } as any)
      .include('account', (a: any) => a.select('id', 'name', 'channel', 'provider', 'address'))
      .include('contact', (c: any) => c.include('identities'))
      .first().catch(() => null) as any;
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    if (!(await canAccessAccount(prisma, req.user, String(conversation.accountId), 'read'))) return res.status(403).json({ error: 'Not authorized' });
    res.json({ conversation });
  });

  router.get('/conversations/:id/messages', requireAccess('communications.inbox.view', ['ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const conversation = await prisma.orm.public.Conversation.where({ id: req.params.id } as any).first().catch(() => null) as any;
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    if (!(await canAccessAccount(prisma, req.user, String(conversation.accountId), 'read'))) return res.status(403).json({ error: 'Not authorized' });
    const messages = await prisma.orm.public.ConversationMessage
      .where({ conversationId: req.params.id } as any)
      .orderBy((m: any) => m.createdAt.asc())
      .limit(300).all().then((rows: any[]) => rows, () => [] as any[]) as any[];
    res.json({ messages });
  });

  router.get('/conversations/:id/participants', requireAccess('communications.inbox.view', ['ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const conversation = await prisma.orm.public.Conversation.where({ id: req.params.id } as any).first().catch(() => null) as any;
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    if (!(await canAccessAccount(prisma, req.user, String(conversation.accountId), 'read'))) return res.status(403).json({ error: 'Not authorized' });
    res.json({ participants: await listConversationParticipants(prisma, conversation.id) });
  });

  /** Compose template picker — only approved templates for supported channels. */
  router.get('/templates', requireAccess('communications.inbox.view', ['ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const templates = await listApprovedTemplates(prisma, {
      channel: req.query.channel ? String(req.query.channel) : undefined,
      provider: req.query.provider ? String(req.query.provider) : undefined,
    });
    res.json({ templates });
  });

  router.post('/conversations/:id/send', requireAccess('communications.inbox.respond', ['ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const input = sendSchema.parse(req.body);
    try {
      const conversation = await prisma.orm.public.Conversation.where({ id: req.params.id } as any).first().catch(() => null) as any;
      if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
      await assertAccountAccess(prisma, req.user, String(conversation.accountId), 'respond');
      const result = await sendConversationReply(prisma, {
        conversationId: conversation.id, user: req.user,
        reply: {
          body: input.body,
          templateName: input.templateName,
          templateLanguage: input.templateLanguage,
          objectId: input.objectId,
        },
      });
      return res.status(201).json(result);
    } catch (err) {
      if (err instanceof AccountAccessError) return res.status(403).json({ error: err.message });
      if (err instanceof ConversationRuleError) {
        return res.status(err.code === 'NOT_FOUND' ? 404 : 409).json({ error: err.message, code: err.code });
      }
      if (err instanceof ProviderCapabilityError) return res.status(400).json({ error: err.message, code: 'CAPABILITY_DISABLED' });
      if (err instanceof ProviderConfigurationError) return res.status(400).json({ error: err.message, code: 'NOT_CONFIGURED' });
      throw err;
    }
  });

  return router;
}
