import { Router, Response } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import db from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { AuthRequest, requireAuth } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { has as hasPermission, isDenied } from '../../identity/services/effectivePermissions';
import { logAudit } from '../../../shared/services/audit';
import {
  StageMachine,
  StageTransitionError,
  assertLegalTransition,
  transitionPatch,
} from './stageMachines';

/**
 * Shared guarded CRUD + stage-transition surface for the additive HR/ERP
 * resources. It reuses the repository's canonical auth, permission and audit
 * helpers; resource files only describe validation, persistence mapping and
 * the workflow machine.
 */

export type PermissionSet = {
  view: string;
  create: string;
  update: string;
  remove: string;
};

export type TransitionConfig = {
  machineName: string;
  machine: StageMachine;
  /** Dynamic permission per target stage (e.g. cancellation needs a higher key). */
  permissionFor: (target: string, req: AuthRequest) => string;
  patchFor?: (
    target: string,
    existing: any,
    req: AuthRequest,
    now: string,
    note?: string,
  ) => Record<string, unknown>;
};

export type ResourceRouterConfig = {
  model: string;
  entity: string;
  permissions: PermissionSet;
  fallbackRoles?: string[];
  createSchema: z.ZodTypeAny;
  updateSchema?: z.ZodTypeAny;
  buildCreate: (data: any, req: AuthRequest, now: string) => Record<string, unknown>;
  buildUpdate?: (data: any, existing: any, req: AuthRequest, now: string) => Record<string, unknown>;
  transition?: TransitionConfig;
  queryFields?: string[];
};

const DEFAULT_FALLBACK_ROLES = ['ADMIN', 'SUPER_ADMIN'];

const transitionSchema = z.object({
  to: z.string().min(1),
  note: z.string().max(2000).optional(),
});

const forbidden = (res: Response, permission: string) =>
  res.status(403).json({ error: `Not authorized — missing ${permission}` });

/** Same precedence as requireAccess, usable when the permission is target-dependent. */
export async function hasAccess(
  req: AuthRequest,
  permission: string,
  fallbackRoles: string[] = DEFAULT_FALLBACK_ROLES,
): Promise<boolean> {
  if (!req.user?.sub) return false;
  const ctx = { employeeId: req.user.sub, systemRole: req.user.role };
  if (await isDenied(ctx, permission)) return false;
  if (await hasPermission(ctx, permission)) return true;
  return !!req.user.role && fallbackRoles.includes(req.user.role);
}

async function audit(
  req: AuthRequest,
  config: ResourceRouterConfig,
  action: string,
  entityId: string,
  meta?: Record<string, unknown>,
) {
  await logAudit({
    actorId: req.user!.sub,
    actorRole: req.user!.role ?? null,
    action,
    entity: config.entity,
    entityId,
    meta,
  });
}

