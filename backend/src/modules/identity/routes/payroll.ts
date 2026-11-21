import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import db from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requirePermission } from '../../../shared/middleware/roles';
import { and } from '@prisma/orm-postgres/orm-client';
import { logAudit } from '../../../shared/services/audit';
import { createNotification } from '../../notifications/services/notifications';
import { computeStatutoryDeductions } from '../services/statutory';
import { sendMail } from '../../../shared/services/email';
import * as payhero from '../../billing/services/payments/payheroService';
import { toMoney } from '../../billing/utils/money';

/**
 * Payroll / payslips (DIGITAL_HQ_PLAN §HR+Finance / ERP expansion).
 * Status machine: draft → approved → paid.
 * Employees always see their own payslips; admin endpoints are gated by
 * payroll.view / payroll.manage / payroll.approve / payroll.mark_paid.
 * Approving your own payslip is blocked (segregation of duties).
 */

const PERIOD_RE = /^\d{4}-\d{2}$/;

const deductionSchema = z.object({
    label: z.string().min(1),
    amount: z.coerce.number().min(0),
});

const createSchema = z.object({
    employeeId: z.string().min(1),
    period: z.string().regex(PERIOD_RE, 'period must be YYYY-MM'),
    grossAmount: z.coerce.number().min(0),
    deductions: z.array(deductionSchema).optional(),
    netAmount: z.coerce.number().min(0).optional(),
    currency: z.string().length(3).optional(),
    payrollRunId: z.string().optional().nullable(),
    notes: z.string().max(4000).optional().nullable(),
});

const updateSchema = createSchema.partial().omit({ employeeId: true, period: true, payrollRunId: true });

const runCreateSchema = z.object({
    period: z.string().regex(PERIOD_RE, 'period must be YYYY-MM'),
    name: z.string().max(120).optional().nullable(),
    currency: z.string().length(3).optional(),
    notes: z.string().max(4000).optional().nullable(),
});

const lineItemSchema = z.object({
    label: z.string().min(1).max(120),
    amount: z.coerce.number().min(0),
    statutory: z.boolean().optional(),
});

const structureSchema = z.object({
    basicSalary: z.coerce.number().min(0),
    currency: z.string().length(3).optional(),
    allowances: z.array(lineItemSchema).max(50).optional(),
    deductions: z.array(lineItemSchema).max(50).optional(),
    isActive: z.boolean().optional(),
});

const generateSchema = z.object({
    period: z.string().regex(PERIOD_RE, 'period must be YYYY-MM'),
    payrollRunId: z.string().optional().nullable(),
    applyStatutory: z.boolean().optional(),
});

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

const sumDeductions = (list: Array<{ amount: number }> | null | undefined) =>
    (Array.isArray(list) ? list : []).reduce((s, d) => s + Number(d.amount || 0), 0);

