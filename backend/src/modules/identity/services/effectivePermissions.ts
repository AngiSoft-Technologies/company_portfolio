/**
 * effectivePermissions.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Canonical, single-source-of-truth effective-permission resolver for the
 * AngiSoft Admin/Staff Portal reconstruction (Phase 1).
 *
 * Precedence (highest first wins). A key's final effect is the highest-
 * precedence source that mentions it. DENY always overrides any grant.
 *
 *   1. SYSTEM     — SUPER_ADMIN grants the `*` wildcard (all keys)
 *   2. DENY       — EmployeePermission rows with effect = 'DENY' (not expired)
 *   3. GRANT      — EmployeePermission rows with effect = 'GRANT' (not expired)
 *   4. ASSIGNMENT — scoped grants from ProductTeamMember / ProjectEmployee /
 *                   Booking(assignedToId) / ContactEnquiry(assigneeId)
 *   5. PRESET     — Employee.positionId → Position.defaultPermissionKeys
 *   6. ROLE       — EmployeeRoleAssignment → AppRole → RolePermission → Permission.key
 *
 * NOTE: This module does NOT modify the legacy `permissions.ts` service; that
 * file is preserved for existing callers. Middleware wiring happens in Phase 2.
 */

import prisma from '../../../db';
import { canonicalKey } from './permissionRegistry';

// ─── Types ───────────────────────────────────────────────────────────────

export type EffectiveSource =
  | 'DENY'
  | 'GRANT'
  | 'ASSIGNMENT'
  | 'PRESET'
  | 'ROLE'
  | 'SYSTEM';

export type AssignmentScopeType =
  | 'product'
  | 'project'
  | 'booking'
  | 'enquiry'
  | 'publication'
  | 'service'
  | 'review';

