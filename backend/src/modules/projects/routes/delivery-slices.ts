import { randomUUID } from 'node:crypto';
import { Router, type Response } from 'express';
import { z } from 'zod';
import db, { type Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { AuthRequest, requireAuth } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { toMoney } from '../../billing/utils/money';

/**
 * Additive Phase 2 project-delivery vertical slices.
 *
 * Six plain-id models (templates, capacity, change requests, risks,
 * retrospectives and sign-offs) get a small guarded CRUD surface. Mounted at
 * /v1/project-delivery in app.ts. Only existing permission keys are used.
 */

const VIEW = 'projects.view';
const MANAGE = 'projects.manage';
const FALLBACK = ['ADMIN', 'SUPER_ADMIN'];

const permissions = { view: VIEW, create: MANAGE, update: MANAGE, remove: MANAGE };

type ResourceSpec = {
  path: string;
  model: string;
  entity: string;
  createSchema: z.ZodObject<any>;
  moneyFields?: string[];
  defaults?: Record<string, unknown>;
  queryFields?: string[];
  referencePrefix?: string;
  numberPrefix?: string;
};

const reference = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;

const json = () => z.record(z.string(), z.unknown()).nullable().optional();
const text = (max = 8000) => z.string().max(max).nullable().optional();
const timestamp = () => z.string().nullable().optional();

function guardedCrud(spec: ResourceSpec, prisma: Db): Router {
  const router = Router();
  const facade = () => (prisma.orm.public as Record<string, any>)[spec.model];
  const money = (payload: Record<string, unknown>) => {
    for (const field of spec.moneyFields ?? []) {
      if (field in payload && payload[field] !== undefined && payload[field] !== null) {
        payload[field] = toMoney(payload[field] as string | number);
      }
    }
    return payload;
  };
  const audit = (req: AuthRequest, action: string, entityId: string) =>
    logAudit({
      actorId: req.user!.sub,
      actorRole: req.user!.role ?? null,
      action: `${spec.entity.toLowerCase()}.${action}`,
      entity: spec.entity,
      entityId,
    });

  router.use(requireAuth);

  router.get('/', requireAccess(permissions.view, FALLBACK), async (req: AuthRequest, res: Response) => {
    try {
      const where: Record<string, unknown> = {};
      for (const field of spec.queryFields ?? []) {
        const value = req.query[field];
        if (value !== undefined) where[field] = String(value);
      }
      let query = facade();
      if (Object.keys(where).length) query = query.where(where);
      const rows = await query.orderBy((row: any) => row.createdAt.desc()).limit(200).all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: 'Server error', detail: err?.message });
    }
  });

  router.get('/:id', requireAccess(permissions.view, FALLBACK), async (req: AuthRequest, res) => {
    try {
      const row = await facade().where({ id: req.params.id }).first();
      if (!row) return res.status(404).json({ error: `${spec.entity} not found` });
      res.json(row);
    } catch (err: any) {
      res.status(500).json({ error: 'Server error', detail: err?.message });
    }
  });

  router.post('/', requireAccess(permissions.create, FALLBACK), async (req: AuthRequest, res) => {
    try {
      const parsed = spec.createSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
      const now = ts();
      const payload = money({
        ...(spec.defaults ?? {}),
        ...(parsed.data as Record<string, unknown>),
        ...(spec.referencePrefix ? { publicReference: reference(spec.referencePrefix) } : {}),
        ...(spec.numberPrefix ? { number: reference(spec.numberPrefix) } : {}),
        id: newId(),
        createdById: req.user!.sub,
        createdAt: now,
        updatedAt: now,
      });
      const row = await facade().create(payload);
      await audit(req, 'create', row.id);
      res.status(201).json(row);
    } catch (err: any) {
      res.status(400).json({ error: err?.message ?? 'Invalid payload' });
    }
  });

  router.patch('/:id', requireAccess(permissions.update, FALLBACK), async (req: AuthRequest, res) => {
    try {
      const existing = await facade().where({ id: req.params.id }).first();
      if (!existing) return res.status(404).json({ error: `${spec.entity} not found` });
      const parsed = (spec.createSchema as any).partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
      const patch = money({
        ...(parsed.data as Record<string, unknown>),
        updatedAt: ts(),
      });
      const row = await facade().where({ id: existing.id }).update(patch);
      await audit(req, 'update', existing.id);
      res.json(row);
    } catch (err: any) {
      res.status(400).json({ error: err?.message ?? 'Invalid payload' });
    }
  });

  router.delete('/:id', requireAccess(permissions.remove, FALLBACK), async (req: AuthRequest, res) => {
    try {
      const existing = await facade().where({ id: req.params.id }).first();
      if (!existing) return res.status(404).json({ error: `${spec.entity} not found` });
      await facade().where({ id: existing.id }).delete();
      await audit(req, 'delete', existing.id);
      res.status(204).send();
    } catch (err: any) {
      res.status(400).json({ error: err?.message ?? 'Delete failed' });
    }
  });

  return router;
}

