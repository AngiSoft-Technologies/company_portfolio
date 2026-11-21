import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../db';
import db from '../../db';
import { ts, newId } from '../../prisma/db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/roles';
import { logAudit } from '../services/audit';
import { and } from '@prisma/orm-postgres/orm-client';
import { PERMISSIONS, canonicalKey } from '../../modules/identity/services/permissionRegistry';
import {
    getEffectivePermissions,
    type EffectiveContext,
} from '../../modules/identity/services/effectivePermissions';
import { createNotification } from '../../modules/notifications/services/notifications';

/**
 * Multi-step approval chains (DIGITAL_HQ_PLAN Phase 4.2 follow-up).
 *
 * Generic `ApprovalRequest` records point at any entity
 * (quote/invoice/expense/leave/payslip/custom) and carry an ordered `steps`
 * JSON array. Steps are sequential: only the first pending step can be
 * decided, the decider must hold that step's permission key, and the
 * requester can never decide their own request. When the last step is
 * approved the request becomes `approved`; any rejection fails it.
 *
 * This complements the threshold rules in `approvalRules.ts` — those decide
 * *whether* approval is needed inline; this engine handles *who* must sign
 * off, in what order, with an auditable trail.
 */

interface ApprovalStep {
    permission: string;
    label?: string | null;
    status: 'pending' | 'approved' | 'rejected';
    decidedById?: string | null;
    decidedAt?: string | null;
    note?: string | null;
}

const ENTITY_TYPES = ['quote', 'invoice', 'expense', 'leave', 'payslip', 'booking', 'custom', 'agent_action'] as const;
const KNOWN_PERMISSIONS = new Set(PERMISSIONS.map((p) => p.key));

const createSchema = z.object({
    entityType: z.enum(ENTITY_TYPES),
    entityId: z.string().min(1).max(100),
    title: z.string().min(1).max(200),
    amount: z.union([z.number(), z.string()]).optional().nullable(),
    currency: z.string().max(8).optional().nullable(),
    steps: z
        .array(
            z.object({
                permission: z.string().min(1).max(100),
                label: z.string().max(120).optional().nullable(),
            }),
        )
        .min(1)
        .max(10),
});

const decideSchema = z.object({
    decision: z.enum(['approved', 'rejected']),
    note: z.string().max(1000).optional().nullable(),
});

const ctx = (req: AuthRequest): EffectiveContext => ({
    employeeId: req.user!.sub,
    systemRole: req.user!.role,
});

const asSteps = (raw: unknown): ApprovalStep[] =>
    Array.isArray(raw) ? (raw as ApprovalStep[]) : [];

const nextPendingIndex = (steps: ApprovalStep[]) =>
    steps.findIndex((s) => s.status === 'pending');

/** Effective-permission check against an already-resolved permission map. */
function granted(perms: Map<string, { effect: string }>, key: string): boolean {
    const canonical = canonicalKey(key);
    if (perms.get(canonical)?.effect === 'DENY') return false;
    if (perms.get('*')?.effect === 'DENY') return false;
    if (perms.get('*')?.effect === 'GRANT') return true;
    return perms.get(canonical)?.effect === 'GRANT';
}

async function employeeNames(prisma: Db, ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return new Map<string, any>();
    const rows = await prisma.orm.public.Employee
        .where((e: any) => e.id.in(unique))
        .all();
    const wanted = new Set(unique);
    return new Map(
        rows
            .filter((e: any) => wanted.has(e.id))
            .map((e: any) => [e.id, {
                id: e.id,
                firstName: e.firstName,
                lastName: e.lastName,
                email: e.email,
            }]),
    );
}

const permissionLabel = (key: string) =>
    PERMISSIONS.find((p) => p.key === key)?.display ?? key;

