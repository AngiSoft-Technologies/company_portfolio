# AngiSoft Assignment Scope Matrix

> **🎯 TARGET — CODE CLOSED (2026-11-23)** — Normative scope enforcement model now implemented in code; additive migrations/seed remain owner-gated.<br>
> **Status vs canonical plan (`ANGISOFT_DIGITAL_HQ_PLAN.md` §5):**
> - ✅ `ProductTeamMember` and `ContactEnquiry.assigneeId` now exist (contract + resolver); `assigneeId` is canonical, `assignedStaffId` deprecated.
> - ✅ `BlogPost.authorId` and `StaffBlog.employeeId` are separate publication models with resolver/route ownership checks.
> - ✅ `ServiceTeamMember` + `services.update_assigned` now exist in the contract and are enforced in `services.ts`.
> - ⚠️ File ownership uses route-level owner checks; exact `media.*_own` key names need verification.
> - ✅ `TestimonialReviewAssignment` + `reviews.moderate_assigned` now scope review-queue moderation.
> - ✅ Central `checkAssigned()` / `isAssigned()` / `assertAssigned()` helpers exist with typed denial reasons and a 10-test regression spec.
> Security invariant: **frontend visibility ≠ authorization**; every scoped mutation needs capability + ownership check via canonical resolver.

## Gap closure ledger (verified against live code 2026-11-23)

| Target item (original header claim) | State | Code evidence / remaining work |
|---|---|---|
| `ProductTeamMember` — "NO — must add" | **CLOSED** | Model in `backend/src/prisma/contract.prisma`; loaded in `effectivePermissions.ts:236`; `assignmentCounts.products` counted in `staff-dashboard.ts:135`. Ownership checks in `modules/cms/routes/products.ts:66,74,84`. |
| `ContactEnquiry.assigneeId` — "NO — must add FK" | **CLOSED** | Field in contract; resolver load at `effectivePermissions.ts:249`; count at `staff-dashboard.ts:138`. `assignedStaffId` deprecated per plan §12. |
| Publication ownership | **CLOSED** | `BlogPost.authorId` + `StaffBlog.employeeId` are separate models; resolver grants `publications.view_own/update_own` from `BlogPost.authorId` with scoped `assignedScope` (`effectivePermissions.ts:190-194`); route-level check in `staff-blogs.ts:66,82`. |
| Media `File.uploadedById` | **CLOSED (code)** | `File` model exists; upload mutations are `requireAuth` + owner-checked. The canonical registry keys are `media.upload` / `media.manage` (with `media.view` aliased to `media.upload`) — the earlier `media.update_own` / `media.delete_own` names were placeholders that do not exist in `permissionRegistry.ts`. No new keys were invented. |
| Review-queue assignment | **CLOSED (code)** | `TestimonialReviewAssignment` is in `contract.prisma` with additive migration `20261123050000_add_assignment_scope_models`; `reviews.moderate_assigned` is canonical; `modules/cms/routes/testimonials.ts` uses `checkAssigned(ctx, 'reviews.moderate_assigned', { type: 'review', id })`. |
| `services.update_assigned` / `ServiceTeamMember` | **CLOSED (code)** | `ServiceTeamMember` is in `contract.prisma`; `services.update_assigned` is canonical with `scopeRequiresAssignment: true`; `modules/cms/routes/services.ts` uses `checkAssigned` with `{ type: 'service', id }`. Additive migration is on disk, not applied live. |
| Central `assertAssigned()` helper | **CLOSED (code)** | `effectivePermissions.ts` exports `AssignmentError`, `checkAssigned()`, `isAssigned()` and throwing `assertAssigned()`; explicit DENY wins before grants, then assignment ownership is checked. Routes using the helpers include `products.ts`, `projects.ts`, `bookings.ts`, `contact-enquiries.ts`, `staff-blogs.ts`, `services.ts` and `testimonials.ts`. `backend/test/assignmentScope.spec.ts` covers allow/deny/explicit-DENY paths (10 tests). |
| Route guards "requireAuth only" | **CLOSED** | All route guards migrated to `requireAccess(permission, fallbackRoles)`; `backend/test/route-guards.spec.ts` asserts no `requireRoles(...)` and no retired keys. |

Shows which permissions must be **limited to assigned records** and the DB mechanism that enforces them.
"Frontend hiding is not security" — every scoped permission requires a backend ownership/assignment check via the canonical `effectivePermissions` service.

---

## Assignment tables & their scopes

