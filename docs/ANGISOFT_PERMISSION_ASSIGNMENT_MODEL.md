# AngiSoft Permission Assignment Model

> **🎯 TARGET** — Normative target access model; partially implemented in `backend/src/modules/identity/services/effectivePermissions.ts`.<br>
> **Amendments from canonical plan (`ANGISOFT_DIGITAL_HQ_PLAN.md` §5.3):**
> 1. `SUPER_ADMIN` wildcard precedence (60) **does not override explicit DENY** (50). DENY always wins. Test required.
> 2. `PermissionPreset` rows are not read by the resolver; only `Position.defaultPermissionKeys` acts as a preset. Decide one authoritative preset mechanism.
> 3. Publication-review assignment was proposed; **partially implemented** — author-scoped `publications.view_own/update_own` is live in the resolver, but review-queue (Testimonial) assignment remains global. See gap ledger below.
> Canonical precedence (highest wins): SYSTEM(60) → DENY(50) → GRANT(40) → ASSIGNMENT(30) → PRESET(20) → ROLE(10). DENY always beats any grant.

## Gap closure ledger (verified against live code 2026-11-23)

| Target item | State | Code evidence / remaining work |
|---|---|---|
| Amendment 1 — DENY beats SUPER_ADMIN wildcard | **CLOSED** | `backend/src/modules/identity/services/effectivePermissions.ts` — `PRECEDENCE.DENY = 50`, `setPerm()` applies DENY unconditionally; `backend/src/shared/middleware/roles.ts:41-62` `requireAccess()` calls `isDenied()` **before** the role fallback. Regression specs: `backend/test/security.spec.ts` ("effectivePermissions precedence"), `backend/test/require-access.spec.ts` (7 specs). |
| Amendment 2 — one authoritative preset mechanism | **STILL OPEN (design decision)** | `effectivePermissions.ts:135-169` reads `Employee.positionId → Position.defaultPermissionKeys` as PRESET (20). The `PermissionPreset` **table exists** in `contract.prisma` and is seeded/CRUD'd (`seed-professional.ts`, `/v1/admin/permission-presets` via staff-access router), but the resolver never reads it; applying a preset writes `EmployeePermission` GRANT rows. Decide explicitly: table-as-template (current) vs resolver source. |
| Amendment 3 — publication-review assignment | **PARTIALLY CLOSED** | Resolver now derives `publications.view_own`/`update_own` from `BlogPost.authorId` (`effectivePermissions.ts:190-194`, loaded at `:235-264`) with `assignedScope` of type `publication`. Route-level ownership checks in `modules/cms/routes/staff-blogs.ts:66,82`. Review-queue (Testimonial moderation) remains global `reviews.moderate`, not assignment-scoped. |
| Single canonical backend module | **CLOSED** | Actual path is `backend/src/modules/identity/services/effectivePermissions.ts` (the `backend/src/services/...` path in §1 below is obsolete). Registry: `backend/src/modules/identity/services/permissionRegistry.ts` — 213 keys / 37 groups at verification time; re-count before signoff. |
| Role & Permissions / Staff Access UI + cache bust | **CLOSED** | `/settings/roles` (`RolesAdmin.tsx`), `/staff-access` (`StaffAccess.tsx`) tri-state grants; `GET/PUT /v1/admin/staff/:id/access` in `modules/identity/routes/staff-access.ts:118,244`; both caches invalidated (`:339-340` → `clearEffectiveCache()` + `clearPermissionCache()`). |
| Production seeding of the registry | **OPEN BLOCKER** | Live Neon has only **16 legacy `Permission` keys** vs 213 in code (main-session MCP check 2026-11-23). Guards resolve by alias where possible; canonical keys stay ungranted until `npx prisma db seed` runs. See `PRODUCTION_READINESS.md`. |

How the Admin assigns access, and how effective permissions are calculated.
Replaces the current single-mechanism `EmployeeRoleAssignment → AppRole → Permission`.

---

## 1. Canonical backend service (required)

**Implemented at** `backend/src/modules/identity/services/effectivePermissions.ts` (the original target path `backend/src/services/effectivePermissions.ts` was never created).
All permission decisions (route guards + assignment checks) call this — no scattered logic in components.

```
getEffectivePermissions(employeeId, systemRole) → EffectivePermissionSet
```

Inputs merged, in **precedence order** (highest first):

