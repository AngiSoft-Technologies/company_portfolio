import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import db from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { has as hasPermission } from '../services/effectivePermissions';
import { requiresApproval, approvalRuleFor } from '../../crm/services/approvalRules';
import { logAudit } from '../../../shared/services/audit';
import { createNotification } from '../../notifications/services/notifications';

/**
 * Leave requests (DIGITAL_HQ_PLAN §HR / Phase 4.2 approval wiring).
 * Status machine: pending → approved|rejected|cancelled.
 * Approval above APPROVAL_THRESHOLD_LEAVE_DAYS requires `leave.approve`;
 * below it `leave.view` is sufficient (approvalRules engine).
 */

const LEAVE_TYPES = ['annual', 'sick', 'compassionate', 'unpaid', 'other'] as const;

const createSchema = z.object({
    type: z.enum(LEAVE_TYPES).default('annual'),
    startDate: z.string().min(4),
    endDate: z.string().min(4),
    reason: z.string().max(4000).nullable().optional(),
});

const reviewSchema = z.object({
    decision: z.enum(['approved', 'rejected']),
    note: z.string().max(2000).nullable().optional(),
});

const DAY_MS = 24 * 60 * 60 * 1000;

const ctx = (req: AuthRequest) => ({ employeeId: req.user!.sub, systemRole: req.user!.role });

function leaveDays(start: string, end: string): number {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return 0;
    return Math.floor((e - s) / DAY_MS) + 1;
}

export default function leaveRequestsRouter(prisma: Db = db) {
    const router = Router();
    router.use(requireAuth);

    router.get('/', async (req: AuthRequest, res) => {
        try {
            const canViewAll = await hasPermission(ctx(req), 'leave.view');
            const { status, mine, employeeId } = req.query;
            let query: any = prisma.orm.public.LeaveRequest;
            const where: any = {};
            if (!canViewAll || mine === 'true') where.employeeId = req.user!.sub;
            else if (employeeId) where.employeeId = String(employeeId);
            if (status) where.status = String(status);
            if (Object.keys(where).length) query = query.where(where);
            const rows = await query
                .include('employee', (e: any) => e.select('id', 'firstName', 'lastName', 'email', 'departmentId'))
                .include('reviewedBy', (e: any) => e.select('id', 'firstName', 'lastName'))
                .orderBy((l: any) => l.startDate.desc())
                .limit(200)
                .all();
            res.json(rows);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/', async (req: AuthRequest, res) => {
        try {
            if (!(await hasPermission(ctx(req), 'leave.request'))) {
                return res.status(403).json({ error: 'Missing leave.request permission' });
            }
            const parsed = createSchema.safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
            const days = leaveDays(parsed.data.startDate, parsed.data.endDate);
            if (days <= 0) return res.status(400).json({ error: 'endDate must be on or after startDate' });
            const leave = await prisma.orm.public.LeaveRequest.create({
                id: newId(),
                updatedAt: ts(),
                employeeId: req.user!.sub,
                type: parsed.data.type,
                startDate: ts(parsed.data.startDate),
                endDate: ts(parsed.data.endDate),
                reason: parsed.data.reason ?? null,
                status: 'pending',
            });
            res.status(201).json({ ...leave, days });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.post('/:id/cancel', async (req: AuthRequest, res) => {
        try {
            const existing = await prisma.orm.public.LeaveRequest.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Leave request not found' });
            const isOwner = (existing as any).employeeId === req.user!.sub;
            const canViewAll = await hasPermission(ctx(req), 'leave.view');
            if (!isOwner && !canViewAll) return res.status(403).json({ error: 'Forbidden' });
            if (!['pending', 'approved'].includes(String((existing as any).status))) {
                return res.status(409).json({ error: `Cannot cancel from status ${(existing as any).status}` });
            }
            const updated = await prisma.orm.public.LeaveRequest.where({ id: existing.id }).update({ status: 'cancelled' });
            res.json(updated);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.post('/:id/review', async (req: AuthRequest, res) => {
        try {
            const parsed = reviewSchema.safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
            const existing = await prisma.orm.public.LeaveRequest.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Leave request not found' });
            if (String((existing as any).status) !== 'pending') {
                return res.status(409).json({ error: 'Only pending requests can be reviewed' });
            }
            if ((existing as any).employeeId === req.user!.sub) {
                return res.status(403).json({ error: 'You cannot review your own leave request' });
            }

            // Approval rules engine (Phase 4.2): long leave needs leave.approve.
            const days = leaveDays(String((existing as any).startDate), String((existing as any).endDate));
            const rule = approvalRuleFor('leave');
            const needsApproval = requiresApproval('leave', days);
            const canApprove = await hasPermission(ctx(req), rule.requiredPermission);
            const canView = await hasPermission(ctx(req), 'leave.view');
            const allowed = parsed.data.decision === 'approved'
                ? (needsApproval ? canApprove : canView)
                : (canApprove || canView);
            if (!allowed) {
                return res.status(403).json({
                    error: needsApproval
                        ? `Approval required — ${days} days meets the ${rule.requiredPermission} threshold`
                        : 'Missing leave.view permission',
                });
            }

            const updated = await prisma.orm.public.LeaveRequest.where({ id: existing.id }).update({
                status: parsed.data.decision === 'approved' ? 'approved' : 'rejected',
                reviewedById: req.user!.sub,
                reviewedAt: ts(),
                reviewNote: parsed.data.note ?? null,
            });

            await createNotification(
                (existing as any).employeeId,
                'leave.reviewed',
                `Leave request ${parsed.data.decision}`,
                `Your ${days}-day leave request was ${parsed.data.decision}.${parsed.data.note ? ` Note: ${parsed.data.note}` : ''}`,
                '/workspace',
                { leaveRequestId: existing.id, decision: parsed.data.decision, days },
            );
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: `leave.${parsed.data.decision}`,
                entity: 'LeaveRequest',
                entityId: existing.id,
                meta: { days, type: (existing as any).type, thresholdApplied: needsApproval },
            });
            res.json({ ...updated, days });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    return router;
}
