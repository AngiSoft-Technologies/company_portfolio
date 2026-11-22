import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { ensureEmployeeEmail, normalizeEmail } from '../services/employeeEmail';

const upsertSchema = z.object({
  email: z.string().email(),
  isPrimary: z.boolean().optional(),
  verified: z.boolean().optional(),
  source: z.string().optional(),
});

export default function employeeEmailsRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/:employeeId/emails', requireAccess('staff.view', ['ADMIN', 'SUPER_ADMIN', 'HR']), async (req, res) => {
    const employeeId = req.params.employeeId;
    const emails = await (prisma.orm.public.EmployeeEmail.where({ employeeId } as any).orderBy([(e: any) => e.isPrimary.desc(), (e: any) => e.createdAt.asc()]).all() as unknown as Promise<any[]>).catch(() => [] as any);
    res.json({ emails });
  });

  router.post('/:employeeId/emails', requireAccess('staff.update', ['ADMIN', 'SUPER_ADMIN', 'HR']), async (req: AuthRequest, res) => {
    const employeeId = req.params.employeeId;
    const body = upsertSchema.parse(req.body);
    const email = normalizeEmail(body.email);
    const existing = await prisma.orm.public.Employee.where({ id: employeeId } as any).first();
    if (!existing) return res.status(404).json({ error: 'Employee not found' });
    const row = await ensureEmployeeEmail(prisma, employeeId, email, { isPrimary: body.isPrimary, verified: body.verified ?? true, source: body.source ?? 'admin' });
    if (body.isPrimary) {
      await prisma.orm.public.Employee.where({ id: employeeId } as any).update({ email } as any).catch(() => {});
    }
    await logAudit({ actorId: req.user?.sub, actorRole: req.user?.role as any, action: 'employee.email.upsert', entity: 'Employee', entityId: employeeId, meta: { email, isPrimary: Boolean(body.isPrimary) } });
    res.status(201).json({ email: row });
  });

  router.delete('/:employeeId/emails/:emailId', requireAccess('staff.update', ['ADMIN', 'SUPER_ADMIN', 'HR']), async (req: AuthRequest, res) => {
    const { employeeId, emailId } = req.params as any;
    const row = await prisma.orm.public.EmployeeEmail.where({ id: emailId, employeeId } as any).first().catch(() => null);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if ((row as any).isPrimary) return res.status(400).json({ error: 'Cannot delete primary email; set another primary first' });
    await prisma.orm.public.EmployeeEmail.where({ id: emailId } as any).delete();
    await logAudit({ actorId: req.user?.sub, actorRole: req.user?.role as any, action: 'employee.email.delete', entity: 'Employee', entityId: employeeId, meta: { emailId } });
    res.json({ ok: true });
  });

  return router;
}
