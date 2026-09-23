/**
 * effectivePermissions.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Canonical, single-source-of-truth effective-permission resolver for the
 * AngiSoft Admin/Staff Portal reconstruction (Phase 1).
 *
 * Precedence (highest first wins). A key's final effect is the highest-
 * precedence source that mentions it. DENY always overrides any grant.
 *
 *   1. SYSTEM   — SUPER_ADMIN grants the `*` wildcard (all keys).
 *   2. ROLE     — EmployeeRoleAssignment → AppRole → RolePermission → Permission.key
 *   3. PRESET   — Employee.positionId → Position.defaultPermissionKeys
 *   4. ASSIGNMENT — scoped grants from ProductTeamMember / ProjectEmployee /
 *                   Booking(assignedToId) / ContactEnquiry(assigneeId)
 *   5. GRANT    — EmployeePermission rows with effect = 'GRANT' (not expired)
 *   6. DENY     — EmployeePermission rows with effect = 'DENY'  (not expired)
 *
 * NOTE: This module does NOT modify the legacy `permissions.ts` service; that
 * file is preserved for existing callers. Middleware wiring happens in Phase 2.
 */

import prisma from '../db';

// ─── Types ───────────────────────────────────────────────────────────────

export type EffectiveSource =
  | 'DENY'
  | 'GRANT'
  | 'ASSIGNMENT'
  | 'PRESET'
  | 'ROLE'
  | 'SYSTEM';

export interface EffectiveScope {
  type: 'product' | 'project' | 'booking' | 'enquiry' | 'publication';
  id: string;
}

export interface EffectivePerm {
  key: string;
  effect: 'GRANT' | 'DENY';
  source: EffectiveSource; // highest-precedence source that determined it
  assignedScope?: EffectiveScope;
}

export interface EffectiveContext {
  employeeId: string;
  systemRole?: string; // Employee.role value (e.g. 'SUPER_ADMIN', 'DEVELOPER')
  // Optional preloaded rows to avoid N extra queries. When provided they are
  // trusted verbatim; otherwise they are fetched inside getEffectivePermissions.
  assignmentRows?: {
    productTeamMemberIds?: { productId: string }[];
    projectEmployeeIds?: { projectId: string }[];
    bookingIds?: { bookingId: string }[];
    enquiryIds?: { enquiryId: string }[];
    publicationIds?: { publicationId: string }[];
  };
}

// ─── Numeric precedence (higher number = higher precedence) ────────────────
const PRECEDENCE: Record<EffectiveSource, number> = {
  SYSTEM: 60,
  DENY: 50, // explicit deny overrides every grant
  GRANT: 40,
  ASSIGNMENT: 30,
  PRESET: 20,
  ROLE: 10,
};

