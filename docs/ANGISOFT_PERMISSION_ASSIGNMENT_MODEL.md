# AngiSoft Permission Assignment Model

How the Admin assigns access, and how effective permissions are calculated.
Replaces the current single-mechanism `EmployeeRoleAssignment → AppRole → Permission`.

---

## 1. Canonical backend service (required)

Create **one** module: `backend/src/services/effectivePermissions.ts`.
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
| `ProductTeamMember` | `productId, employeeId, roleInProduct` — **does not exist today** (Product has no team relation). |
| `ContactEnquiry.assigneeId` | add FK → Employee (enquiry assignment currently unmodeled). |

`Employee` changes: keep `role` enum as **system access** (SUPER_ADMIN/ADMIN/STAFF + others), add `departmentId`, `positionId`, `seniorityLevel` (keep as enum/string), `displayTitle`.

## 3. Admin Assignment UI

**Route:** `/admin/staff/:id/access` (new page `admin/StaffAccess.jsx`), reachable from `StaffManagement.jsx` row action.
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

**Backend contract:** `GET /api/admin/staff/:id/access` returns `{ professional, preset, permissions: [{key, source, effect}], assignments }`.
`PUT /api/admin/staff/:id/access` persists identity + `EmployeePermission` rows + assignment rows. Call `clearPermissionCache(employeeId)` after write (reuse existing cache-bust in `permissions.ts`).

## 4. Frontend must not be the security boundary

Per audit §6.1, today `services.put/:id` etc. only check `requireAuth`. After reconstruction, `PUT /api/staff/products/:id` must: (a) `requirePermission('products.update_assigned')`, AND (b) verify `ProductTeamMember` row for `req.user.sub` before writing. Frontend hiding of the edit button is UX only.

## 5. Why presets are not roles

`PermissionPreset` is a **starter bundle**, not a system role. Applying "Developer Preset" writes GRANT rows that the admin can then add/remove from. Preset names never appear on the public Staff List — only `Position.displayTitle` does.
