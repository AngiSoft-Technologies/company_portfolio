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
 * Additive Phase 2 marketing/content-operations vertical slices.
 *
 * Campaigns, calendar entries, content briefs, asset-library items and
 * attribution links share one guarded CRUD surface. Mounted at /v1/marketing
 * in app.ts. Only existing permission keys are used.
 */

const VIEW = 'publications.review';
const MANAGE = 'publications.publish';
const FALLBACK = ['ADMIN', 'SUPER_ADMIN'];

const permissions = { view: VIEW, create: 'publications.create', update: MANAGE, remove: 'publications.delete' };

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

const campaignCreate = z.object({
  name: z.string().min(2).max(200),
  channel: z.string().max(80).nullable().optional(),
  objective: text(2000),
  status: z.string().max(40).default('draft'),
  budgetAmount: z.union([z.number(), z.string()]).nullable().optional(),
  spendAmount: z.union([z.number(), z.string()]).default('0'),
  currency: z.string().length(3).default('KES'),
  startDate: timestamp(),
  endDate: timestamp(),
  ownerId: z.string().nullable().optional(),
  goals: json(),
});

const calendarEntryCreate = z.object({
  campaignId: z.string().nullable().optional(),
  briefId: z.string().nullable().optional(),
  title: z.string().min(2).max(200),
  channel: z.string().max(80).nullable().optional(),
  contentType: z.string().max(60).default('post'),
  status: z.string().max(40).default('planned'),
  scheduledAt: timestamp(),
  publishedAt: timestamp(),
  ownerId: z.string().nullable().optional(),
  notes: text(),
});

const contentBriefCreate = z.object({
  campaignId: z.string().nullable().optional(),
  title: z.string().min(2).max(200),
  objective: text(2000),
  audience: text(2000),
  tone: z.string().max(80).nullable().optional(),
  keyMessages: json(),
  requiredAssets: json(),
  wordCount: z.number().int().nonnegative().nullable().optional(),
  status: z.string().max(40).default('draft'),
  approvedById: z.string().nullable().optional(),
  approvedAt: timestamp(),
});

const assetLibraryCreate = z.object({
  name: z.string().min(2).max(200),
  assetType: z.string().max(60).default('image'),
  url: z.string().min(1).max(2000),
  mime: z.string().max(120).nullable().optional(),
  sizeBytes: z.number().int().nonnegative().nullable().optional(),
  tags: z.array(z.string().max(60)).default([]),
  campaignId: z.string().nullable().optional(),
  ownerId: z.string().nullable().optional(),
  status: z.string().max(40).default('active'),
});

const attributionLinkCreate = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(2).max(200),
  destinationUrl: z.string().min(1).max(2000),
  token: z.string().min(4).max(120),
  utmSource: z.string().max(120).nullable().optional(),
  utmMedium: z.string().max(120).nullable().optional(),
  utmCampaign: z.string().max(120).nullable().optional(),
  clicks: z.number().int().nonnegative().default(0),
  conversions: z.number().int().nonnegative().default(0),
  status: z.string().max(40).default('active'),
  expiresAt: timestamp(),
});

const SPECS: ResourceSpec[] = [
  { path: 'campaigns', model: 'Campaign', entity: 'Campaign', createSchema: campaignCreate, moneyFields: ['budgetAmount', 'spendAmount'], queryFields: ['status', 'ownerId'], referencePrefix: 'CAM' },
  { path: 'content-calendar', model: 'ContentCalendarEntry', entity: 'ContentCalendarEntry', createSchema: calendarEntryCreate, queryFields: ['campaignId', 'status', 'ownerId'] },
  { path: 'content-briefs', model: 'ContentBrief', entity: 'ContentBrief', createSchema: contentBriefCreate, queryFields: ['campaignId', 'status'], referencePrefix: 'CB' },
  { path: 'assets', model: 'AssetLibraryItem', entity: 'AssetLibraryItem', createSchema: assetLibraryCreate, queryFields: ['assetType', 'status', 'campaignId'], referencePrefix: 'ASSET' },
  { path: 'attribution-links', model: 'AttributionLink', entity: 'AttributionLink', createSchema: attributionLinkCreate, queryFields: ['campaignId', 'status', 'token'], referencePrefix: 'ATT' },
];

export default function marketingOperationsRouter(prisma: Db = db) {
  const router = Router();
  for (const spec of SPECS) router.use(`/${spec.path}`, guardedCrud(spec, prisma));
  return router;
}

export {
  campaignCreate,
  calendarEntryCreate,
  contentBriefCreate,
  assetLibraryCreate,
  attributionLinkCreate,
};
