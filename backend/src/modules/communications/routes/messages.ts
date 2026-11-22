import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';

const assignSchema = z.object({ assigneeId: z.string().nullable() });
const statusSchema = z.object({ status: z.enum(['OPEN','PENDING','CLOSED','SPAM']) });

export default function communicationsWorkflowRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.post('/conversations/:id/assign', requireAccess('communications.inbox.assign', ['ADMIN', 'SUPER_ADMIN', 'MANAGER']), async (req: AuthRequest, res) => {
    const body = assignSchema.parse(req.body);
    const convo = await prisma.orm.public.Conversation.where({ id: req.params.id } as any).first();
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    const updated = await prisma.orm.public.Conversation.where({ id: convo.id }).update({ assigneeId: body.assigneeId, updatedAt: ts() } as any);
    await logAudit({ actorId: req.user?.sub, actorRole: req.user?.role as any, action: 'communications.conversation.assign', entity: 'Conversation', entityId: convo.id, meta: { assigneeId: body.assigneeId } });
    res.json({ conversation: updated });
  });

  router.post('/conversations/:id/status', requireAccess('communications.inbox.respond', ['ADMIN', 'SUPER_ADMIN', 'MANAGER']), async (req: AuthRequest, res) => {
    const body = statusSchema.parse(req.body);
    const convo = await prisma.orm.public.Conversation.where({ id: req.params.id } as any).first();
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    const updated = await prisma.orm.public.Conversation.where({ id: convo.id }).update({ status: body.status, updatedAt: ts() } as any);
    await logAudit({ actorId: req.user?.sub, actorRole: req.user?.role as any, action: 'communications.conversation.status', entity: 'Conversation', entityId: convo.id, meta: { status: body.status } });
    res.json({ conversation: updated });
  });

  router.post('/conversations/:id/note', requireAccess('communications.inbox.respond', ['ADMIN', 'SUPER_ADMIN', 'MANAGER']), async (req: AuthRequest, res) => {
    const body = z.object({ body: z.string().min(1) }).parse(req.body);
    const convo = await prisma.orm.public.Conversation.where({ id: req.params.id } as any).first();
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    const note = await prisma.orm.public.ConversationMessage.create({
      id: newId(), conversationId: convo.id, direction: 'INTERNAL', senderType: 'EMPLOYEE', senderId: req.user?.sub ?? null,
      bodyText: body.body, deliveryStatus: 'INTERNAL', createdAt: ts(), sentAt: ts(),
    } as any);
    await prisma.orm.public.Conversation.where({ id: convo.id }).update({ lastMessageAt: ts(), lastMessagePreview: `[note] ${body.body.slice(0,120)}`, updatedAt: ts() } as any);
    await logAudit({ actorId: req.user?.sub, actorRole: req.user?.role as any, action: 'communications.conversation.note', entity: 'ConversationMessage', entityId: note.id, meta: { conversationId: convo.id } });
    res.status(201).json({ message: note });
  });

  return router;
}