// ─── Cache (parallel 60s Map keyed by employeeId, mirroring permissions.ts) ─
const cache = new Map<string, { permissions: Map<string, EffectivePerm>; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

function isExpired(expiresAt: Date | null | undefined, now: number): boolean {
  return !!expiresAt && expiresAt.getTime() <= now;
}

// ─── Core resolver ──────────────────────────────────────────────────────────

export async function getEffectivePermissions(
  ctx: EffectiveContext
): Promise<Map<string, EffectivePerm>> {
  const { employeeId, systemRole } = ctx;
  const cacheKey = employeeId;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.permissions;

  const now = Date.now();
  const result = new Map<string, EffectivePerm>();

  const setPerm = (
    key: string,
    effect: 'GRANT' | 'DENY',
    source: EffectiveSource,
    assignedScope?: EffectiveScope
  ) => {
    const existing = result.get(key);
    // DENY always wins; otherwise higher numeric precedence wins.
    if (
      !existing ||
      source === 'DENY' ||
      PRECEDENCE[source] > PRECEDENCE[existing.source]
    ) {
      result.set(key, { key, effect, source, assignedScope });
    }
  };

  // ── 1. SYSTEM: SUPER_ADMIN wildcard ──
  if (systemRole === 'SUPER_ADMIN') {
    result.set('*', { key: '*', effect: 'GRANT', source: 'SYSTEM' });
  }

  // ── Parallel data load (minimize round-trips) ──
  const [
    rolePerms,
    position,
    employeePermRows,
    assignmentRows,
  ] = await Promise.all([
    // 2. ROLE chain
    prisma.employeeRoleAssignment.findMany({
      where: { employeeId },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    }),
    // 3. PRESET (position default permission keys)
    prisma.employee.findUnique({
      where: { id: employeeId },
      select: { role: true, positionId: true },
    }).then((emp) => {
      if (!emp?.positionId) return null;
      return prisma.position.findUnique({
        where: { id: emp.positionId },
        select: { defaultPermissionKeys: true },
      });
    }),
    // 5 & 6. Direct EmployeePermission rows (active only)
    prisma.employeePermission.findMany({
      where: { employeeId },
    }),
    // 4. ASSIGNMENT joins (preloaded or fetched)
    loadAssignmentRows(employeeId, ctx.assignmentRows),
  ]);

  // 2. ROLE
  for (const assignment of rolePerms) {
    for (const rp of assignment.role.permissions) {
      const key = rp.permission?.key;
      if (key) setPerm(key, 'GRANT', 'ROLE');
    }
  }

  // 3. PRESET
  if (position?.defaultPermissionKeys?.length) {
    for (const key of position.defaultPermissionKeys) {
      setPerm(key, 'GRANT', 'PRESET');
    }
  }

  // 4. ASSIGNMENT (scoped grants)
  for (const row of assignmentRows.productTeamMemberIds) {
    setPerm('products.view_assigned', 'GRANT', 'ASSIGNMENT', { type: 'product', id: row.productId });
    setPerm('products.update_assigned', 'GRANT', 'ASSIGNMENT', { type: 'product', id: row.productId });
  }
  for (const row of assignmentRows.projectEmployeeIds) {
    setPerm('projects.view_assigned', 'GRANT', 'ASSIGNMENT', { type: 'project', id: row.projectId });
    setPerm('projects.update_assigned', 'GRANT', 'ASSIGNMENT', { type: 'project', id: row.projectId });
  }
  for (const row of assignmentRows.bookingIds) {
    setPerm('bookings.view_assigned', 'GRANT', 'ASSIGNMENT', { type: 'booking', id: row.bookingId });
    setPerm('bookings.update_assigned', 'GRANT', 'ASSIGNMENT', { type: 'booking', id: row.bookingId });
    setPerm('bookings.add_progress', 'GRANT', 'ASSIGNMENT', { type: 'booking', id: row.bookingId });
    setPerm('bookings.message_customer', 'GRANT', 'ASSIGNMENT', { type: 'booking', id: row.bookingId });
  }
  for (const row of assignmentRows.enquiryIds) {
    setPerm('enquiries.view_assigned', 'GRANT', 'ASSIGNMENT', { type: 'enquiry', id: row.enquiryId });
    setPerm('enquiries.respond', 'GRANT', 'ASSIGNMENT', { type: 'enquiry', id: row.enquiryId });
    setPerm('enquiries.close', 'GRANT', 'ASSIGNMENT', { type: 'enquiry', id: row.enquiryId });
  }
  // Publications: granted globally; ownership checked by route code against
  // BlogPost.authorId. (Kept simple per Phase 1 scope.)
  if (assignmentRows.publicationIds.length) {
    setPerm('publications.view_own', 'GRANT', 'ASSIGNMENT');
    setPerm('publications.update_own', 'GRANT', 'ASSIGNMENT');
  }

  // 5. GRANT (direct, active)
  for (const row of employeePermRows) {
    if (row.effect !== 'GRANT') continue;
    if (isExpired(row.expiresAt, now)) continue;
    setPerm(row.permissionKey, 'GRANT', 'GRANT');
  }

  // 6. DENY (direct, active) — highest precedence of all grants
  for (const row of employeePermRows) {
    if (row.effect !== 'DENY') continue;
    if (isExpired(row.expiresAt, now)) continue;
    setPerm(row.permissionKey, 'DENY', 'DENY');
  }

  cache.set(cacheKey, { permissions: result, expiresAt: now + CACHE_TTL_MS });
  return result;
}

async function loadAssignmentRows(
  employeeId: string,
  preloaded?: EffectiveContext['assignmentRows']
): Promise<{
  productTeamMemberIds: { productId: string }[];
  projectEmployeeIds: { projectId: string }[];
  bookingIds: { bookingId: string }[];
  enquiryIds: { enquiryId: string }[];
  publicationIds: { publicationId: string }[];
}> {
  if (preloaded) {
    return {
      productTeamMemberIds: preloaded.productTeamMemberIds ?? [],
      projectEmployeeIds: preloaded.projectEmployeeIds ?? [],
      bookingIds: preloaded.bookingIds ?? [],
      enquiryIds: preloaded.enquiryIds ?? [],
      publicationIds: preloaded.publicationIds ?? [],
    };
  }

  const [ptm, pe, bookings, enquiries, publications] = await Promise.all([
    prisma.productTeamMember.findMany({
      where: { employeeId },
      select: { productId: true },
    }),
    prisma.projectEmployee.findMany({
      where: { employeeId },
      select: { projectId: true },
    }),
    prisma.booking.findMany({
      where: { assignedToId: employeeId },
      select: { id: true },
    }),
    prisma.contactEnquiry.findMany({
      where: { assigneeId: employeeId },
      select: { id: true },
    }),
    prisma.blogPost.findMany({
      where: { authorId: employeeId },
      select: { id: true },
    }),
  ]);

  return {
    productTeamMemberIds: ptm,
    projectEmployeeIds: pe,
    bookingIds: bookings.map((b) => ({ bookingId: b.id })),
    enquiryIds: enquiries.map((e) => ({ enquiryId: e.id })),
    publicationIds: publications.map((p) => ({ publicationId: p.id })),
  };
}

// ─── Convenience helpers ────────────────────────────────────────────────────

/**
 * Resolves the `*` wildcard (SUPER_ADMIN has everything). Returns true if the
 * final effective effect for `key` is GRANT.
 */
export async function has(ctx: EffectiveContext, key: string): Promise<boolean> {
  const perms = await getEffectivePermissions(ctx);
  const direct = perms.get(key);
  if (perms.has('*')) return true;
  return direct?.effect === 'GRANT';
}

/**
 * Returns the assignedScope entries for a key (used by route guards for
 * ownership checks). Returns null if the key has no assigned scope.
 */
export async function getAssignedScope(
  ctx: EffectiveContext,
  key: string
): Promise<EffectiveScope[] | null> {
  const perms = await getEffectivePermissions(ctx);
  const matches: EffectiveScope[] = [];
  for (const p of perms.values()) {
    if (p.key === key && p.assignedScope) matches.push(p.assignedScope);
  }
  return matches.length ? matches : null;
}

/**
 * Bust any cached effective-permissions for the given employee.
 */
export function clearEffectiveCache(employeeId?: string): void {
  if (!employeeId) {
    cache.clear();
    return;
  }
  cache.delete(employeeId);
}