const projectTemplateCreate = z.object({
  key: z.string().min(2).max(80),
  name: z.string().min(2).max(200),
  description: text(),
  projectType: z.string().max(80).nullable().optional(),
  stage: z.string().max(40).default('draft'),
  milestones: json(),
  deliverables: json(),
  checklist: json(),
  estimateHours: z.number().int().nonnegative().default(0),
  rateAmount: z.union([z.number(), z.string()]).nullable().optional(),
  currency: z.string().length(3).default('KES'),
  published: z.boolean().default(false),
});

const employeeCapacityCreate = z.object({
  employeeId: z.string().min(1),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  weeklyHours: z.number().int().nonnegative().default(40),
  availableHours: z.number().int().nonnegative().default(0),
  allocatedHours: z.number().int().nonnegative().default(0),
  status: z.string().max(40).default('open'),
  notes: text(),
});

const changeRequestCreate = z.object({
  clientProjectId: z.string().min(1),
  requestedById: z.string().nullable().optional(),
  title: z.string().min(2).max(200),
  reason: text(),
  impact: text(),
  status: z.string().max(40).default('pending'),
  costImpact: z.union([z.number(), z.string()]).default('0'),
  dayImpact: z.number().int().nonnegative().default(0),
  currency: z.string().length(3).default('KES'),
  decisionNote: text(),
});

const riskCreate = z.object({
  clientProjectId: z.string().min(1),
  title: z.string().min(2).max(200),
  description: text(),
  category: z.string().max(60).default('delivery'),
  likelihood: z.number().int().min(1).max(5).default(1),
  impact: z.number().int().min(1).max(5).default(1),
  score: z.number().int().min(1).max(25).default(1),
  severity: z.string().max(40).default('low'),
  status: z.string().max(40).default('open'),
  ownerId: z.string().nullable().optional(),
  mitigation: text(),
  targetDate: timestamp(),
});

const retrospectiveCreate = z.object({
  clientProjectId: z.string().min(1),
  facilitatorId: z.string().nullable().optional(),
  period: z.string().max(60).nullable().optional(),
  status: z.string().max(40).default('draft'),
  whatWentWell: text(),
  whatCouldImprove: text(),
  lessons: json(),
  actionItems: json(),
  sharedAt: timestamp(),
});

const signOffCreate = z.object({
  clientProjectId: z.string().min(1),
  clientId: z.string().nullable().optional(),
  title: z.string().min(2).max(200),
  status: z.string().max(40).default('pending'),
  signedById: z.string().nullable().optional(),
  signedAt: timestamp(),
  dueAt: timestamp(),
  notes: text(),
});

const SPECS: ResourceSpec[] = [
  { path: 'project-templates', model: 'ProjectTemplate', entity: 'ProjectTemplate', createSchema: projectTemplateCreate, moneyFields: ['rateAmount'], queryFields: ['stage', 'projectType'], referencePrefix: 'PT' },
  { path: 'employee-capacity', model: 'EmployeeCapacity', entity: 'EmployeeCapacity', createSchema: employeeCapacityCreate, queryFields: ['employeeId', 'status'] },
  { path: 'change-requests', model: 'ProjectChangeRequest', entity: 'ProjectChangeRequest', createSchema: changeRequestCreate, moneyFields: ['costImpact'], queryFields: ['clientProjectId', 'status'], referencePrefix: 'CR' },
  { path: 'risks', model: 'ProjectRisk', entity: 'ProjectRisk', createSchema: riskCreate, queryFields: ['clientProjectId', 'status', 'severity'] },
  { path: 'retrospectives', model: 'ProjectRetrospective', entity: 'ProjectRetrospective', createSchema: retrospectiveCreate, queryFields: ['clientProjectId', 'status'] },
  { path: 'sign-offs', model: 'ProjectSignOff', entity: 'ProjectSignOff', createSchema: signOffCreate, queryFields: ['clientProjectId', 'status'], referencePrefix: 'SO' },
];

export default function projectDeliveryRouter(prisma: Db = db) {
  const router = Router();
  for (const spec of SPECS) router.use(`/${spec.path}`, guardedCrud(spec, prisma));
  return router;
}

export {
  projectTemplateCreate,
  employeeCapacityCreate,
  changeRequestCreate,
  riskCreate,
  retrospectiveCreate,
  signOffCreate,
};
