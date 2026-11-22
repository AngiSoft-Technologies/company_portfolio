/**
 * Account-scoped delegation for communications.
 *
 * Only SUPER_ADMIN has an implicit global scope. Every other principal —
 * including ADMIN — must hold a CommunicationGrant on the specific account;
 * this deliberately removes the old global-permission fallback that leaked
 * every mailbox/channel into the inbox.
 */

import type { Db } from '../../../db';
import { tsMs } from '../../../prisma/db';

export const GRANT_SCOPES = ['read', 'respond', 'send_template', 'send_as', 'manage'] as const;
export type GrantScope = (typeof GRANT_SCOPES)[number];

export class AccountAccessError extends Error {
  constructor(message = 'No communication grant for this account') {
    super(message);
    this.name = 'AccountAccessError';
  }
}

export function isGrantScope(value: string): value is GrantScope {
  return (GRANT_SCOPES as readonly string[]).includes(value);
}

export function grantExpired(grant: any): boolean {
  if (!grant?.expiresAt) return false;
  return tsMs(grant.expiresAt) <= Date.now();
}

/** `manage` implies every scope on that one account; other scopes are exact. */
export function hasGrantScope(grant: any, scope: GrantScope): boolean {
  if (!grant || grantExpired(grant)) return false;
  const scopes: unknown = grant.scopes;
  if (!Array.isArray(scopes)) return false;
  const values = scopes.filter((s): s is string => typeof s === 'string');
  if (values.includes('manage')) return true;
  if (scope === 'read') return values.includes('read') || values.includes('respond') || values.includes('send_as');
  return values.includes(scope);
}

export async function getGrant(prisma: Db, accountId: string, employeeId: string | undefined): Promise<any | null> {
  if (!employeeId) return null;
  return prisma.orm.public.CommunicationGrant
    .where({ accountId, employeeId } as any)
    .first()
    .catch(() => null) as Promise<any | null>;
}

/** Boolean form used by list endpoints that must filter account-by-account. */
export async function canAccessAccount(
  prisma: Db,
  user: { sub?: string; role?: string } | undefined,
  accountId: string,
  scope: GrantScope = 'read',
): Promise<boolean> {
  if (!user?.sub) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  return hasGrantScope(await getGrant(prisma, accountId, user.sub), scope);
}

/** Throwing form used by mutating routes (fails closed). */
export async function assertAccountAccess(
  prisma: Db,
  user: { sub?: string; role?: string } | undefined,
  accountId: string,
  scope: GrantScope = 'read',
): Promise<void> {
  if (!(await canAccessAccount(prisma, user, accountId, scope))) throw new AccountAccessError();
}

/** Filter a list of accounts to those the caller may see. */
export async function filterGrantedAccounts<T extends { id?: string; accountId?: string }>(
  prisma: Db,
  user: { sub?: string; role?: string } | undefined,
  accounts: T[],
): Promise<T[]> {
  if (user?.role === 'SUPER_ADMIN') return accounts;
  const out: T[] = [];
  for (const account of accounts) {
    const id = String((account as any).id ?? (account as any).accountId ?? '');
    if (id && (await canAccessAccount(prisma, user, id, 'read'))) out.push(account);
  }
  return out;
}
