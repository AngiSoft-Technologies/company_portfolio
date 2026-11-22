import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess, isRole } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { decryptSecret } from '../../../shared/services/secrets';
import { sendWhatsAppTemplate, sendWhatsAppText } from '../services/whatsappCloud';
import { has as hasPermission } from '../../identity/services/effectivePermissions';

async function canAccessAccount(prisma: Db, user: { sub?: string; role?: string } | undefined, accountId: string, scope: string) {
  if (!user?.sub) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  if (isRole({ user } as any, ['ADMIN'])) return true;
  const grant = await prisma.orm.public.CommunicationGrant.where({ accountId, employeeId: user.sub } as any).first().catch(() => null);
  if (grant && Array.isArray((grant as any).scopes) && (grant as any).scopes.includes(scope)) return true;
  return hasPermission({ employeeId: user.sub, systemRole: user.role }, scope === 'respond' ? 'communications.inbox.respond' : 'communications.inbox.view');
}

async function getSecret(prisma: Db, connectionId: string, kind: string) {
  const row = await prisma.orm.public.ProviderSecret.where({ connectionId, kind } as any).orderBy((s: any) => s.createdAt.desc()).first();
  if (!row) return null;
  return decryptSecret({ ciphertext: row.ciphertext, iv: row.iv, authTag: row.authTag, keyVersion: row.keyVersion });
}

const sendSchema = z.object({
  body: z.string().min(1).max(4096).optional(),
  templateName: z.string().optional(),
  templateLanguage: z.string().optional(),
  templateComponents: z.array(z.any()).optional(),
}).refine((v) => Boolean(v.body || v.templateName), { message: 'body or templateName is required' });

export default function communicationsInboxRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/conversations', requireAccess('communications.inbox.view', 'ADMIN', 'MANAGER', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const all = await prisma.orm.public.Conversation
      .orderBy((c: any) => c.lastMessageAt.desc())
      .limit(limit * 3)
      .include('contact')
      .include('account')
      .include('assignee', (a: any) => a.select('id', 'firstName', 'lastName', 'email'))
      .all();
    const filtered: any[] = [];
    for (const c of all as any[]) {
      if (await canAccessAccount(prisma, req.user, c.accountId, 'view')) filtered.push(c);
      if (filtered.length >= limit) break;
    }
    res.json({ conversations: filtered });
  });

  router.get('/conversations/:id/messages', requireAccess('communications.inbox.view', 'ADMIN', 'MANAGER', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
    const convo = await prisma.orm.public.Conversation.where({ id: req.params.id } as any).first();
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    if (!(await canAccessAccount(prisma, req.user, (convo as any).accountId, 'view'))) return res.status(403).json({ error: 'Not authorized' });
    const messages = await prisma.orm.public.ConversationMessage
      .where({ conversationId: req.params.id } as any)
      .orderBy((m: any) => m.createdAt.asc())
      .limit(200)
      .all();
    res.json({ messages });
  });

  router.post('/conversations/:id/send', requireAccess('communications.inbox.respond', 'ADMIN', 'MANAGER', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
    const input = sendSchema.parse(req.body);
    const convo = await prisma.orm.public.Conversation.where({ id: req.params.id } as any).include('account', (a: any) => a.include('connection')).include('contact', (c: any) => c.include('identities')).first();
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    if (!(await canAccessAccount(prisma, req.user, (convo as any).accountId, 'respond'))) return res.status(403).json({ error: 'Not authorized' });

    const account: any = (convo as any).account;
    const connection: any = account?.connection;
    if (account?.channel !== 'WHATSAPP' || connection?.provider !== 'WHATSAPP_META') {
      return res.status(400).json({ error: 'Outbound send currently supported for WhatsApp connections only' });
    }

    const to = (convo as any)?.contact?.identities?.find((i: any) => i.channel === 'WHATSAPP')?.value;
    const phoneNumberId = account.externalId || connection?.externalAccountId;
    const accessToken = await getSecret(prisma, connection.id, 'ACCESS_TOKEN') || await getSecret(prisma, connection.id, 'API_KEY');
    if (!to || !phoneNumberId || !accessToken) {
      return res.status(400).json({ error: 'Missing WhatsApp recipient, phoneNumberId, or ACCESS_TOKEN/API_KEY secret on connection' });
    }

    const result = input.templateName
      ? await sendWhatsAppTemplate({ accessToken, phoneNumberId, to, name: input.templateName, languageCode: input.templateLanguage, components: input.templateComponents })
      : await sendWhatsAppText({ accessToken, phoneNumberId, to, body: input.body! });
    const now = ts();
    const bodyText = input.templateName ? `[template:${input.templateName}]` : input.body!;
    const message = await prisma.orm.public.ConversationMessage.create({
      id: newId(), conversationId: convo.id, providerMessageId: result?.messages?.[0]?.id ?? null,
      direction: 'OUTBOUND', senderType: 'EMPLOYEE', senderId: req.user?.sub ?? null,
      senderAddress: account.address ?? null, bodyText, bodyRich: { type: input.templateName ? 'template' : 'text', templateName: input.templateName } as any,
      deliveryStatus: 'SENT', sentAt: now, createdAt: now, metadata: { providerResult: result } as any,
    } as any);
    await prisma.orm.public.Conversation.where({ id: convo.id }).update({ lastMessageAt: now, lastMessagePreview: bodyText, updatedAt: now } as any);
    await logAudit({ actorId: req.user?.sub, actorRole: req.user?.role as any, action: 'communications.whatsapp.send', entity: 'Conversation', entityId: convo.id, meta: { to, templateName: input.templateName ?? null } });
    res.status(201).json({ message, result });
  });

  return router;
}
