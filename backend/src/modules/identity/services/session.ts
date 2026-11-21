import type { Response } from 'express';
import prisma from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { signAccessToken, createRefreshToken, hashToken } from '../utils/token';
import { setRefreshCookie } from '../../../shared/middleware/auth';

type EmployeeLike = { id: string; role: string | null | undefined };

/** Issue the standard JWT + rotating refresh pair. Call only after all factors pass. */
export async function issueSession(
  res: Response,
  employee: EmployeeLike,
  remember: boolean,
  meta: { ip?: string; userAgent?: string; fingerprint?: string } = {}
): Promise<string> {
  const access = signAccessToken({ sub: employee.id, role: employee.role });
  const refresh = createRefreshToken();
  const expiresAt = ts(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.orm.public.RefreshToken.create({
    id: newId(),
    token: hashToken(refresh),
    employeeId: employee.id,
    expiresAt,
    remember,
    ip: meta.ip ?? null,
    userAgent: meta.userAgent ?? null,
    fingerprint: meta.fingerprint ?? null,
  });
  setRefreshCookie(res, refresh, remember);
  return access;
}