export default function payrollRouter(prisma: Db = db) {
    const router = Router();
    router.use(requireAuth);

    // Own payslips — always allowed for authenticated staff.
    router.get('/me', async (req: AuthRequest, res) => {
        try {
            const rows = await prisma.orm.public.Payslip
                .where({ employeeId: req.user!.sub })
                .orderBy((p: any) => p.period.desc())
                .all();
            res.json(rows);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ── Admin ──
    router.get('/admin', requirePermission('payroll.view'), async (req: AuthRequest, res) => {
        try {
            const { employeeId, period, status } = req.query;
            const conds: any[] = [
                ...(employeeId ? [(p: any) => p.employeeId.eq(String(employeeId))] : []),
                ...(period ? [(p: any) => p.period.eq(String(period))] : []),
                ...(status ? [(p: any) => p.status.eq(String(status))] : []),
            ];
            const query: any = conds.length
                ? prisma.orm.public.Payslip.where((p: any) => and(...conds.map((c) => c(p))))
                : prisma.orm.public.Payslip;
            const rows = await query
                .orderBy((p: any) => p.period.desc())
                .limit(500)
                .all();
            const names = await employeeNames(prisma, rows.map((r: any) => r.employeeId));
            res.json(rows.map((r: any) => ({ ...r, employee: names.get(r.employeeId) ?? null })));
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/admin', requirePermission('payroll.manage'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const data = parsed.data;
            if (data.payrollRunId) {
                const run = await prisma.orm.public.PayrollRun.where({ id: data.payrollRunId }).first();
                if (!run) return res.status(400).json({ error: 'Payroll run not found' });
                if ((run as any).status !== 'draft') {
                    return res.status(409).json({ error: 'Payslips can only be added to a draft payroll run' });
                }
                if (String((run as any).period) !== data.period) {
                    return res.status(400).json({ error: 'Payslip period must match the payroll run period' });
                }
            }
            const gross = Number(data.grossAmount);
            const deductions = data.deductions ?? [];
            const net = data.netAmount != null
                ? Number(data.netAmount)
                : Math.max(0, gross - sumDeductions(deductions));
            const created = await prisma.orm.public.Payslip.create({
                id: newId(),
                employeeId: data.employeeId,
                period: data.period,
                grossAmount: gross as any,
                deductions: deductions as any,
                netAmount: net as any,
                currency: (data.currency ?? 'KES').toUpperCase(),
                payrollRunId: data.payrollRunId ?? null,
                status: 'draft',
                notes: data.notes ?? null,
                updatedAt: ts(),
            });
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'payslip.create',
                entity: 'Payslip',
                entityId: created!.id,
                meta: { employeeId: data.employeeId, period: data.period, net },
            });
            res.status(201).json(created);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.put('/admin/:id', requirePermission('payroll.manage'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const existing = await prisma.orm.public.Payslip.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Payslip not found' });
            if (String((existing as any).status) !== 'draft') {
                return res.status(409).json({ error: 'Only draft payslips can be edited' });
            }
            const data = parsed.data;
            const payload: any = { updatedAt: ts() };
            if (data.grossAmount !== undefined) payload.grossAmount = Number(data.grossAmount);
            if (data.deductions !== undefined) payload.deductions = data.deductions as any;
            if (data.netAmount !== undefined) payload.netAmount = Number(data.netAmount);
            else if (data.grossAmount !== undefined || data.deductions !== undefined) {
                const gross = payload.grossAmount ?? Number((existing as any).grossAmount);
                const ded = payload.deductions ?? (existing as any).deductions;
                payload.netAmount = Math.max(0, gross - sumDeductions(ded));
            }
            if (data.currency !== undefined) payload.currency = String(data.currency).toUpperCase();
            if (data.notes !== undefined) payload.notes = data.notes;
            const updated = await prisma.orm.public.Payslip.where({ id: existing.id }).update(payload);
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'payslip.update',
                entity: 'Payslip',
                entityId: existing.id,
            });
            res.json(updated);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.post('/admin/:id/approve', requirePermission('payroll.approve'), async (req: AuthRequest, res) => {
        try {
            const existing = await prisma.orm.public.Payslip.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Payslip not found' });
            if (String((existing as any).status) !== 'draft') {
                return res.status(409).json({ error: `Cannot approve a ${String((existing as any).status)} payslip` });
            }
            if ((existing as any).employeeId === req.user!.sub) {
                return res.status(403).json({ error: 'Cannot approve your own payslip' });
            }
            const updated = await prisma.orm.public.Payslip.where({ id: existing.id }).update({
                status: 'approved',
                approvedById: req.user!.sub,
                approvedAt: ts(),
                updatedAt: ts(),
            });
            await createNotification(
                (existing as any).employeeId,
                'payroll.approved',
                'Payslip approved',
                `Your payslip for ${String((existing as any).period)} was approved.`,
                '/workspace',
                { payslipId: existing.id, period: (existing as any).period },
            );
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'payslip.approve',
                entity: 'Payslip',
                entityId: existing.id,
            });
            res.json(updated);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.post('/admin/:id/mark-paid', requirePermission('payroll.mark_paid'), async (req: AuthRequest, res) => {
        try {
            const existing = await prisma.orm.public.Payslip.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Payslip not found' });
            if (String((existing as any).status) !== 'approved') {
                return res.status(409).json({ error: 'Only approved payslips can be marked paid' });
            }
            const updated = await prisma.orm.public.Payslip.where({ id: existing.id }).update({
                status: 'paid',
                paidAt: ts(),
                updatedAt: ts(),
            });
            await createNotification(
                (existing as any).employeeId,
                'payroll.paid',
                'Payslip paid',
                `Your payslip for ${String((existing as any).period)} has been paid.`,
                '/workspace',
                { payslipId: existing.id, period: (existing as any).period },
            );
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'payslip.mark_paid',
                entity: 'Payslip',
                entityId: existing.id,
            });
            res.json(updated);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    // Email the payslip summary to the employee. Only approved/paid
    // payslips can be sent (drafts are still editable).
    router.post('/admin/:id/send', requirePermission('payroll.manage'), async (req: AuthRequest, res) => {
        try {
            const slip = await prisma.orm.public.Payslip.where({ id: req.params.id }).first();
            if (!slip) return res.status(404).json({ error: 'Payslip not found' });
            const status = String((slip as any).status);
            if (status === 'draft') {
                return res.status(409).json({ error: 'Approve the payslip before sending it' });
            }
            const emp = await prisma.orm.public.Employee.where({ id: (slip as any).employeeId }).first();
            const email = (emp as any)?.email;
            if (!email) return res.status(400).json({ error: 'Employee has no email address' });
            const name = [(emp as any).firstName, (emp as any).lastName].filter(Boolean).join(' ') || email;
            const period = String((slip as any).period);
            const currency = String((slip as any).currency ?? 'KES');
            const gross = Number((slip as any).grossAmount ?? 0);
            const net = Number((slip as any).netAmount ?? 0);
            const deductions = Array.isArray((slip as any).deductions) ? (slip as any).deductions : [];
            const dedRows = deductions.map((d: any) =>
                `<tr><td style="padding:4px 12px 4px 0">${d.label}</td><td style="padding:4px 0;text-align:right">${currency} ${Number(d.amount).toLocaleString()}</td></tr>`).join('');
            await sendMail({
                to: email,
                subject: `Payslip — ${period} (${currency} ${net.toLocaleString()} net)`,
                purpose: 'general',
                text: `Hi ${name},\n\nYour payslip for ${period} is ready.\nGross: ${currency} ${gross.toLocaleString()}\nNet: ${currency} ${net.toLocaleString()}\n\n— AngiSoft`,
                html: `<p>Hi ${name},</p><p>Your payslip for <strong>${period}</strong> is ready.</p>
<table style="border-collapse:collapse;font-family:sans-serif">
<tr><td style="padding:4px 12px 4px 0">Gross</td><td style="text-align:right">${currency} ${gross.toLocaleString()}</td></tr>
${dedRows}
<tr><td style="padding:4px 12px 4px 0;font-weight:600">Net</td><td style="text-align:right;font-weight:600">${currency} ${net.toLocaleString()}</td></tr>
</table><p>— AngiSoft</p>`,
            });
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'payslip.send',
                entity: 'Payslip',
                entityId: (slip as any).id,
                meta: { employeeId: (slip as any).employeeId, period, status },
            });
            res.json({ ok: true, sentTo: email });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    // Disburse an approved payslip's net amount via PayHero (mobile money by
    // default). Idempotent on reference SAL-<payslipId>; success marks the
    // payslip paid and notifies the employee.
    router.post('/admin/:id/pay-out', requirePermission('payroll.mark_paid'), async (req: AuthRequest, res) => {
        try {
            if (!payhero.isConfigured()) {
                return res.status(503).json({ error: 'PayHero payouts are not configured' });
            }
            const slip = await prisma.orm.public.Payslip.where({ id: req.params.id }).first();
            if (!slip) return res.status(404).json({ error: 'Payslip not found' });
            if (String((slip as any).status) !== 'approved') {
                return res.status(409).json({ error: 'Only approved payslips can be paid out' });
            }
            const emp = await prisma.orm.public.Employee.where({ id: (slip as any).employeeId }).first();
            const phone = String(req.body?.phone ?? (emp as any)?.phone ?? '').trim();
            if (!phone) return res.status(400).json({ error: 'Employee has no phone number for payout' });
            const networkCode = String(req.body?.networkCode ?? 'MPESA');
            const amount = Number((slip as any).netAmount ?? 0);
            if (!(amount > 0)) return res.status(400).json({ error: 'Payslip net amount must be positive' });
            const reference = `SAL-${String((slip as any).id)}`.slice(0, 50);

            const prior = await prisma.orm.public.Payout.where({ reference }).first();
            if (prior) return res.json({ ok: true, reused: true, payout: prior });

            const payout = await prisma.orm.public.Payout.create({
                id: newId(),
                provider: 'PAYHERO',
                reference,
                channel: 'mobile',
                phoneNumber: phone,
                networkCode,
                amount: toMoney(amount) as any,
                currency: String((slip as any).currency ?? 'KES'),
                status: 'PENDING',
                metadata: { payslipId: (slip as any).id, employeeId: (slip as any).employeeId },
                updatedAt: ts(),
            });
            try {
                const pushed = await payhero.withdraw({
                    amount, reference, channel: 'mobile', phone, networkCode,
                    description: `Salary ${String((slip as any).period)}`,
                });
                await prisma.orm.public.Payout.where({ id: (payout as any).id }).update({
                    providerReference: pushed.providerReference || pushed.checkoutRequestId || null,
                    status: pushed.success === false ? 'FAILED' : 'PROCESSING',
                    metadata: { ...(pushed.meta || {}), payslipId: (slip as any).id },
                    updatedAt: ts(),
                });
                const updatedSlip = await prisma.orm.public.Payslip.where({ id: (slip as any).id }).update({
                    status: 'paid',
                    paidAt: ts(),
                    updatedAt: ts(),
                });
                await createNotification(
                    (slip as any).employeeId,
                    'payroll.paid',
                    'Salary paid',
                    `Your payslip for ${String((slip as any).period)} has been paid out (${String((slip as any).currency ?? 'KES')} ${amount.toLocaleString()}).`,
                    '/workspace',
                    { payslipId: (slip as any).id, payoutReference: reference },
                );
                await logAudit({
                    actorId: req.user!.sub,
                    actorRole: req.user!.role ?? null,
                    action: 'payslip.pay_out',
                    entity: 'Payslip',
                    entityId: String((slip as any).id),
                    meta: { reference, amount, phone },
                });
                res.json({ ok: true, reused: false, payout, payslip: updatedSlip });
            } catch (err: any) {
                await prisma.orm.public.Payout.where({ id: (payout as any).id }).update({
                    status: 'FAILED',
                    metadata: { error: err?.message || String(err), payslipId: (slip as any).id },
                    updatedAt: ts(),
                });
                res.status(502).json({ error: `Payout failed: ${err?.message || err}` });
            }
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.delete('/admin/:id', requirePermission('payroll.manage'), async (req: AuthRequest, res) => {
        try {
            const existing = await prisma.orm.public.Payslip.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Payslip not found' });
            if (String((existing as any).status) !== 'draft') {
                return res.status(409).json({ error: 'Only draft payslips can be deleted' });
            }
            await prisma.orm.public.Payslip.where({ id: existing.id }).delete();
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'payslip.delete',
                entity: 'Payslip',
                entityId: existing.id,
            });
            res.json({ ok: true });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    // ── Payroll runs ──
    // A run groups the payslips generated for one period and snapshots
    // totals on completion. draft → completed | cancelled.

    router.get('/runs', requirePermission('payroll.view'), async (_req: AuthRequest, res) => {
        try {
            const rows = await prisma.orm.public.PayrollRun
                .orderBy((r: any) => r.period.desc())
                .limit(200)
                .all();
            res.json(rows);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/runs', requirePermission('payroll.manage'), async (req: AuthRequest, res) => {
        const parsed = runCreateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const data = parsed.data;
            const existing = await prisma.orm.public.PayrollRun.where({ period: data.period }).first();
            if (existing) {
                return res.status(409).json({ error: `A payroll run already exists for ${data.period}` });
            }
            const created = await prisma.orm.public.PayrollRun.create({
                id: newId(),
                period: data.period,
                name: data.name ?? null,
                currency: (data.currency ?? 'KES').toUpperCase(),
                notes: data.notes ?? null,
                createdById: req.user!.sub,
                status: 'draft',
                updatedAt: ts(),
            });
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'payroll_run.create',
                entity: 'PayrollRun',
                entityId: created!.id,
                meta: { period: data.period },
            });
            res.status(201).json(created);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.get('/runs/:id', requirePermission('payroll.view'), async (req: AuthRequest, res) => {
        try {
            const run = await prisma.orm.public.PayrollRun.where({ id: req.params.id }).first();
            if (!run) return res.status(404).json({ error: 'Payroll run not found' });
            const payslips = await prisma.orm.public.Payslip
                .where({ payrollRunId: req.params.id })
                .orderBy((p: any) => p.employeeId.asc())
                .all();
            const names = await employeeNames(prisma, payslips.map((p: any) => p.employeeId));
            res.json({
                ...run,
                payslips: payslips.map((p: any) => ({ ...p, employee: names.get(p.employeeId) ?? null })),
            });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/runs/:id/complete', requirePermission('payroll.approve'), async (req: AuthRequest, res) => {
        try {
            const run = await prisma.orm.public.PayrollRun.where({ id: req.params.id }).first();
            if (!run) return res.status(404).json({ error: 'Payroll run not found' });
            if ((run as any).status !== 'draft') {
                return res.status(409).json({ error: `Run is already ${String((run as any).status)}` });
            }
            const payslips = await prisma.orm.public.Payslip
                .where({ payrollRunId: req.params.id })
                .all();
            let gross = 0;
            let deductions = 0;
            let net = 0;
            for (const p of payslips as any[]) {
                gross += Number(p.grossAmount ?? 0);
                net += Number(p.netAmount ?? 0);
                deductions += sumDeductions(p.deductions);
            }
            const updated = await prisma.orm.public.PayrollRun
                .where({ id: (run as any).id })
                .update({
                    status: 'completed',
                    payslipCount: payslips.length,
                    grossTotal: gross as any,
                    deductionTotal: deductions as any,
                    netTotal: net as any,
                    completedAt: ts(),
                    updatedAt: ts(),
                });
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'payroll_run.complete',
                entity: 'PayrollRun',
                entityId: (run as any).id,
                meta: { period: (run as any).period, payslipCount: payslips.length, net },
            });
            res.json(updated);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.post('/runs/:id/cancel', requirePermission('payroll.manage'), async (req: AuthRequest, res) => {
        try {
            const run = await prisma.orm.public.PayrollRun.where({ id: req.params.id }).first();
            if (!run) return res.status(404).json({ error: 'Payroll run not found' });
            if ((run as any).status !== 'draft') {
                return res.status(409).json({ error: `Run is already ${String((run as any).status)}` });
            }
            const updated = await prisma.orm.public.PayrollRun
                .where({ id: (run as any).id })
                .update({ status: 'cancelled', updatedAt: ts() });
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'payroll_run.cancel',
                entity: 'PayrollRun',
                entityId: (run as any).id,
            });
            res.json(updated);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    // ── Salary structures ──
    // One active structure per employee: basic salary + allowance/deduction
    // line items (deductions may be flagged statutory). Used by /admin/generate
    // to produce draft payslips for a period.

    router.get('/admin/structures', requirePermission('payroll.view'), async (_req: AuthRequest, res) => {
        try {
            const rows = await prisma.orm.public.SalaryStructure
                .orderBy((s: any) => s.employeeId.asc())
                .limit(1000)
                .all();
            const names = await employeeNames(prisma, rows.map((r: any) => r.employeeId));
            res.json(rows.map((r: any) => ({ ...r, employee: names.get(r.employeeId) ?? null })));
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.put('/admin/structures/:employeeId', requirePermission('payroll.manage'), async (req: AuthRequest, res) => {
        const parsed = structureSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const employeeId = req.params.employeeId;
            const employee = await prisma.orm.public.Employee.where({ id: employeeId }).first();
            if (!employee) return res.status(404).json({ error: 'Employee not found' });
            const data = parsed.data;
            const existing = await prisma.orm.public.SalaryStructure.where({ employeeId }).first();
            const payload: any = {
                basicSalary: data.basicSalary as any,
                currency: (data.currency ?? 'KES').toUpperCase(),
                allowances: (data.allowances ?? []) as any,
                deductions: (data.deductions ?? []) as any,
                isActive: data.isActive ?? true,
                updatedAt: ts(),
            };
            const saved = existing
                ? await prisma.orm.public.SalaryStructure.where({ id: (existing as any).id }).update(payload)
                : await prisma.orm.public.SalaryStructure.create({
                    id: newId(),
                    employeeId,
                    ...payload,
                });
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: existing ? 'salary_structure.update' : 'salary_structure.create',
                entity: 'SalaryStructure',
                entityId: (saved as any)?.id ?? employeeId,
                meta: { employeeId, basicSalary: data.basicSalary },
            });
            res.json(saved);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.delete('/admin/structures/:employeeId', requirePermission('payroll.manage'), async (req: AuthRequest, res) => {
        try {
            const existing = await prisma.orm.public.SalaryStructure.where({ employeeId: req.params.employeeId }).first();
            if (!existing) return res.status(404).json({ error: 'Salary structure not found' });
            await prisma.orm.public.SalaryStructure.where({ id: (existing as any).id }).delete();
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'salary_structure.delete',
                entity: 'SalaryStructure',
                entityId: (existing as any).id,
            });
            res.json({ ok: true });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    // Preview the computed statutory deduction set for a gross amount.
    router.get('/admin/statutory-preview', requirePermission('payroll.view'), async (req: AuthRequest, res) => {
        const gross = Number(req.query.gross);
        if (!Number.isFinite(gross) || gross < 0) {
            return res.status(400).json({ error: 'gross must be a non-negative number' });
        }
        const lines = computeStatutoryDeductions(gross);
        res.json({ gross, deductions: lines, total: sumDeductions(lines) });
    });

    // Generate draft payslips for every active salary structure in a period.
    // Employees who already have a payslip for the period are skipped.
    router.post('/admin/generate', requirePermission('payroll.manage'), async (req: AuthRequest, res) => {
        const parsed = generateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const { period, payrollRunId, applyStatutory } = parsed.data;
            if (payrollRunId) {
                const run = await prisma.orm.public.PayrollRun.where({ id: payrollRunId }).first();
                if (!run) return res.status(400).json({ error: 'Payroll run not found' });
                if ((run as any).status !== 'draft') {
                    return res.status(409).json({ error: 'Payslips can only be added to a draft payroll run' });
                }
                if (String((run as any).period) !== period) {
                    return res.status(400).json({ error: 'Period must match the payroll run period' });
                }
            }
            const structures = (await prisma.orm.public.SalaryStructure
                .where({ isActive: true })
                .all()) as any[];
            let created = 0;
            let skipped = 0;
            for (const s of structures) {
                const existing = await prisma.orm.public.Payslip
                    .where({ employeeId: s.employeeId, period })
                    .first();
                if (existing) { skipped += 1; continue; }
                const allowances = Array.isArray(s.allowances) ? s.allowances : [];
                const structureDeductions = Array.isArray(s.deductions) ? s.deductions : [];
                const gross = Number(s.basicSalary ?? 0) + sumDeductions(allowances);
                // When statutory computation is requested, structure lines flagged
                // statutory are replaced by the computed PAYE/SHIF/NSSF/levy set;
                // non-statutory lines (loans, advances) are kept as-is.
                const deductions = applyStatutory
                    ? [
                        ...structureDeductions.filter((d: any) => !d.statutory),
                        ...computeStatutoryDeductions(gross),
                    ]
                    : structureDeductions;
                const net = Math.max(0, gross - sumDeductions(deductions));
                await prisma.orm.public.Payslip.create({
                    id: newId(),
                    employeeId: s.employeeId,
                    period,
                    grossAmount: gross as any,
                    deductions: deductions.map(({ label, amount, statutory }: any) => ({ label, amount, ...(statutory ? { statutory: true } : {}) })) as any,
                    netAmount: net as any,
                    currency: String(s.currency ?? 'KES').toUpperCase(),
                    payrollRunId: payrollRunId ?? null,
                    status: 'draft',
                    notes: 'Generated from salary structure',
                    updatedAt: ts(),
                });
                created += 1;
            }
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'payslip.generate',
                entity: 'Payslip',
                entityId: period,
                meta: { period, created, skipped, payrollRunId: payrollRunId ?? null, applyStatutory: !!applyStatutory },
            });
            res.json({ period, created, skipped });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    return router;
}
