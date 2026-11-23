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
 * Additive Phase 2 finance/accounting vertical slices.
 *
 * Credit notes, tax rates, AR/AP postings and commission entries share one
 * guarded CRUD surface. All money/rate writes go through toMoney() into
 * Numeric(18,2) columns. Mounted at /v1/finance/accounting in app.ts. Only
 * existing permission keys are used.
 */

const VIEW = 'invoices.view';
const MANAGE = 'invoices.update';
const FALLBACK = ['ADMIN', 'SUPER_ADMIN'];

const permissions = { view: VIEW, create: 'invoices.create', update: MANAGE, remove: 'invoices.void' };

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

const creditNoteCreate = z.object({
  invoiceId: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
  reason: z.string().min(2).max(500),
  amount: z.union([z.number(), z.string()]).default('0'),
  tax: z.union([z.number(), z.string()]).default('0'),
  total: z.union([z.number(), z.string()]).default('0'),
  currency: z.string().length(3).default('KES'),
  status: z.string().max(40).default('draft'),
  issuedAt: timestamp(),
  appliedAt: timestamp(),
});

const taxRateCreate = z.object({
  key: z.string().min(2).max(80),
  name: z.string().min(2).max(200),
  description: text(),
  rate: z.union([z.number(), z.string()]).default('0'),
  scope: z.string().max(60).default('all'),
  jurisdiction: z.string().max(80).nullable().optional(),
  effectiveFrom: timestamp(),
  effectiveTo: timestamp(),
  active: z.boolean().default(true),
});

const arApEntryCreate = z.object({
  direction: z.enum(['receivable', 'payable']),
  entityType: z.string().max(60).nullable().optional(),
  entityId: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
  vendor: z.string().max(200).nullable().optional(),
  description: z.string().min(2).max(500),
  amount: z.union([z.number(), z.string()]).default('0'),
  currency: z.string().length(3).default('KES'),
  status: z.string().max(40).default('open'),
  dueAt: timestamp(),
  postedAt: timestamp(),
  settledAt: timestamp(),
});

const commissionEntryCreate = z.object({
  employeeId: z.string().min(1),
  sourceType: z.string().max(60).nullable().optional(),
  sourceId: z.string().nullable().optional(),
  period: z.string().max(40).nullable().optional(),
  basisAmount: z.union([z.number(), z.string()]).default('0'),
  rate: z.union([z.number(), z.string()]).default('0'),
  amount: z.union([z.number(), z.string()]).default('0'),
  currency: z.string().length(3).default('KES'),
  status: z.string().max(40).default('pending'),
  paidAt: timestamp(),
});

const SPECS: ResourceSpec[] = [
  { path: 'credit-notes', model: 'CreditNote', entity: 'CreditNote', createSchema: creditNoteCreate, moneyFields: ['amount', 'tax', 'total'], queryFields: ['invoiceId', 'clientId', 'status'], referencePrefix: 'CN', numberPrefix: 'CN' },
  { path: 'tax-rates', model: 'TaxRate', entity: 'TaxRate', createSchema: taxRateCreate, moneyFields: ['rate'], queryFields: ['scope', 'active'] },
  { path: 'ar-ap-entries', model: 'ArApEntry', entity: 'ArApEntry', createSchema: arApEntryCreate, moneyFields: ['amount'], queryFields: ['direction', 'status', 'clientId'], referencePrefix: 'ARAP' },
  { path: 'commission-entries', model: 'CommissionEntry', entity: 'CommissionEntry', createSchema: commissionEntryCreate, moneyFields: ['basisAmount', 'rate', 'amount'], queryFields: ['employeeId', 'status', 'period'], referencePrefix: 'COM' },
];

export default function financeAccountingRouter(prisma: Db = db) {
  const router = Router();
  for (const spec of SPECS) router.use(`/${spec.path}`, guardedCrud(spec, prisma));
  return router;
}

export { creditNoteCreate, taxRateCreate, arApEntryCreate, commissionEntryCreate };
