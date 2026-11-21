import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import db from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requirePermission } from '../../../shared/middleware/roles';
import { has as hasPermission } from '../services/effectivePermissions';
import { and } from '@prisma/orm-postgres/orm-client';
import { logAudit } from '../../../shared/services/audit';
import { deriveAttendanceForDate } from '../services/attendanceDerive';

/**
 * Staff attendance (DIGITAL_HQ_PLAN §HR / ERP expansion).
 * Self check-in/check-out for the caller; admin CRUD gated by
 * attendance.view / attendance.manage. workDate is stored as a
 * date-only ISO string (YYYY-MM-DD).
 */

const STATUSES = ['present', 'absent', 'leave', 'remote', 'holiday'] as const;

const adminCreateSchema = z.object({
    employeeId: z.string().min(1),
    workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'workDate must be YYYY-MM-DD'),
    checkInAt: z.string().optional().nullable(),
    checkOutAt: z.string().optional().nullable(),
    status: z.enum(STATUSES).optional(),
    notes: z.string().max(2000).optional().nullable(),
});

const adminUpdateSchema = adminCreateSchema.partial().omit({ employeeId: true, workDate: true });

const holidaySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    name: z.string().min(1).max(120),
    isHalfDay: z.boolean().optional(),
});

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const importRowSchema = z.object({
    employeeId: z.string().optional(),
    employeeEmail: z.string().optional(),
    workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'workDate must be YYYY-MM-DD'),
    checkInAt: z.string().optional().nullable(),
    checkOutAt: z.string().optional().nullable(),
    status: z.enum(STATUSES).optional(),
    notes: z.string().max(2000).optional().nullable(),
});

const importSchema = z.object({
    rows: z.array(z.unknown()).min(1).max(500),
});
const scheduleSchema = z.object({
    days: z.array(z.object({
        weekday: z.number().int().min(0).max(6),
        startTime: z.string().regex(TIME_RE).optional().nullable(),
        endTime: z.string().regex(TIME_RE).optional().nullable(),
        isWorkingDay: z.boolean().optional(),
    })).max(7),
});

const todayKey = () => new Date().toISOString().slice(0, 10);
const dayStart = (d: string) => ts(`${d}T00:00:00.000Z`);

const ctx = (req: AuthRequest) => ({ employeeId: req.user!.sub, systemRole: req.user!.role });

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