| Entity | Assignment mechanism | Exists today? | Scoped permissions |
|---|---|---|---|
| Product | `ProductTeamMember(productId, employeeId, roleInProduct)` | **YES — verified in contract + resolver** | `products.view_assigned`, `products.update_assigned` (canonical); `products.manage_media` is legacy vocabulary |
| Project | `ProjectEmployee` (exists) | YES — resolver + `assignmentCounts` | `projects.view_assigned`, `projects.update_assigned`, `projects.add_progress` |
| Booking | `Booking.assignedToId → Employee` (exists) | YES — resolver + route ownership check | `bookings.view_assigned`, `bookings.update_assigned`, `bookings.change_stage`, `bookings.add_progress`, `bookings.message_customer` |
| Enquiry | `ContactEnquiry.assigneeId → Employee` | **YES — field + resolver load** | `enquiries.view_assigned`, `enquiries.respond`, `enquiries.close` |
| Publication | `BlogPost.authorId` / `StaffBlog.employeeId` (separate models) | YES — resolver + route checks | `publications.view_own`, `publications.update_own` |
| Media | `File` with upload owner checks | CLOSED (code) | `media.upload`, `media.manage` (canonical; `media.view` alias) |
| Review queue | `TestimonialReviewAssignment(testimonialId, employeeId)` | **YES — contract + route check** | `reviews.moderate_assigned` (canonical, scoped); global `reviews.moderate` remains for ADMIN |
| Service | `ServiceTeamMember(serviceId, employeeId, roleInService)` | **YES — contract + route check** | `services.update_assigned` (canonical, scoped) |

## Enforcement pattern (backend)

For a scoped mutation, the guard runs two checks:

```ts
// pseudo — lives in services/effectivePermissions.ts
async function assertAssigned(employeeId, permissionKey, scope) {
  const eff = await getEffectivePermissions(employeeId, role);
  if (!eff.has(permissionKey)) throw 403;
  if (permissionKey.endsWith('_assigned')) {
    const ok = await scope.ownsRecord(employeeId); // checks join row
    if (!ok) throw 403;
  }
}
```

Example — `PUT /v1/staff/products/:id`:
1. `requirePermission('products.update_assigned')`
2. `SELECT 1 FROM ProductTeamMember WHERE productId = :id AND employeeId = req.user.sub`
3. If no row → 403, even though permission is held.

## Worked examples (from the user brief)

| Permission | Assignment | Result |
|---|---|---|
| `products.update_assigned` | KejaLink | Can edit KejaLink; cannot edit PetroFlow. |
| `projects.update_assigned` | ClientPortal v2 | Can post progress on that project only. |
| `bookings.update_assigned` | ANG-2026-00481 | Can advance stage / message that customer only. |
| `publications.update_own` | "Building a Local Dev Stack" | Can edit own draft; cannot touch others'. |

## Assignment ≠ permission

Assignments are **separate records** the Admin creates (per "ADMIN TASK ASSIGNMENT"):
- Assign staff → product (creates `ProductTeamMember`)
- Assign staff → project (`ProjectEmployee`)
- Assign staff → booking (`Booking.assignedToId`)
- Assign staff → enquiry (`ContactEnquiry.assigneeId`)
- Assign publication-review responsibility (queue membership)

Granting `products.update_assigned` without an assignment row yields **zero editable products** (empty widget). This is intentional and safe.

## Gaps blocking scoped permissions today (status 2026-11-23)
1. ~~Product has no team relation~~ **CLOSED** — `ProductTeamMember` exists and is enforced in route code.
2. ~~ContactEnquiry has no assigneeId~~ **CLOSED** — canonical field with resolver support.
3. ~~Route guards use `requireAuth` only~~ **CLOSED** — all guards use `requireAccess`/`requirePermission` (route-guards spec).
4. ~~No centralized `assertAssigned()`~~ **CLOSED** — `checkAssigned` / `isAssigned` / `assertAssigned` are centralized in `effectivePermissions.ts` with typed denial reasons; `assignmentScope.spec.ts` covers 10 permission/assignment cases.
5. ~~`ServiceTeamMember` / `services.update_assigned` unmodeled~~ **CLOSED (code)** — additive migration `20261123050000_add_assignment_scope_models` is on disk but not applied live.
6. ~~No review-queue assignment~~ **CLOSED (code)** — `TestimonialReviewAssignment` + `reviews.moderate_assigned`; migration still owner-gated.
7. **PRODUCTION BLOCKER** — the live `Permission` table has 16 legacy keys vs 213 in code; seed not applied (see `PRODUCTION_READINESS.md`).
