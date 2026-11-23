import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import db from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requirePermission } from '../../../shared/middleware/roles';
import { has as hasPermission } from '../../identity/services/effectivePermissions';
import { requiresApproval, approvalRuleFor } from '../../crm/services/approvalRules';
import { logAudit } from '../../../shared/services/audit';
import { createNotification } from '../../notifications/services/notifications';

/**
 * Expense claims (DIGITAL_HQ_PLAN §Finance / Phase 4.2 approval wiring).
 * Status machine: draft → submitted → approved|rejected → paid.
 * Approval above APPROVAL_THRESHOLD_EXPENSE requires `expenses.approve`;
 * below it `expenses.update` is sufficient (approvalRules engine).
 */

const upsertSchema = z.object({
    title: z.string().min(2).max(200),
    description: z.string().max(4000).nullable().optional(),
    amount: z.union([z.number(), z.string()]),
    currency: z.string().length(3).default('KES'),
    category: z.string().max(80).nullable().optional(),
    receiptFileId: z.string().nullable().optional(),
});

const reviewSchema = z.object({
    decision: z.enum(['approved', 'rejected']),
    note: z.string().max(2000).nullable().optional(),
});

const STATUSES = ['draft', 'submitted', 'approved', 'rejected', 'paid'] as const;

const ctx = (req: AuthRequest) => ({ employeeId: req.user!.sub, systemRole: req.user!.role });

