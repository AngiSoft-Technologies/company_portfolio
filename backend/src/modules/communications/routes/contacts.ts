import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { upsertContact } from '../services/conversations';

const identitySchema = z.object({ channel: z.string().min(1), value: z.string().min(1), externalId: z.string().optional().nullable() });

const contactSchema = z.object({
  name: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  identities: z.array(identitySchema).optional(),
});

export default function communicationsContactsRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', requireAccess('communications.inbox.view', ['ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const search = req.query.q ? String(req.query.q).toLowerCase() : undefined;
    let contacts = await prisma.orm.public.Contact
      .orderBy((c: any) => c.updatedAt.desc()).limit(limit * 2)
      .include('identities').all().then((rows: any[]) => rows, () => [] as any[]) as any[];
    if (search) {
      contacts = contacts.filter((contact: any) =>
        String(contact.name ?? '').toLowerCase().includes(search)
        || String(contact.company ?? '').toLowerCase().includes(search)
        || (contact.identities ?? []).some((i: any) => String(i.value).toLowerCase().includes(search)));
    }
    res.json({ contacts: contacts.slice(0, limit) });
  });

  router.post('/', requireAccess('communications.inbox.respond', ['ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const body = contactSchema.parse(req.body);
    const identities = body.identities ?? [];
    const contact = await upsertContact(prisma, {
      ...body,
      identity: identities[0] ? { ...identities[0] } : null,
    });
    for (const identity of identities.slice(1)) {
      await prisma.orm.public.ContactIdentity.create({
        id: newId(), contactId: contact.id, channel: identity.channel, value: identity.value,
        externalId: identity.externalId ?? identity.value, createdAt: ts(),
      } as any).then(() => undefined, () => undefined);
    }
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any,
      action: 'communications.contact.create', entity: 'Contact', entityId: contact.id,
      meta: { channels: identities.map((i) => i.channel) },
    });
    res.status(201).json({ contact: await prisma.orm.public.Contact.where({ id: contact.id }).include('identities').first() });
  });

  router.patch('/:id', requireAccess('communications.inbox.respond', ['ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const body = contactSchema.omit({ identities: true }).partial().refine((v) => Object.keys(v).length > 0).parse(req.body);
    const existing = await prisma.orm.public.Contact.where({ id: req.params.id } as any).first().catch(() => null) as any;
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const patch: Record<string, unknown> = { updatedAt: ts() };
    for (const key of ['name', 'company', 'notes', 'clientId', 'leadId', 'employeeId'] as const) {
      if (key in body) patch[key] = (body as any)[key] ?? null;
    }
    const contact = await prisma.orm.public.Contact.where({ id: existing.id }).update(patch as any);
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any,
      action: 'communications.contact.update', entity: 'Contact', entityId: existing.id,
      meta: { fields: Object.keys(patch) },
    });
    res.json({ contact });
  });

  return router;
}
