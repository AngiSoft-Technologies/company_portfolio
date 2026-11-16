# AngiSoft Dashboard Widget Matrix

> **🎯 TARGET** — Normative dashboard acceptance spec; not yet implemented in current admin.<br>
> **Gaps from canonical plan (`ANGISOFT_DIGITAL_HQ_PLAN.md` §8):**
> - Current staff dashboard calls `/api/admin/staff-dashboard`; backend mounts at `/api/staff-dashboard` → standardize.
> - Admin dashboard calls `/api/admin/dashboard/overview`; backend exposes `/api/admin/dashboard/stats` → align.
> - Permission keys in this matrix (`analytics.view_dashboard`, `publications.review`, `audit.view`) don't match current catalogue → migrate to canonical registry.
> - Effective-permission response must include scoped counts (`assignmentCounts`) for widget logic.
> - Empty-widget rule: permission held but zero assignments → show empty state with "Create first [record]" CTA.
> Widget generation: filter catalogue by `permissions` + `assignmentCounts > 0` from versioned payload (§8).

Widgets are **generated from effective access**, never from `if role === 'STAFF'`.
Each widget appears only if the employee holds the enabling permission AND (for assigned scopes) has at least one assigned record.

---

## Effective-access → widget logic

The staff dashboard (`admin/StaffDashboard.jsx` rewrite) computes widgets from `getEffectivePermissions()` response:

```
widgets = []
if has('products.view_assigned') && assignedProducts.length:
    widgets.push(My Products)
if has('projects.view_assigned') && assignedProjects.length:
    widgets.push(My Projects)
if has('publications.create'):
    widgets.push(My Drafts, Create Publication)
if has('bookings.view_assigned') && assignedBookings.length:
    widgets.push(Assigned Bookings)
if has('enquiries.view_assigned') && assignedEnquiries.length:
    widgets.push(Assigned Enquiries)
if has('bookings.message_customer'):
    widgets.push(Customer Messages)
if has('media.upload'):
    widgets.push(Media Library)
if has('publications.submit_review') && reviewsAssigned:
    widgets.push(Review Feedback)
widgets.push(Profile Completion)  // always, for STAFF
if has('analytics.view_dashboard'):
    widgets.push(Admin Summary)    // ADMIN only
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
| Admin Summary | `/api/admin/dashboard/stats` | `analytics.view_dashboard` |
| All Bookings | `Booking` | `bookings.view_all` |
| Staff Directory | `Employee` | `staff.view` |
| Content Queue | `BlogPost` review | `publications.review` |
| Audit Trail | `AuditLog` | `audit.view` |

## Empty-widget rule
If a permission is present but no assigned records exist (e.g. `products.view_assigned` with zero team products), the widget shows a **"No products assigned yet"** empty state — never a silent blank or a fake global list.

## Admin dashboard (`EnhancedAdminDashboard.jsx`)
Keep the existing stat cards (`totalBookings`, `pendingBookings`, `totalServices`, `totalProjects`, `totalStaff`, `totalClients`, `recentBookings`) but gate each behind `analytics.view_*` and add: enquiries count, publications-in-review count, media count. These read existing `/api/admin/dashboard/stats`.
