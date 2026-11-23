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
 * Additive Phase 2 HR performance/lifecycle vertical slices.
 *
 * Reviews, goals, training records, directory privacy settings and
 * offboarding share one guarded CRUD surface. Mounted at /v1/hr/performance in
 * app.ts ahead of the broader /v1/hr router. Only existing permission keys are
 * used.
 */

const VIEW = 'staff.view';
const MANAGE = 'staff.update';
const FALLBACK = ['ADMIN', 'SUPER_ADMIN'];

const permissions = { view: VIEW, create: 'staff.invite', update: MANAGE, remove: 'staff.suspend' };

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

const performanceReviewCreate = z.object({
  employeeId: z.string().min(1),
  reviewerId: z.string().nullable().optional(),
  period: z.string().min(1).max(60),
  status: z.string().max(40).default('draft'),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  strengths: text(),
  improvements: text(),
  summary: text(),
  goals: json(),
  submittedAt: timestamp(),
  acknowledgedAt: timestamp(),
});

const goalCreate = z.object({
  employeeId: z.string().min(1),
  reviewId: z.string().nullable().optional(),
  title: z.string().min(2).max(200),
  description: text(),
  goalType: z.string().max(60).default('individual'),
  targetAmount: z.union([z.number(), z.string()]).nullable().optional(),
  currency: z.string().length(3).default('KES'),
  dueAt: timestamp(),
  status: z.string().max(40).default('draft'),
  progress: z.number().int().min(0).max(100).default(0),
  achievedAt: timestamp(),
});

const trainingRecordCreate = z.object({
  employeeId: z.string().min(1),
  title: z.string().min(2).max(200),
  provider: z.string().max(200).nullable().optional(),
  category: z.string().max(80).nullable().optional(),
  completedAt: timestamp(),
  hours: z.number().int().nonnegative().nullable().optional(),
  costAmount: z.union([z.number(), z.string()]).nullable().optional(),
  currency: z.string().length(3).default('KES'),
  status: z.string().max(40).default('completed'),
  certificateUrl: z.string().max(1000).nullable().optional(),
  notes: text(),
});

const directoryPrivacyCreate = z.object({
  employeeId: z.string().min(1),
  phoneVisible: z.boolean().default(false),
  emailVisible: z.boolean().default(true),
  locationVisible: z.boolean().default(false),
  profileVisible: z.boolean().default(true),
  searchable: z.boolean().default(true),
  updatedById: z.string().nullable().optional(),
});

const offboardingCreate = z.object({
  employeeId: z.string().min(1),
  requestedById: z.string().nullable().optional(),
  reason: text(),
  lastWorkingDay: timestamp(),
  status: z.string().max(40).default('draft'),
  checklist: json(),
  handoverNotes: text(),
  accessRevokedAt: timestamp(),
  exitInterviewAt: timestamp(),
  completedAt: timestamp(),
});

const SPECS: ResourceSpec[] = [
  { path: 'performance-reviews', model: 'PerformanceReview', entity: 'PerformanceReview', createSchema: performanceReviewCreate, queryFields: ['employeeId', 'reviewerId', 'status'], referencePrefix: 'PR' },
  { path: 'goals', model: 'Goal', entity: 'Goal', createSchema: goalCreate, moneyFields: ['targetAmount'], queryFields: ['employeeId', 'reviewId', 'status'] },
  { path: 'training-records', model: 'TrainingRecord', entity: 'TrainingRecord', createSchema: trainingRecordCreate, moneyFields: ['costAmount'], queryFields: ['employeeId', 'status'] },
  { path: 'directory-privacy', model: 'DirectoryPrivacySetting', entity: 'DirectoryPrivacySetting', createSchema: directoryPrivacyCreate, queryFields: ['employeeId'] },
  { path: 'offboarding', model: 'Offboarding', entity: 'Offboarding', createSchema: offboardingCreate, queryFields: ['employeeId', 'status'], referencePrefix: 'OFF' },
];

export default function hrPerformanceRouter(prisma: Db = db) {
  const router = Router();
  for (const spec of SPECS) router.use(`/${spec.path}`, guardedCrud(spec, prisma));
  return router;
}

export {
  performanceReviewCreate,
  goalCreate,
  trainingRecordCreate,
  directoryPrivacyCreate,
  offboardingCreate,
};