export default function attendanceRouter(prisma: Db = db) {
    const router = Router();
    router.use(requireAuth);

    // ── Self service ──
    router.post('/check-in', async (req: AuthRequest, res) => {
        try {
            const can = await hasPermission(ctx(req), 'attendance.record');
            if (!can) return res.status(403).json({ error: 'Forbidden' });
            const workDate = todayKey();
            const existing = await prisma.orm.public.AttendanceRecord
                .where({ employeeId: req.user!.sub, workDate: dayStart(workDate) })
                .first();
            if (existing?.checkInAt) {
                return res.status(409).json({ error: 'Already checked in today', record: existing });
            }
            if (existing) {
                const updated = await prisma.orm.public.AttendanceRecord
                    .where({ id: existing.id })
                    .update({ checkInAt: ts(), status: 'present', updatedAt: ts() });
                return res.json(updated);
            }
            const created = await prisma.orm.public.AttendanceRecord.create({
                id: newId(),
                employeeId: req.user!.sub,
                workDate: dayStart(workDate),
                checkInAt: ts(),
                status: 'present',
                source: 'manual',
                updatedAt: ts(),
            });
            res.status(201).json(created);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.post('/check-out', async (req: AuthRequest, res) => {
        try {
            const can = await hasPermission(ctx(req), 'attendance.record');
            if (!can) return res.status(403).json({ error: 'Forbidden' });
            const workDate = todayKey();
            const existing = await prisma.orm.public.AttendanceRecord
                .where({ employeeId: req.user!.sub, workDate: dayStart(workDate) })
                .first();
            if (!existing) return res.status(404).json({ error: 'No check-in found for today' });
            if (existing.checkOutAt) {
                return res.status(409).json({ error: 'Already checked out today', record: existing });
            }
            const updated = await prisma.orm.public.AttendanceRecord
                .where({ id: existing.id })
                .update({ checkOutAt: ts(), updatedAt: ts() });
            res.json(updated);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.get('/me', async (req: AuthRequest, res) => {
        try {
            const can = await hasPermission(ctx(req), 'attendance.record');
            if (!can) return res.status(403).json({ error: 'Forbidden' });
            const { from, to } = req.query;
            const rows = await prisma.orm.public.AttendanceRecord
                .where((r: any) => and(
                    r.employeeId.eq(req.user!.sub),
                    ...(from ? [r.workDate.gte(dayStart(String(from)))] : []),
                    ...(to ? [r.workDate.lte(dayStart(String(to)))] : []),
                ))
                .orderBy((r: any) => r.workDate.desc())
                .limit(120)
                .all();
            res.json(rows);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ── Admin ──
    router.get('/admin', requirePermission('attendance.view'), async (req: AuthRequest, res) => {
        try {
            const { employeeId, from, to } = req.query;
            const conds: any[] = [
                ...(employeeId ? [(r: any) => r.employeeId.eq(String(employeeId))] : []),
                ...(from ? [(r: any) => r.workDate.gte(dayStart(String(from)))] : []),
                ...(to ? [(r: any) => r.workDate.lte(dayStart(String(to)))] : []),
            ];
            const query: any = conds.length
                ? prisma.orm.public.AttendanceRecord.where((r: any) => and(...conds.map((c) => c(r))))
                : prisma.orm.public.AttendanceRecord;
            const rows = await query
                .orderBy((r: any) => r.workDate.desc())
                .limit(500)
                .all();
            const names = await employeeNames(prisma, rows.map((r: any) => r.employeeId));
            res.json(rows.map((r: any) => ({ ...r, employee: names.get(r.employeeId) ?? null })));
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/admin', requirePermission('attendance.manage'), async (req: AuthRequest, res) => {
        const parsed = adminCreateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const data = parsed.data;
            const created = await prisma.orm.public.AttendanceRecord.create({
                id: newId(),
                employeeId: data.employeeId,
                workDate: dayStart(data.workDate),
                checkInAt: data.checkInAt ? ts(data.checkInAt) : null,
                checkOutAt: data.checkOutAt ? ts(data.checkOutAt) : null,
                status: data.status ?? 'present',
                source: 'manual',
                notes: data.notes ?? null,
                updatedAt: ts(),
            });
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'attendance.create',
                entity: 'AttendanceRecord',
                entityId: created!.id,
                meta: { employeeId: data.employeeId, workDate: data.workDate },
            });
            res.status(201).json(created);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.put('/admin/:id', requirePermission('attendance.manage'), async (req: AuthRequest, res) => {
        const parsed = adminUpdateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const existing = await prisma.orm.public.AttendanceRecord.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Record not found' });
            const data = parsed.data;
            const payload: any = { updatedAt: ts() };
            for (const [k, v] of Object.entries(data)) {
                if (v === undefined) continue;
                if ((k === 'checkInAt' || k === 'checkOutAt') && v) payload[k] = ts(String(v));
                else payload[k] = v;
            }
            const updated = await prisma.orm.public.AttendanceRecord.where({ id: existing.id }).update(payload);
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'attendance.update',
                entity: 'AttendanceRecord',
                entityId: existing.id,
            });
            res.json(updated);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.delete('/admin/:id', requirePermission('attendance.manage'), async (req: AuthRequest, res) => {
        try {
            const existing = await prisma.orm.public.AttendanceRecord.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Record not found' });
            await prisma.orm.public.AttendanceRecord.where({ id: existing.id }).delete();
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'attendance.delete',
                entity: 'AttendanceRecord',
                entityId: existing.id,
            });
            res.json({ ok: true });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    // ── Holidays ──
    router.get('/admin/holidays', requirePermission('attendance.view'), async (_req: AuthRequest, res) => {
        try {
            const rows = await prisma.orm.public.Holiday
                .orderBy((h: any) => h.date.asc())
                .limit(500)
                .all();
            res.json(rows);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/admin/holidays', requirePermission('attendance.manage'), async (req: AuthRequest, res) => {
        const parsed = holidaySchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const data = parsed.data;
            const dupe = await prisma.orm.public.Holiday.where({ date: dayStart(data.date) }).first();
            if (dupe) return res.status(409).json({ error: 'A holiday already exists on that date' });
            const created = await prisma.orm.public.Holiday.create({
                id: newId(),
                date: dayStart(data.date),
                name: data.name,
                isHalfDay: data.isHalfDay ?? false,
                updatedAt: ts(),
            });
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'holiday.create',
                entity: 'Holiday',
                entityId: created!.id,
                meta: { date: data.date, name: data.name },
            });
            res.status(201).json(created);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.put('/admin/holidays/:id', requirePermission('attendance.manage'), async (req: AuthRequest, res) => {
        const parsed = holidaySchema.partial().safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const existing = await prisma.orm.public.Holiday.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Holiday not found' });
            const data = parsed.data;
            const payload: any = { updatedAt: ts() };
            if (data.date !== undefined) payload.date = dayStart(data.date);
            if (data.name !== undefined) payload.name = data.name;
            if (data.isHalfDay !== undefined) payload.isHalfDay = data.isHalfDay;
            const updated = await prisma.orm.public.Holiday.where({ id: existing.id }).update(payload);
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'holiday.update',
                entity: 'Holiday',
                entityId: existing.id,
            });
            res.json(updated);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.delete('/admin/holidays/:id', requirePermission('attendance.manage'), async (req: AuthRequest, res) => {
        try {
            const existing = await prisma.orm.public.Holiday.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Holiday not found' });
            await prisma.orm.public.Holiday.where({ id: existing.id }).delete();
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'holiday.delete',
                entity: 'Holiday',
                entityId: existing.id,
            });
            res.json({ ok: true });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    // ── Work schedules ──
    router.get('/me/schedule', async (req: AuthRequest, res) => {
        try {
            const can = await hasPermission(ctx(req), 'attendance.record');
            if (!can) return res.status(403).json({ error: 'Forbidden' });
            const rows = await prisma.orm.public.WorkSchedule
                .where({ employeeId: req.user!.sub })
                .orderBy((s: any) => s.weekday.asc())
                .all();
            res.json(rows);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/admin/schedules', requirePermission('attendance.view'), async (req: AuthRequest, res) => {
        try {
            const { employeeId } = req.query;
            const rows = employeeId
                ? await prisma.orm.public.WorkSchedule
                    .where({ employeeId: String(employeeId) })
                    .orderBy((s: any) => s.weekday.asc())
                    .all()
                : await prisma.orm.public.WorkSchedule
                    .orderBy((s: any) => s.employeeId.asc())
                    .limit(2000)
                    .all();
            const names = await employeeNames(prisma, rows.map((r: any) => r.employeeId));
            res.json(rows.map((r: any) => ({ ...r, employee: names.get(r.employeeId) ?? null })));
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // Replace-all semantics: the provided day list becomes the employee's
    // full week schedule (missing weekdays are removed).
    router.put('/admin/schedules/:employeeId', requirePermission('attendance.manage'), async (req: AuthRequest, res) => {
        const parsed = scheduleSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const employeeId = req.params.employeeId;
            const employee = await prisma.orm.public.Employee.where({ id: employeeId }).first();
            if (!employee) return res.status(404).json({ error: 'Employee not found' });
            const seen = new Set<number>();
            for (const day of parsed.data.days) {
                if (seen.has(day.weekday)) {
                    return res.status(400).json({ error: `Duplicate weekday ${day.weekday}` });
                }
                seen.add(day.weekday);
            }
            const existing = await prisma.orm.public.WorkSchedule.where({ employeeId }).all();
            for (const row of existing) {
                await prisma.orm.public.WorkSchedule.where({ id: (row as any).id }).delete();
            }
            const created = [];
            for (const day of parsed.data.days) {
                created.push(await prisma.orm.public.WorkSchedule.create({
                    id: newId(),
                    employeeId,
                    weekday: day.weekday,
                    startTime: day.startTime ?? null,
                    endTime: day.endTime ?? null,
                    isWorkingDay: day.isWorkingDay ?? true,
                    updatedAt: ts(),
                }));
            }
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'schedule.replace',
                entity: 'WorkSchedule',
                entityId: employeeId,
                meta: { days: parsed.data.days.length },
            });
            res.json(created);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    // Per-employee aggregate report over a date range: status counts plus
    // total worked minutes derived from check-in/check-out pairs.
    router.get('/admin/report', requirePermission('attendance.view'), async (req: AuthRequest, res) => {
        try {
            const { employeeId, from, to } = req.query;
            const conds: any[] = [
                ...(employeeId ? [(r: any) => r.employeeId.eq(String(employeeId))] : []),
                ...(from ? [(r: any) => r.workDate.gte(dayStart(String(from)))] : []),
                ...(to ? [(r: any) => r.workDate.lte(dayStart(String(to)))] : []),
            ];
            const base: any = conds.length
                ? prisma.orm.public.AttendanceRecord.where((r: any) => and(...conds.map((c) => c(r))))
                : prisma.orm.public.AttendanceRecord;
            const rows = await base
                .orderBy((r: any) => r.workDate.asc())
                .limit(10000)
                .all();
            const byEmp = new Map<string, { records: number; minutes: number; byStatus: Record<string, number> }>();
            for (const row of rows as any[]) {
                const agg = byEmp.get(row.employeeId) ?? { records: 0, minutes: 0, byStatus: {} };
                agg.records += 1;
                agg.byStatus[row.status] = (agg.byStatus[row.status] ?? 0) + 1;
                if (row.checkInAt && row.checkOutAt) {
                    const mins = Math.max(0, Math.round((new Date(row.checkOutAt).getTime() - new Date(row.checkInAt).getTime()) / 60000));
                    agg.minutes += mins;
                }
                byEmp.set(row.employeeId, agg);
            }
            const names = await employeeNames(prisma, [...byEmp.keys()]);
            const report = [...byEmp.entries()].map(([empId, agg]) => ({
                employeeId: empId,
                employee: names.get(empId) ?? null,
                records: agg.records,
                totalMinutes: agg.minutes,
                hoursWorked: Math.round((agg.minutes / 60) * 10) / 10,
                byStatus: agg.byStatus,
            })).sort((a, b) => b.records - a.records);
            res.json({ from: from ?? null, to: to ?? null, employees: report });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // Schedule-aware derivation for a work date (default: today) — see
    // services/attendanceDerive.ts; shared with the nightly worker.
    router.post('/admin/derive', requirePermission('attendance.manage'), async (req: AuthRequest, res) => {
        try {
            const workDate = typeof req.body?.workDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.workDate)
                ? req.body.workDate
                : todayKey();
            const result = await deriveAttendanceForDate(prisma, workDate);
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'attendance.derive',
                entity: 'AttendanceRecord',
                entityId: workDate,
                meta: result,
            });
            res.json(result);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    // Bulk import: rows identified by employeeId or employeeEmail; existing
    // records for the same employee+workDate are updated, others created with
    // source 'import'. Per-row errors are collected, not fatal.
    router.post('/admin/import', requirePermission('attendance.manage'), async (req: AuthRequest, res) => {
        const parsed = importSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            // Resolve employee emails → ids in one pass.
            const emails = [...new Set(
                parsed.data.rows
                    .map((r: any) => (r && typeof r === 'object' ? String(r.employeeEmail ?? '').trim().toLowerCase() : ''))
                    .filter(Boolean),
            )];
            const emailToId = new Map<string, string>();
            const validIds = new Set<string>();
            if (emails.length) {
                const emps = await prisma.orm.public.Employee
                    .where((e: any) => e.email.in(emails))
                    .all();
                for (const e of emps as any[]) {
                    if (e.email) emailToId.set(String(e.email).toLowerCase(), e.id);
                    validIds.add(e.id);
                }
            }
            const explicitIds = [...new Set(
                parsed.data.rows
                    .map((r: any) => (r && typeof r === 'object' ? String(r.employeeId ?? '').trim() : ''))
                    .filter(Boolean),
            )];
            const missingIds = explicitIds.filter((id) => !validIds.has(id) && !emailToId.has(id));
            if (missingIds.length) {
                const emps = await prisma.orm.public.Employee
                    .where((e: any) => e.id.in(missingIds))
                    .all();
                for (const e of emps as any[]) validIds.add(e.id);
            }

            let created = 0;
            let updated = 0;
            const errors: Array<{ row: number; error: string }> = [];
            for (let i = 0; i < parsed.data.rows.length; i++) {
                const rowParsed = importRowSchema.safeParse(parsed.data.rows[i]);
                if (!rowParsed.success) {
                    errors.push({ row: i + 1, error: 'Invalid row shape' });
                    continue;
                }
                const row = rowParsed.data;
                const employeeId = row.employeeId
                    ?? (row.employeeEmail ? emailToId.get(row.employeeEmail.trim().toLowerCase()) : undefined);
                if (!employeeId || !validIds.has(employeeId)) {
                    errors.push({ row: i + 1, error: 'Unknown employee (provide employeeId or a known employeeEmail)' });
                    continue;
                }
                try {
                    const existing = await prisma.orm.public.AttendanceRecord
                        .where({ employeeId, workDate: dayStart(row.workDate) })
                        .first();
                    const payload: any = {
                        checkInAt: row.checkInAt ? ts(row.checkInAt) : null,
                        checkOutAt: row.checkOutAt ? ts(row.checkOutAt) : null,
                        status: row.status ?? 'present',
                        notes: row.notes ?? null,
                        updatedAt: ts(),
                    };
                    if (existing) {
                        await prisma.orm.public.AttendanceRecord.where({ id: (existing as any).id }).update(payload);
                        updated += 1;
                    } else {
                        await prisma.orm.public.AttendanceRecord.create({
                            id: newId(),
                            employeeId,
                            workDate: dayStart(row.workDate),
                            source: 'import',
                            ...payload,
                        });
                        created += 1;
                    }
                } catch (err: any) {
                    errors.push({ row: i + 1, error: err.message ?? 'Row failed' });
                }
            }
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'attendance.import',
                entity: 'AttendanceRecord',
                entityId: 'bulk',
                meta: { created, updated, errors: errors.length, total: parsed.data.rows.length },
            });
            res.json({ created, updated, errors });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    return router;
}