export function createResourceRouter(config: ResourceRouterConfig, prisma: Db = db) {
  const router = Router();
  const fallback = config.fallbackRoles ?? DEFAULT_FALLBACK_ROLES;
  const facade = () => (prisma.orm.public as any)[config.model];
  const machine = config.transition?.machine;

  router.use(requireAuth);

  router.get('/', requireAccess(config.permissions.view, fallback), async (req: AuthRequest, res) => {
    try {
      const where: Record<string, unknown> = {};
      for (const field of config.queryFields ?? []) {
        const value = req.query[field];
        if (value !== undefined) where[field] = String(value);
      }
      let query = facade();
      if (Object.keys(where).length) query = query.where(where);
      const rows = await query
        .orderBy((row: any) => row.createdAt.desc())
        .limit(200)
        .all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: 'Server error', detail: err?.message });
    }
  });

  router.get('/:id', requireAccess(config.permissions.view, fallback), async (req: AuthRequest, res) => {
    try {
      const row = await facade().where({ id: req.params.id }).first();
      if (!row) return res.status(404).json({ error: `${config.entity} not found` });
      res.json(row);
    } catch (err: any) {
      res.status(500).json({ error: 'Server error', detail: err?.message });
    }
  });

  router.post('/', requireAccess(config.permissions.create, fallback), async (req: AuthRequest, res) => {
    try {
      const parsed = config.createSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
      const now = ts();
      const row = await facade().create({
        ...config.buildCreate(parsed.data, req, now),
        id: newId(),
        createdById: req.user!.sub,
        createdAt: now,
        updatedAt: now,
      });
      await audit(req, config, `${config.entity.toLowerCase()}.create`, row.id);
      res.status(201).json(row);
    } catch (err: any) {
      res.status(400).json({ error: err?.message ?? 'Invalid payload' });
    }
  });

  router.patch('/:id', requireAccess(config.permissions.update, fallback), async (req: AuthRequest, res) => {
    try {
      const existing = await facade().where({ id: req.params.id }).first();
      if (!existing) return res.status(404).json({ error: `${config.entity} not found` });
      if (machine && machine.terminal.includes(String(existing[machine.field]))) {
        return res.status(409).json({ error: `Cannot edit a terminal ${config.entity}` });
      }
      const schema: z.ZodTypeAny = config.updateSchema ?? (config.createSchema as any).partial();
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
      const now = ts();
      // Zod 4 widens `ZodTypeAny` output to `unknown`; resource configs all
      // parse objects, so narrow once before building the patch.
      const data = parsed.data as Record<string, unknown>;
      const patch = config.buildUpdate
        ? config.buildUpdate(data, existing, req, now)
        : Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
      const row = await facade().where({ id: existing.id }).update({ ...patch, updatedAt: now });
      await audit(req, config, `${config.entity.toLowerCase()}.update`, existing.id);
      res.json(row);
    } catch (err: any) {
      res.status(400).json({ error: err?.message ?? 'Invalid payload' });
    }
  });

  router.post('/:id/transition', async (req: AuthRequest, res) => {
    if (!config.transition) return res.status(404).json({ error: 'Workflow not available' });
    const workflow = config.transition;
    try {
      const parsed = transitionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

      const existing = await facade().where({ id: req.params.id }).first();
      if (!existing) return res.status(404).json({ error: `${config.entity} not found` });

      const from = String(existing[workflow.machine.field] ?? workflow.machine.initial);
      const to = parsed.data.to;
      try {
        assertLegalTransition(workflow.machineName, workflow.machine, from, to);
      } catch (err) {
        if (err instanceof StageTransitionError) {
          return res.status(409).json({ error: err.message, from, to });
        }
        throw err;
      }

      const permission = workflow.permissionFor(to, req);
      if (!(await hasAccess(req, permission, fallback))) return forbidden(res, permission);

      const now = ts();
      const extra = workflow.patchFor
        ? workflow.patchFor(to, existing, req, now, parsed.data.note)
        : {};
      const row = await facade()
        .where({ id: existing.id })
        .update(transitionPatch(workflow.machine, to, now, extra));
      await audit(req, config, `${config.entity.toLowerCase()}.transition.${to}`, existing.id, {
        from,
        to,
        note: parsed.data.note,
      });
      res.json(row);
    } catch (err: any) {
      res.status(400).json({ error: err?.message ?? 'Transition failed' });
    }
  });

  router.delete('/:id', requireAccess(config.permissions.remove, fallback), async (req: AuthRequest, res) => {
    try {
      const existing = await facade().where({ id: req.params.id }).first();
      if (!existing) return res.status(404).json({ error: `${config.entity} not found` });
      if (machine && String(existing[machine.field]) !== machine.initial) {
        return res.status(409).json({ error: `Only ${machine.initial} ${config.entity} records can be deleted` });
      }
      await facade().where({ id: existing.id }).delete();
      await audit(req, config, `${config.entity.toLowerCase()}.delete`, existing.id);
      res.status(204).send();
    } catch (err: any) {
      res.status(400).json({ error: err?.message ?? 'Delete failed' });
    }
  });

  return router;
}

export { DEFAULT_FALLBACK_ROLES };
