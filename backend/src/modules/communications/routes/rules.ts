import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';

const actionSchema = z.object({
  assign: z.string().optional(),
  tag: z.string().optional(),
  sla: z.number().int().positive().optional(),
  notify: z.array(z.string()).optional(),
  create_lead: z.boolean().optional(),
  create_ticket: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'At least one routing action is required' });

const conditionSchema = z.object({
  channel: z.string().optional(),
  priority: z.string().optional(),
  from: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});

const ruleSchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).max(100000).default(100),
  channel: z.string().optional().nullable(),
  conditions: conditionSchema.optional().nullable(),
  actions: actionSchema,
});

export default function communicationsRulesRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', requireAccess('communications.inbox.view', ['ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (_req, res) => {
    const rules = await prisma.orm.public.RoutingRule
      .orderBy((r: any) => r.priority.asc()).all().then((rows: any[]) => rows, () => [] as any[]) as any[];
    res.json({ rules });
  });

  router.post('/', requireAccess('communications.rules.manage', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const body = ruleSchema.parse(req.body);
    const rule = await prisma.orm.public.RoutingRule.create({
      id: newId(), name: body.name, enabled: body.enabled, priority: body.priority,
      channel: body.channel ?? null, conditions: (body.conditions ?? null) as any, actions: body.actions as any,
      createdById: req.user?.sub ?? null, createdAt: ts(), updatedAt: ts(),
    } as any);
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any,
      action: 'communications.rule.create', entity: 'RoutingRule', entityId: rule.id,
      meta: { name: rule.name, priority: rule.priority, actions: Object.keys(body.actions) },
    });
    res.status(201).json({ rule });
  });

  router.patch('/:id', requireAccess('communications.rules.manage', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const body = ruleSchema.partial().refine((value) => Object.keys(value).length > 0).parse(req.body);
    const existing = await prisma.orm.public.RoutingRule.where({ id: req.params.id } as any).first().catch(() => null) as any;
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const patch: Record<string, unknown> = { updatedAt: ts() };
    for (const key of ['name', 'enabled', 'priority', 'channel', 'conditions', 'actions'] as const) {
      if (key in body) patch[key] = (body as any)[key] ?? null;
    }
    const rule = await prisma.orm.public.RoutingRule.where({ id: existing.id }).update(patch as any);
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any,
      action: 'communications.rule.update', entity: 'RoutingRule', entityId: existing.id,
      meta: { fields: Object.keys(patch) },
    });
    res.json({ rule });
  });

  router.delete('/:id', requireAccess('communications.rules.manage', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const existing = await prisma.orm.public.RoutingRule.where({ id: req.params.id } as any).first().catch(() => null) as any;
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await prisma.orm.public.RoutingRule.where({ id: existing.id }).delete();
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any,
      action: 'communications.rule.delete', entity: 'RoutingRule', entityId: existing.id,
      meta: { name: existing.name },
    });
    res.json({ ok: true });
  });

  return router;
}
