# Admin & Staff Codebase Audit

> **📜 HISTORICAL** — Read-only baseline dated 2026-07-19; pre-restructure paths and premises obsolete.<br>
> **Do not cite for current status.** Retain for why reconstruction was needed.<br>
> **Obsolete premises (canonical plan `ANGISOFT_DIGITAL_HQ_PLAN.md` §11, §12):**
> - Every scanned path is from pre-restructure structure.
> - "No direct grants, presets, departments, positions, assignment joins" — all now exist.
> - "43 admin pages" count and JSX inventory obsolete.
> - Some security gaps partly fixed; role/permission drift and scope consistency remain.
> - References to "§24/§25 of Final Report" broken — no such report in repo.
> Replace §§2–6 with current audit before using as live status. Canonical plan: `ANGISOFT_DIGITAL_HQ_PLAN.md` §2 (Current Reality), §4 (Phase 0–1).

**Scope:** Read-only inspection of the AngiSoft platform before any Admin/Staff Portal reconstruction.
**Method:** Scan first → map → document. **No schema changes, seeds, or dashboard rewrites were made.**
**Date:** 2026-07-19

---

## 1. Directories scanned

| Area | Path |
|---|---|
| Backend source | `backend/src/**/*.{ts,js}` |
| Backend schema | `backend/prisma/schema.prisma` |
| Backend routes | `backend/src/routes/*.ts` |
| Backend middleware | `backend/src/middleware/{auth,roles}.ts` |
| Backend services | `backend/src/services/{permissions,audit}.ts` |
| Frontend admin | `frontend/src/admin/**/*.jsx` |
| Frontend admin CRUD | `frontend/src/admin/crud/*.jsx` |
| Frontend public pages | `frontend/src/pages/**/*.jsx` |

## 2. Auth & role architecture (as found)

- **Token auth:** `backend/src/middleware/auth.ts` — `requireAuth` (Bearer JWT), `optionalAuth` (pass if no token), `setRefreshCookie`.
- **Role gate:** `backend/src/middleware/roles.ts` — `requireRoles(...roles)` (bypasses for `SUPER_ADMIN`, else role must be in list), `isRole`, `requirePermission` (delegates to `hasPermission`).
- **Employee system role:** stored on `Employee.role` enum (`ADMIN`, `MARKETING`, `DEVELOPER`, `STAFF`, `HR`, `MANAGER`, `SALES`, `CONTENT_CREATOR`, plus `SUPER_ADMIN` per middleware). **This single enum currently carries BOTH "what they are" and "what they can do."**
- **Permission service:** `backend/src/services/permissions.ts` — `getEmployeePermissions()` reads `EmployeeRoleAssignment → AppRole → RolePermission → Permission` and returns a `Set`. Adds `*` for `SUPER_ADMIN`. **No support for:** direct grants, explicit denials, assignment-scoped permissions, presets, or precedence/merge logic. Cached 60s in a module-level `Map`.

## 3. Permission model (as found)

Tables that exist today:

- `AppRole` (id, key, name, description, system)
- `Permission` (id, key, description)
- `RolePermission` (roleId, permissionId, @@id([roleId, permissionId]))
- `EmployeeRoleAssignment` (id, employeeId, roleId, @@unique([employeeId, roleId]))

This is a pure **role → permission** mapping. There is **no** `EmployeePermission` (direct/denied) table, **no** `PermissionPreset` table, and **no** assignment-scope join (product/project/booking → employee).

The `requirePermission` middleware exists but is **mostly not wired** — most route files guard with `requireRoles(...)` + hardcoded role strings instead of granular permissions, and several mutations guard only with `requireAuth`.

## 4. Admin pages found (43)

`frontend/src/admin/`: `SystemPanel`, `StaffManagement`, `StaffDashboard`, `EnhancedAdminDashboard`, and `crud/` (Skills, Hobbies, Quotes, Contacts, Experience, Interests, SocialMedia, ServiceCategories, Blog, Services, ChatConversations, Testimonials, Projects, Faqs, Careers, Announcements, ProductFaqs, Certifications, HomeSections, Products, SiteSettings, About, CompanyStats) + `FileUpload`, `FileUploadManager`, `BookingsManagement`, `ClientProjectsManagement`, `AdminLogin`, `NotFoundAdmin`, `AdminLayout`.

## 5. Staff pages found

- `frontend/src/admin/StaffDashboard.jsx` — flat profile editor + 4 stat widgets (Services/Projects/Blog/Bookings). Calls `/staff-dashboard/*`.
- `frontend/src/admin/StaffManagement.jsx` — **hardcodes `ROLES = ['ADMIN','MARKETING','DEVELOPER']`** with a simple Add/Edit/Delete modal. No department, position, permission, or assignment UI.

## 6. Security gaps found (summarized; detail in §25 of the Final Report)

1. **Over-broad mutations.** `services.put/:id`, `projects.put/:id`, `blogs.put/:id`, `employee-profiles` (portfolio/stats POST/PUT/DELETE), `certifications` POST/PUT/DELETE, `staff-blogs` POST/PUT/DELETE require only `requireAuth` — no role/ownership/assignment check. Any authenticated account can mutate any record.
2. **No denial / direct-grant model.** `permissions.ts` cannot express "granted X but denied Y."
3. **Role enum overload.** `Employee.role` mixes access tier with would-be job titles.
4. **No assignment-scope enforcement.** "assigned" permissions have no DB backing for products (see §24).

## 7. Existing capability inventory (condensed)

See `ANGISOFT_CAPABILITY_MAP.md` for the full per-capability breakdown.

## 8. Out of scope for first pass

Per the mandate, the following were **not** performed: schema migration, department/position seeding, permission seed data, dashboard rewrite, `/admin/staff/:id/access` implementation. These belong to the implementation phase and are planned — not executed — here.
