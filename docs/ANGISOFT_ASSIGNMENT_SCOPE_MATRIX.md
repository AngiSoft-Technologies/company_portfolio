# AngiSoft Assignment Scope Matrix

Shows which permissions must be **limited to assigned records** and the DB mechanism that enforces them.
"Frontend hiding is not security" — every scoped permission requires a backend ownership/assignment check via the canonical `effectivePermissions` service.

---

## Assignment tables & their scopes

| Entity | Assignment mechanism | Exists today? | Scoped permissions |
|---|---|---|---|
| Product | `ProductTeamMember(productId, employeeId, roleInProduct)` | **NO — must add** | `products.view_assigned`, `products.update_assigned`, `products.manage_media` (per product) |
| Project | `ProjectEmployee` (exists) | YES | `projects.view_assigned`, `projects.update_assigned`, `projects.add_progress` |
| Booking | `Booking.assignedToId → Employee` (exists) | YES | `bookings.view_assigned`, `bookings.update_assigned`, `bookings.change_stage`, `bookings.add_progress`, `bookings.message_customer` |
| Enquiry | `ContactEnquiry.assigneeId → Employee` | **NO — must add FK** | `enquiries.view_assigned`, `enquiries.respond`, `enquiries.close` |
| Publication | `BlogPost.authorId` (exists) | YES | `publications.view_own`, `publications.update_own` |
| Media | `File.uploadedById` (verify) | PARTIAL | `media.update_own`, `media.delete_own` |
| Review queue | `Testimonial` moderation flag | PARTIAL | `reviews.moderate` (global, ADMIN only) |

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

Example — `PUT /api/staff/products/:id`:
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

## Gaps blocking scoped permissions today
1. **Product has no team relation** → `ProductTeamMember` table required before `products.*_assigned` can work.
2. **ContactEnquiry has no assigneeId** → FK required before `enquiries.*_assigned`.
3. **Route guards use `requireAuth` only** on the affected PUT/POST/DELETE routes → must be upgraded to `requirePermission` + assignment check (this is the "update everything to new architecture" sweep).
