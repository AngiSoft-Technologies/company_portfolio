# Public Content ↔ Admin Matrix

Maps every public page (data-driven from `/api/*`) to its model, public endpoint, admin CRUD, and the permission that should gate the admin side.
"Missing CRUD" = public page exists but no complete admin editor.

---

| Public Page | Model(s) | Public Endpoint | Admin Endpoint | Admin CRUD File | Gate Permission | Missing CRUD |
|---|---|---|---|---|---|---|
| Home | `HomeSection`, `WebContent`, `CompanyStat` | `/api/site/home`, `/api/company-stats` | `/api/home-sections`, `/api/company-stats` | `HomeSectionsAdmin.jsx`, `CompanyStatsAdmin.jsx` | `pages.update_home` | No |
| About | `AboutSection` | `/api/site/about` | `/api/about-sections` | `AboutAdmin.jsx` | `pages.update_about` | No |
| Services List | `Service`, `ServiceCategory` | `/api/services`, `/api/service-categories` | `/api/services/admin` | `ServicesAdmin.jsx`, `ServiceCategoriesAdmin.jsx` | `services.update` | No (but PUT only `requireAuth` — security gap) |
| Service Detail | `Service`, `ServiceFaq` | `/api/services/:slug` | `/api/services/:id` | `ServicesAdmin.jsx`, `FaqsAdmin.jsx` | `services.update` | No |
| Pricing | `Service.pricing` (JSON) | `/api/services` (pricing field) | `/api/services/:id` | `ServicesAdmin.jsx` | `services.manage_pricing` | **Yes** — no dedicated pricing-packages model/UI |
| Products List | `Product` | `/api/products` | `/api/products/admin` | `ProductsAdmin.jsx` | `products.update` | No (no team assignment UI) |
| Product Detail | `Product`, `ProductFaq`, `ProductInquiry` | `/api/products/:slug` | `/api/products/:id` | `ProductsAdmin.jsx`, `ProductFaqsAdmin.jsx` | `products.update` | No |
| Blog List | `BlogPost` | `/api/blogs` | `/api/blogs/admin`, `/api/staff-blogs` | `BlogAdmin.jsx` | `publications.review`/`create` | No |
| Blog Detail | `BlogPost` | `/api/blogs/:slug` | `/api/admin/blogs/:id` | `BlogAdmin.jsx` | `publications.publish` | No |
| Staff List | `Employee` | `/api/staff` | `/api/admin/staff` | `StaffManagement.jsx` | `staff.view` | **Yes** — no department/position/permission UI (only role dropdown) |
| Staff Detail | `Employee`, `EmployeePortfolioItem`, `Certification` | `/api/staff/:usernameOrId` | `/api/employee-profiles` | `StaffDashboard.jsx` | `profile.update_own` | No (self only) |
| Contact | `SiteSettings`, `ContactEnquiry` | `POST /api/contact-enquiries` | `/api/settings` | `SiteSettingsAdmin.jsx` | `pages.update_contact` | No |
| Booking | `Booking`, `Service` | `POST /api/bookings` | `/api/bookings/admin` | `BookingsManagement.jsx` | `bookings.view_all` | No |
| Booking Progress | `Booking`, `BookingEvent` | `/api/bookings/track/:token` | `/api/bookings/admin/:id/events` | `BookingsManagement.jsx` | `bookings.add_progress` | No |
| Reviews | `Testimonial` | `/api/testimonials` | `/api/testimonials/admin` | `TestimonialsAdmin.jsx` | `reviews.moderate` | No |
| Testimonials | `Testimonial` | `/api/testimonials` | same | same | `reviews.moderate` | No |
| FAQs | `ServiceFaq`, `Faq` | `/api/faqs`, `/api/service-faqs` | `/api/faqs` | `FaqsAdmin.jsx` | `services.manage_faqs` | No |
| Industries | `Industry` | `/api/industries` | `/api/industries/admin` | **None found** | `pages.update_*` | **Yes** — public page present, no admin CRUD |
| Solutions | `Solution` | `/api/solutions` | `/api/solutions/admin` | **None found** | `pages.update_*` | **Yes** — public page present, no admin CRUD |
| Navigation | `Navigation` | `/api/site/navigation` | `/api/settings` | `SiteSettingsAdmin.jsx` | `pages.update_navigation` | Partial |
| Footer | `SiteSettings` | `/api/site/footer` | `/api/settings` | `SiteSettingsAdmin.jsx` | `pages.update_footer` | No |
| Branding | `SiteSettings`, `File` | `/api/site/branding` | `/api/uploads` | `FileUpload*.jsx` | `media.upload` | No |
| Company Stats | `CompanyStat` | `/api/company-stats` | `/api/company-stats` | `CompanyStatsAdmin.jsx` | `pages.update_home` | No |
| Careers | `JobPosting` | `/api/careers` | `/api/careers/admin` | `CareersAdmin.jsx` | `roles`-guarded (-> `staff.assign_*`) | No (uses role gate, not permission) |
| Announcements | `Announcement` | `/api/announcements` | `/api/announcements/admin` | `AnnouncementsAdmin.jsx` | `pages.update_*` | No |

## Key takeaways
- **Public data is DB-driven** (per `AGENTS.md`) — every listed page reads from an API, so the admin CRUD is the source of truth.
- **3 genuine missing CRUD pages:** Pricing packages, Industries, Solutions.
- **1 major missing UI:** Staff access management (`/admin/staff/:id/access`) — the central deliverable of this reconstruction.
- **Security-gate debt:** most admin endpoints today rely on `requireRoles(...)` + hardcoded enums or `requireAuth` only; they need migration to `requirePermission(...)` per this matrix (the "update everything to new architecture" sweep).
