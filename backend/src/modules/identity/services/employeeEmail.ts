import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';

export const normalizeEmail = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

export async function findEmployeeByEmail(prisma: Db, emailRaw: unknown) {
  const email = normalizeEmail(emailRaw);
  if (!email) return null;
  // Primary/canonical first
  const byPrimary = await prisma.orm.public.Employee.where({ email } as any).first();
  if (byPrimary) return byPrimary;
  // Normalized EmployeeEmail table (may be absent in partial test mocks)
  try {
    const table: any = (prisma as any)?.orm?.public?.EmployeeEmail;
    if (table?.where) {
      const mapped = await table.where({ email } as any).include('employee').first();
      if ((mapped as any)?.employee) return (mapped as any).employee;
    }
  } catch {}
  // Legacy additionalEmails array (best effort for schemas/migrations in transition)
  try {
    const candidates = await prisma.orm.public.Employee.select('id', 'email', 'additionalEmails', 'passwordHash', 'role', 'firstName', 'lastName', 'twoFactorEnabled', 'twoFactorSecret', 'mfaRequired').all();
    const hit = (candidates as any[]).find((e) => Array.isArray(e.additionalEmails) && e.additionalEmails.map(normalizeEmail).includes(email));
    if (hit) return prisma.orm.public.Employee.where({ id: hit.id } as any).first();
  } catch {}
  return null;
}

export async function ensureEmployeeEmail(prisma: Db, employeeId: string, emailRaw: unknown, opts?: { isPrimary?: boolean; source?: string; verified?: boolean }) {
  const email = normalizeEmail(emailRaw);
  if (!email) return null;
  try {
    const table: any = (prisma as any)?.orm?.public?.EmployeeEmail;
    if (!table?.where) return null;
    const existing = await table.where({ email } as any).first().catch(() => null);
    if (existing) {
      if (opts?.isPrimary && !existing.isPrimary) {
        await table.where({ employeeId } as any).updateAll({ isPrimary: false } as any).catch(() => {});
        await table.where({ id: existing.id }).update({ isPrimary: true, updatedAt: ts() } as any).catch(() => {});
      }
      return existing;
    }
    if (opts?.isPrimary) {
      await table.where({ employeeId } as any).updateAll({ isPrimary: false } as any).catch(() => {});
    }
    return await table.create({
      id: newId(), employeeId, email, isPrimary: Boolean(opts?.isPrimary),
      verifiedAt: opts?.verified ? ts() : null, source: opts?.source ?? 'manual',
      createdAt: ts(), updatedAt: ts(),
    } as any);
  } catch {
    return null;
  }
}
