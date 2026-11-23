# AngiSoft Dashboard Widget Matrix

> **🎯 TARGET** — Normative dashboard acceptance spec; **implemented in current admin** (verified 2026-11-23). Retained as the acceptance reference, with the gap ledger below recording what closed.
> **Original gaps from canonical plan (`ANGISOFT_DIGITAL_HQ_PLAN.md` §8)** — all now closed except the production seed:
> - ✅ Endpoint standardized on `/v1/staff-dashboard`.
> - ✅ Admin aggregates standardized on `GET /v1/admin/reports/overview` + `/reports`.
> - ✅ Keys aligned to canonical registry (`analytics.view`, `administration.audit`).
> - ✅ `assignmentCounts` present in the versioned `effective-access` payload.
> - ✅ Empty-widget rule live: permission held with zero assignments → `EmptyState` + "create first …" CTA (canonical §8 supersedes the original `assignmentCounts > 0` filter pseudo-code).
> - ❌ Production `Permission` seed still missing (16 legacy keys vs 211 in code) — see `PRODUCTION_READINESS.md`.

## Gap closure ledger (verified against live code 2026-11-23)

| Target item (original header claim) | State | Code evidence / remaining work |
|---|---|---|
| Endpoint mismatch `/v1/admin/staff-dashboard` vs `/v1/staff-dashboard` | **CLOSED** | `backend/src/app.ts:424` mounts `app.use('/v1/staff-dashboard', staffDashboardRouter(prisma))`; admin `Workspace.tsx` reads via `useEffectiveAccess()` (`@/lib/permissions`). |
| Admin overview `/v1/admin/dashboard/stats` | **CLOSED / REPLACED** | Cross-department aggregates are served by `GET /v1/admin/reports/overview` + `/reports` screen (`ReportsAdmin.tsx`); the old `/v1/admin/dashboard/stats` call is gone; examples below were updated. |
| Stale permission keys (`analytics.view_dashboard`, `audit.view`) | **CLOSED** | Live catalogue uses `analytics.view` and `administration.audit`; the server `WIDGET_CATALOGUE` (`staff-dashboard.ts:150-162`) is aligned to canonical keys. |
| `assignmentCounts` in effective-access payload | **CLOSED** | `/v1/staff-dashboard/effective-access` returns `version: 1`, `permissions[]` (with `source`/`assignedScope`), `assignmentCounts` (products/projects/bookings/enquiries/publications), `widgets[]`, `preferences` (`staff-dashboard.ts:196-236`). Counts are real Prisma aggregates (`:130-143`). |
| Widget generation from permissions | **CLOSED** | `deriveWidgets()` filters `WIDGET_CATALOGUE` by granted permission (or SUPER_ADMIN) at `staff-dashboard.ts:164-167`; `Workspace.tsx:111-181` renders server-provided widget IDs. |
| Empty-widget rule (permission held, zero assignments) | **CLOSED** | `Workspace.tsx:166` sets `isEmpty` when the matching count is 0 and renders `EmptyState` with a "create first …" CTA (`:181`) — never silently hidden. This supersedes the original "filter by `assignmentCounts > 0`" pseudo-code in this document; canonical §8 is authoritative. |
| Versioned widget payload consumed by admin shell | **CLOSED** | `EffectiveAccessProvider` / `useCan()` in `frontend/admin/src/lib/permissions.tsx`; nav groups hide when no permission, DENY is final. |
| Production permission seed | **OPEN BLOCKER** | Live `Permission` table has 16 legacy keys vs 211 in code (2026-11-23 Neon MCP check). Widget grants derived from role/preset rows will be incomplete until `npx prisma db seed` runs. |
| Admin route×theme sweep against live backend | **PARTIAL (live) / DONE (mocked)** | Web public routes verified dark+light; all 82 guarded admin routes now swept under 3 themes in the mocked browser matrix (246 checks, E2E 30/30). Live auth/backend sweep still pending redeploy/credentials (`ANGISOFT_CAPABILITY_MAP.md` §6). |