export default function expensesRouter(prisma: Db = db) {
    const router = Router();
    router.use(requireAuth);

    const serialize = (e: any) => ({
        ...e,
        submittedBy: e.submittedBy ?? undefined,
        reviewedBy: e.reviewedBy ?? undefined,
    });

    router.get('/', async (req: AuthRequest, res) => {
        try {
            const canViewAll = await hasPermission(ctx(req), 'expenses.view');
            const { status, mine } = req.query;
            let query: any = prisma.orm.public.Expense;
            const where: any = {};
            if (!canViewAll || mine === 'true') where.submittedById = req.user!.sub;
            if (status && (STATUSES as readonly string[]).includes(String(status))) where.status = String(status);
            if (Object.keys(where).length) query = query.where(where);
            const rows = await query
                .include('submittedBy', (e: any) => e.select('id', 'firstName', 'lastName', 'email'))
                .include('reviewedBy', (e: any) => e.select('id', 'firstName', 'lastName', 'email'))
                .orderBy((e: any) => e.createdAt.desc())
                .limit(200)
                .all();
            res.json(rows.map(serialize));
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.post('/', requirePermission('expenses.create'), async (req: AuthRequest, res) => {
        try {
            const parsed = upsertSchema.safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
            const d = parsed.data;
            const amount = Number(d.amount);
            if (!Number.isFinite(amount) || amount <= 0) {
                return res.status(400).json({ error: 'amount must be a positive number' });
            }
            const expense = await prisma.orm.public.Expense.create({
                id: newId(),
                updatedAt: ts(),
                title: d.title,
                description: d.description ?? null,
                amount: amount as any,
                currency: String(d.currency).toUpperCase(),
                category: d.category ?? null,
                receiptFileId: d.receiptFileId ?? null,
                status: 'draft',
                submittedById: req.user!.sub,
            });
            res.status(201).json(expense);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.put('/:id', async (req: AuthRequest, res) => {
        try {
            const existing = await prisma.orm.public.Expense.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Expense not found' });
            const isOwner = (existing as any).submittedById === req.user!.sub;
            const canEdit = await hasPermission(ctx(req), 'expenses.update');
            if (!isOwner && !canEdit) return res.status(403).json({ error: 'Forbidden' });
            if (String((existing as any).status) !== 'draft' && !canEdit) {
                return res.status(409).json({ error: 'Only draft expenses can be edited by the submitter' });
            }
            if (['approved', 'paid'].includes(String((existing as any).status)) && !canEdit) {
                return res.status(409).json({ error: 'Approved expenses cannot be edited' });
            }

            const parsed = upsertSchema.partial().safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
            const payload: any = {};
            for (const [k, v] of Object.entries(parsed.data)) {
                if (v === undefined) continue;
                payload[k] = k === 'amount' ? Number(v) : k === 'currency' ? String(v).toUpperCase() : v;
            }
            const updated = await prisma.orm.public.Expense.where({ id: existing.id }).update(payload);
            res.json(updated);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.post('/:id/submit', async (req: AuthRequest, res) => {
        try {
            const existing = await prisma.orm.public.Expense.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Expense not found' });
            const isOwner = (existing as any).submittedById === req.user!.sub;
            const canUpdate = await hasPermission(ctx(req), 'expenses.update');
            if (!isOwner && !canUpdate) return res.status(403).json({ error: 'Forbidden' });
            if (String((existing as any).status) !== 'draft') {
                return res.status(409).json({ error: `Cannot submit from status ${(existing as any).status}` });
            }
            const updated = await prisma.orm.public.Expense.where({ id: existing.id }).update({ status: 'submitted' });
            res.json(updated);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.post('/:id/review', async (req: AuthRequest, res) => {
        try {
            const parsed = reviewSchema.safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
            const existing = await prisma.orm.public.Expense.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Expense not found' });
            if (String((existing as any).status) !== 'submitted') {
                return res.status(409).json({ error: 'Only submitted expenses can be reviewed' });
            }
            if ((existing as any).submittedById === req.user!.sub) {
                return res.status(403).json({ error: 'You cannot review your own expense' });
            }

            // Approval rules engine (Phase 4.2): above the threshold the actor
            // needs expenses.approve; below it expenses.update suffices.
            const rule = approvalRuleFor('expense');
            const needsApproval = requiresApproval('expense', (existing as any).amount);
            const canApprove = await hasPermission(ctx(req), rule.requiredPermission);
            const canUpdate = await hasPermission(ctx(req), 'expenses.update');
            const allowed = parsed.data.decision === 'approved'
                ? (needsApproval ? canApprove : canUpdate)
                : (canApprove || canUpdate);
            if (!allowed) {
                return res.status(403).json({
                    error: needsApproval
                        ? `Approval required — amount meets the ${rule.requiredPermission} threshold`
                        : 'Missing expenses.update permission',
                });
            }

            const updated = await prisma.orm.public.Expense.where({ id: existing.id }).update({
                status: parsed.data.decision === 'approved' ? 'approved' : 'rejected',
                reviewedById: req.user!.sub,
                reviewedAt: ts(),
                reviewNote: parsed.data.note ?? null,
            });

            await createNotification(
                (existing as any).submittedById,
                'expense.reviewed',
                `Expense ${parsed.data.decision}`,
                `Your expense "${(existing as any).title}" was ${parsed.data.decision}.${parsed.data.note ? ` Note: ${parsed.data.note}` : ''}`,
                '/workspace',
                { expenseId: existing.id, decision: parsed.data.decision },
            );
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: `expense.${parsed.data.decision}`,
                entity: 'Expense',
                entityId: existing.id,
                meta: { amount: (existing as any).amount, thresholdApplied: needsApproval },
            });
            res.json(updated);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.post('/:id/mark-paid', requirePermission('expenses.mark_paid'), async (req: AuthRequest, res) => {
        try {
            const existing = await prisma.orm.public.Expense.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Expense not found' });
            if (String((existing as any).status) !== 'approved') {
                return res.status(409).json({ error: 'Only approved expenses can be marked paid' });
            }
            const updated = await prisma.orm.public.Expense.where({ id: existing.id }).update({ status: 'paid' });
            res.json(updated);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.delete('/:id', async (req: AuthRequest, res) => {
        try {
            const existing = await prisma.orm.public.Expense.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Expense not found' });
            const isOwner = (existing as any).submittedById === req.user!.sub;
            const canDelete = await hasPermission(ctx(req), 'expenses.delete');
            const isDraft = String((existing as any).status) === 'draft';
            if (!canDelete && !(isOwner && isDraft)) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            await prisma.orm.public.Expense.where({ id: existing.id }).delete();
            res.status(204).send();
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    return router;
}
