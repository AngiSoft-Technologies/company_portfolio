import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { getProviderCapabilities, ProviderCapabilityError } from '../services/capabilities';

const templateStatus = z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ARCHIVED']);

const templateSchema = z.object({
  channel: z.string().min(1),
  provider: z.string().optional().nullable(),
  name: z.string().min(1),
  language: z.string().optional().nullable(),
  status: templateStatus.optional(),
  externalId: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  variables: z.any().optional(),
  metadata: z.any().optional(),
});

const patchSchema = templateSchema.partial().refine((value) => Object.keys(value).length > 0, { message: 'No fields to update' });

export default function communicationsTemplatesRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', requireAccess('communications.templates.manage', ['ADMIN', 'SUPER_ADMIN', 'MANAGER']), async (req, res) => {
    const channel = req.query.channel ? String(req.query.channel) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    let templates = await prisma.orm.public.CommunicationTemplate
      .orderBy((t: any) => t.updatedAt.desc()).limit(300).all().then((rows: any[]) => rows, () => [] as any[]) as any[];
    if (channel) templates = templates.filter((t) => String(t.channel).toUpperCase() === channel.toUpperCase());
    if (status) templates = templates.filter((t) => String(t.status).toUpperCase() === status.toUpperCase());
    res.json({ templates });
  });

  router.post('/', requireAccess('communications.templates.manage', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const body = templateSchema.parse(req.body);
    // New templates can only be drafts; approval is a separate, audited action.
    if (body.status && !['DRAFT', 'PENDING_APPROVAL'].includes(body.status)) {
      return res.status(400).json({ error: 'Create templates as DRAFT or PENDING_APPROVAL; approval is a separate action' });
    }
    const template = await prisma.orm.public.CommunicationTemplate.create({
      id: newId(), channel: body.channel, provider: body.provider ?? null, name: body.name,
      language: body.language ?? 'en', status: body.status ?? 'DRAFT', externalId: body.externalId ?? null,
      body: body.body ?? null, variables: (body.variables ?? null) as any, metadata: (body.metadata ?? null) as any,
      createdById: req.user?.sub ?? null, createdAt: ts(), updatedAt: ts(),
    } as any);
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any,
      action: 'communications.template.create', entity: 'CommunicationTemplate', entityId: template.id,
      meta: { channel: template.channel, name: template.name, status: template.status },
    });
    res.status(201).json({ template });
  });

  router.patch('/:id', requireAccess('communications.templates.manage', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const body = patchSchema.parse(req.body);
    const existing = await prisma.orm.public.CommunicationTemplate.where({ id: req.params.id } as any).first().catch(() => null) as any;
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (body.status && !['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ARCHIVED'].includes(body.status)) {
      return res.status(400).json({ error: 'Unsupported template status' });
    }
    if (body.status && body.status !== existing.status) {
      // Providers that cannot manage templates (e.g. Meta templates are
      // approved in Business Manager) must never be locally marked APPROVED.
      const provider = body.provider ?? existing.provider;
      if (body.status === 'APPROVED' && provider && !getProviderCapabilities(provider).manage_templates) {
        throw new ProviderCapabilityError(String(provider), 'manage_templates');
      }
      if (['APPROVED', 'REJECTED', 'ARCHIVED'].includes(body.status) && req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only ADMIN/SUPER_ADMIN may change template approval state' });
      }
    }
    const patch: Record<string, unknown> = { updatedAt: ts() };
    for (const key of ['channel', 'provider', 'name', 'language', 'status', 'externalId', 'body', 'variables', 'metadata'] as const) {
      if (key in body) patch[key] = key === 'variables' || key === 'metadata' ? ((body as any)[key] ?? null) as any : (body as any)[key] ?? null;
    }
    const template = await prisma.orm.public.CommunicationTemplate.where({ id: existing.id }).update(patch as any);
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any,
      action: 'communications.template.update', entity: 'CommunicationTemplate', entityId: existing.id,
      meta: { fields: Object.keys(patch), status: (template as any)?.status ?? existing.status },
    });
    res.json({ template });
  });

  router.delete('/:id', requireAccess('communications.templates.manage', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const existing = await prisma.orm.public.CommunicationTemplate.where({ id: req.params.id } as any).first().catch(() => null) as any;
    if (!existing) return res.status(404).json({ error: 'Not found' });
    // Outbound template sends require APPROVED rows; hard-delete approved
    // templates is blocked so history/audit stays meaningful.
    if (String(existing.status).toUpperCase() === 'APPROVED') {
      await prisma.orm.public.CommunicationTemplate.where({ id: existing.id }).update({ status: 'ARCHIVED', updatedAt: ts() } as any);
      await logAudit({
        actorId: req.user?.sub, actorRole: req.user?.role as any,
        action: 'communications.template.archive', entity: 'CommunicationTemplate', entityId: existing.id,
        meta: { name: existing.name },
      });
      return res.json({ ok: true, archived: true });
    }
    await prisma.orm.public.CommunicationTemplate.where({ id: existing.id }).delete();
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any,
      action: 'communications.template.delete', entity: 'CommunicationTemplate', entityId: existing.id,
      meta: { name: existing.name },
    });
    res.json({ ok: true });
  });

  return router;
}