Widgets are **generated from effective access**, never from `if role === 'STAFF'`.
Each widget appears only if the employee holds the enabling permission AND (for assigned scopes) has at least one assigned record.

---

## Effective-access → widget logic

The workspace (`frontend/admin/src/features/dashboard/Workspace.tsx`) renders widget IDs computed server-side by `deriveWidgets()` from the `getEffectivePermissions()` response:

```
// server: staff-dashboard.ts deriveWidgets(granted, isSuperAdmin)
WIDGET_CATALOGUE = [
  { id: 'my-products',          permission: 'products.view_assigned' },
  { id: 'my-projects',          permission: 'projects.view_assigned' },
  { id: 'assigned-bookings',    permission: 'bookings.view_assigned' },
  { id: 'customer-messages',    permission: 'bookings.message_customer' },
  { id: 'assigned-enquiries',   permission: 'enquiries.view_assigned' },
  { id: 'my-publications',      permission: 'publications.view_own' },
  { id: 'lead-pipeline',        permission: 'leads.view' },
  { id: 'support-inbox',        permission: 'support_tickets.view' },
  { id: 'careers-applications', permission: 'careers.applications.view' },
  { id: 'revenue-overview',     permission: 'payments.view_all' },
  { id: 'analytics',            permission: 'analytics.view' },
];
widgets = WIDGET_CATALOGUE.filter(w => isSuperAdmin || granted.has(w.permission)).map(w => w.id);
// frontend: Workspace.tsx — count === 0 → EmptyState + "create first …" CTA
```

## Widget catalogue by access profile

### Developer (products.view_assigned + projects.view_assigned + publications.create)
| Widget | Data source | Permission |
|---|---|---|
| My Products | `ProductTeamMember` joins | `products.view_assigned` |
| My Projects | `ProjectEmployee` joins | `projects.view_assigned` |
| My Publications | `BlogPost` where author | `publications.create` |
| Profile Completion | own `Employee` completeness | `profile.update_own` |

### Support (bookings.view_assigned + enquiries.view_assigned + bookings.message_customer)
| Widget | Data source | Permission |
|---|---|---|
| Assigned Bookings | `Booking.assignedToId` | `bookings.view_assigned` |
| Assigned Enquiries | `ContactEnquiry.assigneeId` | `enquiries.view_assigned` |
| Customer Messages | `Note` on assigned bookings | `bookings.message_customer` |
| My Profile | own `Employee` | `profile.update_own` |

### Content Contributor (publications.create + publications.submit_review + media.upload)
| Widget | Data source | Permission |
|---|---|---|
| My Drafts | `BlogPost` own + draft | `publications.create` |
| Create Publication | link to editor | `publications.create` |
| Media Library | `File` own uploads | `media.upload` |
| Review Feedback | review-queue items | `publications.submit_review` |
| My Profile | own `Employee` | `profile.update_own` |

### Admin / Super Admin
| Widget | Data source | Permission |
|---|---|---|
| Admin Summary | `GET /v1/admin/reports/overview` | `analytics.view` |
| All Bookings | `Booking` | `bookings.view_all` |
| Staff Directory | `Employee` | `staff.view` |
| Content Queue | `BlogPost` review | `publications.review` |
| Audit Trail | `GET /v1/admin/audit-logs` | `administration.audit` |

## Empty-widget rule
If a permission is present but no assigned records exist (e.g. `products.view_assigned` with zero team products), the widget shows a **"No products assigned yet"** empty state — never a silent blank or a fake global list.

## Admin dashboard (`frontend/admin/src/features/dashboard/EnhancedAdminDashboard.tsx`)
The stat cards are driven by the live admin overview/report endpoints; gate each behind `analytics.view`/`administration.view` as applicable. Cross-department aggregates (pipeline/delivery/finance/satisfaction) come from `GET /v1/admin/reports/overview` and are rendered by `ReportsAdmin.tsx` at `/reports`. The legacy `/v1/admin/dashboard/stats` reference in this document is retired.