export default function approvalsRouter(prisma: Db = db) {
    const router = Router();
    router.use(requireAuth);

    // Permission catalogue for the step builder (registry is not secret —
    // staff-access already exposes it to permission managers).
    router.get('/permissions', requirePermission('approvals.view'), async (_req, res) => {
        res.json(
            PERMISSIONS.map((p) => ({ key: p.key, display: p.display, group: p.group }))
                .sort((a, b) => a.group.localeCompare(b.group) || a.display.localeCompare(b.display)),
        );
    });

    router.post('/', requirePermission('approvals.manage'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const data = parsed.data;
        const unknown = data.steps
            .map((s) => canonicalKey(s.permission))
            .filter((k) => !KNOWN_PERMISSIONS.has(k) && k !== '*');
        if (unknown.length) {
            return res.status(400).json({ error: `Unknown permission key(s): ${unknown.join(', ')}` });
        }
        try {
            const steps: ApprovalStep[] = data.steps.map((s) => ({
                permission: canonicalKey(s.permission),
                label: s.label ?? null,
                status: 'pending',
                decidedById: null,
                decidedAt: null,
                note: null,
            }));
            const amount = data.amount != null && data.amount !== '' ? Number(data.amount) : null;
            if (amount != null && (!Number.isFinite(amount) || amount < 0)) {
                return res.status(400).json({ error: 'amount must be a non-negative number' });
            }
            const created = await prisma.orm.public.ApprovalRequest.create({
                id: newId(),
                entityType: data.entityType,
                entityId: data.entityId,
                title: data.title,
                amount: (amount ?? null) as any,
                currency: data.currency?.toUpperCase() ?? null,
                requestedById: req.user!.sub,
                status: 'pending',
                steps: steps as any,
                updatedAt: ts(),
            });
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'approval.create',
                entity: 'ApprovalRequest',
                entityId: created!.id,
                meta: { entityType: data.entityType, entityId: data.entityId, steps: steps.length },
            });
            res.status(201).json(created);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.get('/', requirePermission('approvals.view'), async (req: AuthRequest, res) => {
        try {
            const { status, entityType, entityId, requestedById, mine } = req.query;
            const conds: any[] = [
                ...(status ? [(r: any) => r.status.eq(String(status))] : []),
                ...(entityType ? [(r: any) => r.entityType.eq(String(entityType))] : []),
                ...(entityId ? [(r: any) => r.entityId.eq(String(entityId))] : []),
                ...(requestedById ? [(r: any) => r.requestedById.eq(String(requestedById))] : []),
            ];
            const query: any = conds.length
                ? prisma.orm.public.ApprovalRequest.where((r: any) => and(...conds.map((c) => c(r))))
                : prisma.orm.public.ApprovalRequest;
            let rows = await query
                .orderBy((r: any) => r.createdAt.desc())
                .limit(500)
                .all();

            if (mine === '1' || mine === 'true') {
                const perms = await getEffectivePermissions(ctx(req));
                rows = rows.filter((r: any) => {
                    if (r.status !== 'pending' || r.requestedById === req.user!.sub) return false;
                    const steps = asSteps(r.steps);
                    const idx = nextPendingIndex(steps);
                    return idx >= 0 && granted(perms, steps[idx].permission);
                });
            }

            const names = await employeeNames(prisma, rows.map((r: any) => r.requestedById));
            res.json(rows.map((r: any) => ({ ...r, requester: names.get(r.requestedById) ?? null })));
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.get('/:id', requirePermission('approvals.view'), async (req: AuthRequest, res) => {
        try {
            const row = await prisma.orm.public.ApprovalRequest.where({ id: req.params.id }).first();
            if (!row) return res.status(404).json({ error: 'Approval request not found' });
            const steps = asSteps((row as any).steps);
            const idx = nextPendingIndex(steps);
            const isRequester = (row as any).requestedById === req.user!.sub;
            let canAct = false;
            if ((row as any).status === 'pending' && idx >= 0 && !isRequester) {
                const perms = await getEffectivePermissions(ctx(req));
                canAct = granted(perms, steps[idx].permission);
            }
            const names = await employeeNames(
                prisma,
                [
                    (row as any).requestedById,
                    ...steps.map((s) => s.decidedById).filter(Boolean) as string[],
                ],
            );
            res.json({
                ...row,
                steps: steps.map((s, i) => ({
                    ...s,
                    index: i,
                    isCurrent: i === idx && (row as any).status === 'pending',
                    permissionLabel: permissionLabel(s.permission),
                    decidedBy: s.decidedById ? names.get(s.decidedById) ?? null : null,
                })),
                requester: names.get((row as any).requestedById) ?? null,
                nextStepIndex: idx,
                isRequester,
                canAct,
            });
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.post('/:id/decide', requirePermission('approvals.respond'), async (req: AuthRequest, res) => {
        const parsed = decideSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const row = await prisma.orm.public.ApprovalRequest.where({ id: req.params.id }).first();
            if (!row) return res.status(404).json({ error: 'Approval request not found' });
            const r = row as any;
            if (r.status !== 'pending') {
                return res.status(409).json({ error: `Request is already ${r.status}` });
            }
            if (r.requestedById === req.user!.sub) {
                return res.status(403).json({ error: 'Cannot decide your own approval request' });
            }
            const steps = asSteps(r.steps);
            const idx = nextPendingIndex(steps);
            if (idx < 0) return res.status(409).json({ error: 'No pending steps' });

            const perms = await getEffectivePermissions(ctx(req));
            const step = steps[idx];
            if (!granted(perms, step.permission)) {
                return res.status(403).json({
                    error: `Requires permission: ${permissionLabel(step.permission)}`,
                });
            }

            const { decision, note } = parsed.data;
            steps[idx] = {
                ...step,
                status: decision,
                decidedById: req.user!.sub,
                decidedAt: ts() as unknown as string,
                note: note ?? null,
            };
            const allApproved = steps.every((s) => s.status === 'approved');
            const finalStatus = decision === 'rejected' ? 'rejected' : allApproved ? 'approved' : 'pending';

            const updated = await prisma.orm.public.ApprovalRequest
                .where({ id: r.id })
                .update({
                    steps: steps as any,
                    status: finalStatus,
                    decidedAt: finalStatus === 'pending' ? null : ts(),
                    updatedAt: ts(),
                });

            // Agent-filed requests have no human requester — skip the
            // requester notification (there is nobody to notify).
            if (!String(r.requestedById).startsWith('agent:')) {
                await createNotification(
                    r.requestedById,
                    `approval.${finalStatus === 'pending' ? 'step' : finalStatus}`,
                    `Approval ${finalStatus === 'pending' ? 'step completed' : finalStatus}: ${r.title}`,
                    `Step ${idx + 1}/${steps.length} (${step.label || permissionLabel(step.permission)}) was ${decision} by ${req.user!.sub}.`,
                    '/approvals',
                    { approvalRequestId: r.id, stepIndex: idx, decision },
                );
            }
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: `approval.${decision}`,
                entity: 'ApprovalRequest',
                entityId: r.id,
                meta: { stepIndex: idx, stepPermission: step.permission, finalStatus },
            });
            res.json({ ...updated, steps });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.post('/:id/cancel', async (req: AuthRequest, res) => {
        try {
            const row = await prisma.orm.public.ApprovalRequest.where({ id: req.params.id }).first();
            if (!row) return res.status(404).json({ error: 'Approval request not found' });
            const r = row as any;
            const isRequester = r.requestedById === req.user!.sub;
            const canManage = await getEffectivePermissions(ctx(req)).then((p) => granted(p, 'approvals.manage'));
            if (!isRequester && !canManage) {
                return res.status(403).json({ error: 'Only the requester or an approvals manager can cancel' });
            }
            if (r.status !== 'pending') {
                return res.status(409).json({ error: `Request is already ${r.status}` });
            }
            const updated = await prisma.orm.public.ApprovalRequest
                .where({ id: r.id })
                .update({ status: 'cancelled', decidedAt: ts(), updatedAt: ts() });
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'approval.cancel',
                entity: 'ApprovalRequest',
                entityId: r.id,
            });
            res.json(updated);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    return router;
}