export interface EffectiveScope {
  type: AssignmentScopeType;
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
    serviceAssignmentIds?: { serviceId: string }[];
    reviewAssignmentIds?: { testimonialId: string }[];
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

function isExpired(expiresAt: string | null | undefined, now: number): boolean {
  return !!expiresAt && new Date(expiresAt).getTime() <= now;
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
    rawKey: string,
    effect: 'GRANT' | 'DENY',
    source: EffectiveSource,
    assignedScope?: EffectiveScope
  ) => {
    // Legacy keys stored in the database (e.g. `content.manage`) are mapped to
    // their canonical equivalent here, so a grant made under the old vocabulary
    // still satisfies a guard that uses the new one — and vice versa. The `*`
    // wildcard is never a legacy key, so it passes through untouched.
    const key = canonicalKey(rawKey);
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
    prisma.orm.public.EmployeeRoleAssignment
      .where({ employeeId })
      .include('role', (role) =>
        role.include('rolePermissions', (rps) => rps.include('permission'))
      )
      .all(),
    // 3. PRESET (position default permission keys)
    prisma.orm.public.Employee
      .where({ id: employeeId })
      .select('role', 'positionId')
      .first()
      .then((emp) => {
        if (!emp?.positionId) return null;
        return prisma.orm.public.Position
          .where({ id: emp.positionId })
          .select('defaultPermissionKeys')
          .first();
      }),
    // 5 & 6. Direct EmployeePermission rows (active only)
    prisma.orm.public.EmployeePermission
      .where({ employeeId })
      .all(),
    // 4. ASSIGNMENT joins (preloaded or fetched)
    loadAssignmentRows(employeeId, ctx.assignmentRows),
  ]);

  // 2. ROLE
  for (const assignment of rolePerms as any[]) {
    for (const rp of assignment.role?.rolePermissions ?? []) {
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
  // Services: ServiceTeamMember rows grant the scoped edit key only.
  for (const row of assignmentRows.serviceAssignmentIds) {
    setPerm('services.update_assigned', 'GRANT', 'ASSIGNMENT', { type: 'service', id: row.serviceId });
  }
  // Review queue: assignment to a testimonial grants scoped moderation only;
  // global `reviews.moderate` remains the admin/marketing fallback.
  for (const row of assignmentRows.reviewAssignmentIds) {
    setPerm('reviews.moderate_assigned', 'GRANT', 'ASSIGNMENT', { type: 'review', id: row.testimonialId });
  }

  // 5. GRANT (direct, active)
  for (const row of employeePermRows as any[]) {
    if (row.effect !== 'GRANT') continue;
    if (isExpired(row.expiresAt, now)) continue;
    setPerm(row.permissionKey, 'GRANT', 'GRANT');
  }

  // 6. DENY (direct, active) — highest precedence of all grants
  for (const row of employeePermRows as any[]) {
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
  serviceAssignmentIds: { serviceId: string }[];
  reviewAssignmentIds: { testimonialId: string }[];
}> {
  if (preloaded) {
    return {
      productTeamMemberIds: preloaded.productTeamMemberIds ?? [],
      projectEmployeeIds: preloaded.projectEmployeeIds ?? [],
      bookingIds: preloaded.bookingIds ?? [],
      enquiryIds: preloaded.enquiryIds ?? [],
      publicationIds: preloaded.publicationIds ?? [],
      serviceAssignmentIds: preloaded.serviceAssignmentIds ?? [],
      reviewAssignmentIds: preloaded.reviewAssignmentIds ?? [],
    };
  }

  const [ptm, pe, bookings, enquiries, publications, serviceAssignments, reviewAssignments] = await Promise.all([
    prisma.orm.public.ProductTeamMember
      .where({ employeeId })
      .select('productId')
      .all(),
    prisma.orm.public.ProjectEmployee
      .where({ employeeId })
      .select('projectId')
      .all(),
    prisma.orm.public.Booking
      .where({ assignedToId: employeeId })
      .select('id')
      .all(),
    prisma.orm.public.ContactEnquiry
      .where({ assigneeId: employeeId })
      .select('id')
      .all(),
    prisma.orm.public.BlogPost
      .where({ authorId: employeeId })
      .select('id')
      .all(),
    prisma.orm.public.ServiceTeamMember
      .where({ employeeId })
      .select('serviceId')
      .all(),
    prisma.orm.public.TestimonialReviewAssignment
      .where({ employeeId })
      .select('testimonialId')
      .all(),
  ]);

  return {
    productTeamMemberIds: ptm,
    projectEmployeeIds: pe,
    bookingIds: bookings.map((b) => ({ bookingId: b.id })),
    enquiryIds: enquiries.map((e) => ({ enquiryId: e.id })),
    publicationIds: publications.map((p) => ({ publicationId: p.id })),
    serviceAssignmentIds: serviceAssignments,
    reviewAssignmentIds: reviewAssignments,
  };
}

// ─── Convenience helpers ────────────────────────────────────────────────────

/**
 * Resolves the `*` wildcard (SUPER_ADMIN has everything) and returns true if the
 * final effective effect for `key` is GRANT.
 *
 * Precedence fix: an explicit DENY always wins — even over the SUPER_ADMIN
 * wildcard. A user can hold `*` and still be blocked from a specific key.
 */
export async function has(ctx: EffectiveContext, key: string): Promise<boolean> {
  const perms = await getEffectivePermissions(ctx);
  const canonical = canonicalKey(key);

  // 1. An explicit DENY on this exact key wins over everything, including
  //    the SYSTEM wildcard granted to SUPER_ADMIN.
  const direct = perms.get(canonical);
  if (direct?.effect === 'DENY') return false;

  // 2. A global '*' DENY also blocks (defensive; not currently produced).
  const wildcard = perms.get('*');
  if (wildcard?.effect === 'DENY') return false;

  // 3. The SUPER_ADMIN wildcard grants everything not explicitly denied.
  if (wildcard?.effect === 'GRANT') return true;

  return direct?.effect === 'GRANT';
}

/**
 * True when the key is explicitly DENIED for this employee.
 *
 * This is separate from `has()` returning `false`, because `false` also covers
 * "never granted". Route guards need the distinction: an explicit DENY must
 * block even when the caller would otherwise pass a role fallback, whereas
 * "never granted" is exactly the case the fallback exists to cover.
 */
export async function isDenied(ctx: EffectiveContext, key: string): Promise<boolean> {
  const perms = await getEffectivePermissions(ctx);
  const canonical = canonicalKey(key);
  if (perms.get(canonical)?.effect === 'DENY') return true;
  return perms.get('*')?.effect === 'DENY';
}

/**
 * Returns the assignedScope entries for a key (used by route guards for
 * ownership checks). Returns null if the key has no assigned scope.
 */export async function getAssignedScope(
  ctx: EffectiveContext,
  key: string
): Promise<EffectiveScope[] | null> {
  const perms = await getEffectivePermissions(ctx);
  const canonical = canonicalKey(key);
  const matches: EffectiveScope[] = [];
  for (const p of perms.values()) {
    if (p.key === canonical && p.assignedScope) matches.push(p.assignedScope);
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

// ─── Centralized assignment enforcement ────────────────────────────────────
//
// A scoped permission is never sufficient on its own: the caller must also be
// assigned to the specific record. These helpers combine the effective-key
// check (DENY wins) with the record-level ownership check in one place so a
// route cannot accidentally enforce only half of the invariant.

export type AssignmentDenialReason = 'NO_EMPLOYEE' | 'NO_PERMISSION' | 'NOT_ASSIGNED';

/** A record to check. `ownerIds` lets a caller reuse an already-loaded FK. */
export interface AssignmentTarget {
  type: AssignmentScopeType;
  id: string;
  ownerIds?: readonly (string | null | undefined)[];
}

export interface AssignmentVerdict {
  allowed: boolean;
  reason?: AssignmentDenialReason;
}

export class AssignmentError extends Error {
  constructor(
    public readonly reason: AssignmentDenialReason,
    message = `Assignment check failed: ${reason}`,
  ) {
    super(message);
    this.name = 'AssignmentError';
  }
}

async function ownsAssignedRecord(employeeId: string, target: AssignmentTarget): Promise<boolean> {
  // A preloaded author/assignee FK is authoritative; avoid another round-trip.
  const preloaded = (target.ownerIds ?? []).filter(
    (id): id is string => typeof id === 'string' && id.length > 0,
  );
  if (preloaded.includes(employeeId)) return true;
  if (!target.id) return false;

  switch (target.type) {
    case 'product':
      return !!(await prisma.orm.public.ProductTeamMember
        .where({ productId: target.id, employeeId }).first());
    case 'project':
      return !!(await prisma.orm.public.ProjectEmployee
        .where({ projectId: target.id, employeeId }).first());
    case 'booking':
      return !!(await prisma.orm.public.Booking
        .where({ id: target.id, assignedToId: employeeId }).first());
    case 'enquiry': {
      // `assigneeId` is canonical; `assignedStaffId` is the deprecated column
      // still present on older rows. Accept either, never neither.
      const row: any = await prisma.orm.public.ContactEnquiry
        .where({ id: target.id }).first();
      return !!row && (row.assigneeId === employeeId || row.assignedStaffId === employeeId);
    }
    case 'publication':
      return !!(await prisma.orm.public.BlogPost
        .where({ id: target.id, authorId: employeeId }).first());
    case 'service':
      return !!(await prisma.orm.public.ServiceTeamMember
        .where({ serviceId: target.id, employeeId }).first());
    case 'review':
      return !!(await prisma.orm.public.TestimonialReviewAssignment
        .where({ testimonialId: target.id, employeeId }).first());
    default:
      return false;
  }
}

/**
 * Boolean/verdict form of `assertAssigned()` for Express handlers that need to
 * return their own 403 payload. Both the effective permission and the record
 * assignment must pass; an explicit DENY on the key always wins.
 */
export async function checkAssigned(
  ctx: EffectiveContext,
  permissionKey: string,
  target: AssignmentTarget,
): Promise<AssignmentVerdict> {
  if (!ctx.employeeId) return { allowed: false, reason: 'NO_EMPLOYEE' };
  if (!(await has(ctx, permissionKey))) return { allowed: false, reason: 'NO_PERMISSION' };
  if (!(await ownsAssignedRecord(ctx.employeeId, target))) {
    return { allowed: false, reason: 'NOT_ASSIGNED' };
  }
  return { allowed: true };
}

/** Convenience boolean form for list/filter code paths. */
export async function isAssigned(
  ctx: EffectiveContext,
  permissionKey: string,
  target: AssignmentTarget,
): Promise<boolean> {
  return (await checkAssigned(ctx, permissionKey, target)).allowed;
}

/** Throwing form for services; fails closed with a typed reason. */
export async function assertAssigned(
  ctx: EffectiveContext,
  permissionKey: string,
  target: AssignmentTarget,
): Promise<void> {
  const verdict = await checkAssigned(ctx, permissionKey, target);
  if (!verdict.allowed) throw new AssignmentError(verdict.reason!);
}