1. **Explicit DENIAL** (`EmployeePermission` where `effect = 'DENY'`) — overrides everything.
2. **Explicit GRANT** (`EmployeePermission` where `effect = 'GRANT'`) — overrides role/assignment.
3. **Assignment permissions** — derived from assignment rows (see `ANGISOFT_ASSIGNMENT_SCOPE_MATRIX.md`):
   - `ProductTeamMember` → `products.update_assigned` (+ scope = that product)
   - `ProjectEmployee` → `projects.update_assigned` (+ scope = that project)
   - `Booking.assignedToId` → `bookings.update_assigned` (+ scope = that booking)
   - `ContactEnquiry.assigneeId` → `enquiries.view_assigned`/`respond` (+ scope = that enquiry)
4. **Position preset** — `Position.defaultPermissionKeys` (a preset bundle).
5. **AppRole permissions** — existing `EmployeeRoleAssignment → AppRole → Permission`.
6. **System-role defaults** — SUPER_ADMIN ⇒ `*`.

> Final rule: **DENY > GRANT > ASSIGNMENT > POSITION PRESET > ROLE > SYSTEM DEFAULT.**

## 2. New/changed tables

| Table | Purpose |
|---|---|
| `EmployeePermission` | `employeeId, permissionKey, effect('GRANT'\|'DENY'), grantedBy, grantedAt, expiresAt?` — direct grants/denials (the missing piece today). |
| `Department` | `id, key, name, description` — replaces free-text `Employee.department`. |
| `Position` | `id, departmentId, title, displayTitleTemplate, defaultPermissionKeys String[], seniorityLevels String[]` — professional identity + preset. |
| `PermissionPreset` | `id, key, name, permissionKeys String[]` — bundles (Developer/Designer/Content/Coordinator/Support). |
| `ProductTeamMember` | `productId, employeeId, roleInProduct` — **now exists** in `contract.prisma`; seeded/queried by `effectivePermissions.ts:236`. |
| `ContactEnquiry.assigneeId` | **now exists** in `contract.prisma` and is loaded by `effectivePermissions.ts:249`. `assignedStaffId` is deprecated (plan §12). |

`Employee` changes: keep `role` enum as **system access** (SUPER_ADMIN/ADMIN/STAFF + others), add `departmentId`, `positionId`, `seniorityLevel` (keep as enum/string), `displayTitle`.

## 3. Admin Assignment UI

**Route (as built):** `/staff-access` → `frontend/admin/src/features/hr-staff/StaffAccess.tsx`, reachable from `/staff` (`StaffManagement.tsx`). Backend contract is `GET/PUT /v1/admin/staff/:id/access` — the target path below is correct at the API layer; the legacy SPA path `admin/StaffAccess.jsx` no longer exists.
Sections in order (mirrors the user's flow):

1. **Professional identity** — Department select, Position select, Seniority, Public display title.
2. **Permission preset** — dropdown (Developer/Designer/Content/Coordinator/Support) → "Apply" seeds the grant table.
3. **Granular permissions** — grouped accordion (Profile, Staff, Publications, Services, Products, Pricing, Bookings, Enquiries, Reviews, Media, Page Content, Projects, Analytics, Administration). Each row shows:
   - Display name + plain-language description
   - Risk badge (Low/Medium/High/Critical)
   - Source chip: `Role` | `Preset` | `Direct grant` | `Assignment` | `Denied`
   - Toggle: inherit / grant / deny
4. **Record assignments** — Products (multi-select → `ProductTeamMember`), Projects (`ProjectEmployee`), Bookings, Enquiries, Publication-review queue.
5. **Effective access preview** — read-only computed list (DENY shown struck-through red, GRANT green, ASSIGNMENT blue) before save.

**Backend contract:** `GET /v1/admin/staff/:id/access` returns `{ professional, preset, permissions: [{key, source, effect}], assignments }`.
`PUT /v1/admin/staff/:id/access` persists identity + `EmployeePermission` rows + assignment rows. Call `clearPermissionCache(employeeId)` after write (reuse existing cache-bust in `permissions.ts`).

## 4. Frontend must not be the security boundary

Per audit §6.1, today `services.put/:id` etc. only check `requireAuth`. After reconstruction, `PUT /v1/staff/products/:id` must: (a) `requirePermission('products.update_assigned')`, AND (b) verify `ProductTeamMember` row for `req.user.sub` before writing. Frontend hiding of the edit button is UX only.

## 5. Why presets are not roles

`PermissionPreset` is a **starter bundle**, not a system role. Applying "Developer Preset" writes GRANT rows that the admin can then add/remove from. Preset names never appear on the public Staff List — only `Position.displayTitle` does.
