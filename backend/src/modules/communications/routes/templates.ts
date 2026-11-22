import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';

const templateSchema = z.object({
  channel: z.string().min(1),
  provider: z.string().optional().nullable(),
  name: z.string().min(1),
  language: z.string().optional().nullable(),
  status: z.string().optional(),
  externalId: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  variables: z.any().optional(),
  metadata: z.any().optional(),
});

export default function communicationsTemplatesRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);
  router.get('/', requireAccess('communications.templates.manage', 'ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (_req, res) => {
    const templates = await prisma.orm.public.CommunicationTemplate.orderBy((t: any) => t.updatedAt.desc()).limit(200).all().catch(() => []);
    res.json({ templates });
  });
  router.post('/', requireAccess('communications.templates.manage', 'ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
    const body = templateSchema.parse(req.body);
    const template = await prisma.orm.public.CommunicationTemplate.create({
      id: newId(), channel: body.channel, provider: body.provider ?? null, name: body.name,
      language: body.language ?? 'en', status: body.status ?? 'DRAFT', externalId: body.externalId ?? null,
      body: body.body ?? null, variables: (body.variables ?? null) as any, metadata: (body.metadata ?? null) as any,
      createdById: req.user?.sub ?? null, createdAt: ts(), updatedAt: ts(),
    } as any);
    await logAudit({ actorId: req.user?.sub, actorRole: req.user?.role as any, action: 'communications.template.create', entity: 'CommunicationTemplate', entityId: template.id, meta: { channel: template.channel, name: template.name } });
    res.status(201).json({ template });
  });
  return router;
}
