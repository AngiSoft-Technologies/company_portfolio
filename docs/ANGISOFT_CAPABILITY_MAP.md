# AngiSoft Capability Map

Every platform capability, mapped to real pages, models, endpoints, and current UI.
Derived from `backend/src/routes/*.ts`, `backend/prisma/schema.prisma`, `frontend/src/pages/**`, `frontend/src/admin/**`.

---

## Capability: Service Management
- **Public pages:** `pages/services/ServicesList.jsx`, `pages/services/ServiceDetail.jsx`, `pages/Pricing.jsx`
- **Models:** `Service`, `ServiceCategory`, `ServicePricing`(via JSON on Service), `ServiceFaq`
- **Public endpoint:** `GET /api/services`, `GET /api/services/:slug`, `GET /api/service-categories`
- **Admin endpoint:** `GET/POST /api/services/admin`, `PUT /api/services/:id`, `DELETE /api/services/:id` (`routes/services.ts`)
- **Current admin UI:** `admin/crud/ServicesAdmin.jsx`, `admin/crud/ServiceCategoriesAdmin.jsx`, `admin/crud/FaqsAdmin.jsx`
- **Staff responsibilities:** create/update service content
- **Permissions:** `services.view`, `services.create`, `services.update`, `services.publish`, `services.manage_pricing`, `services.manage_faqs`, `services.archive`
- **Related products:** n/a
- **Status:** Implemented; PUT only `requireAuth` (gap — see audit §6.1)
- **Missing:** pricing-packages CRUD tied to a `ServicePricing` model (today pricing is loose JSON on `Service.pricing`/`features`).

## Capability: Product Management
- **Public pages:** `pages/Products.jsx`, `pages/ProductDetail.jsx`, `pages/products/{PetroFlow,DukaFlow,KejaLink,AngiTunes}.jsx`
- **Models:** `Product`, `ProductFaq`, `ProductInquiry`
- **Public endpoint:** `GET /api/products`, `GET /api/products/:slug`, `GET /api/product-faqs`, `GET /api/product-inquiries`
- **Admin endpoint:** `routes/products.ts` (`GET /admin`, `POST/PUT/DELETE`)
- **Current admin UI:** `admin/crud/ProductsAdmin.jsx`, `admin/crud/ProductFaqsAdmin.jsx`
- **Staff responsibilities:** update assigned product, manage product media, publish product updates
- **Permissions:** `products.view`, `products.view_assigned`, `products.update`, `products.update_assigned`, `products.publish`, `products.manage_media`, `products.archive`
- **Status:** Implemented; **no product→team relation** (no `ProductTeamMember`). Assignment cannot be expressed today.
- **Missing:** team/assignment model, product-update feed.

## Capability: Project / Portfolio Management
- **Public pages:** `pages/ProjectLists.jsx`, `pages/ProjectDetails.jsx`
- **Models:** `Project`, `ProjectEmployee`, `ProjectMilestone`, `ProjectActivity`, `ProjectComment`, `ProjectDeliverable`, `ClientProject`
- **Public endpoint:** `GET /api/projects`
- **Admin endpoint:** `routes/projects.ts`, `routes/client-projects.ts`
- **Current admin UI:** `admin/crud/ProjectsAdmin.jsx`, `admin/ClientProjectsManagement.jsx`
- **Staff responsibilities:** contribute to assigned projects, post progress
- **Permissions:** `projects.view_all`, `projects.view_assigned`, `projects.update_assigned`, `projects.assign_team`, `projects.add_progress`, `projects.publish_public_info`
- **Status:** `ProjectEmployee` join exists (assignment works for projects).

## Capability: Booking Operations
- **Public pages:** `pages/Booking.jsx`, `pages/bookings/BookingProgress.jsx`, `pages/bookings/BookingHistory.jsx`, `pages/bookings/BookingLookup.jsx`
- **Models:** `Booking`, `BookingEvent`, `Payment`, `Note`, `Quotation`(via JSON on details), `File`
- **Public endpoint:** `POST /api/bookings`, `GET /api/bookings/track/:token`, `GET /api/bookings/lookup`
- **Admin endpoint:** `routes/bookings.ts` (`/admin`, `/admin/:id/stage`, `/admin/:id/status`, `/admin/:id/events`, `/:id/review`)
- **Current admin UI:** `admin/BookingsManagement.jsx`
- **Staff responsibilities:** handle assigned bookings, advance stage, message customer
- **Permissions:** `bookings.view_all`, `bookings.view_assigned`, `bookings.update_assigned`, `bookings.change_stage`, `bookings.add_progress`, `bookings.message_customer`, `bookings.create_quotation`, `bookings.complete`, `bookings.cancel`
- **Status:** Booking has `assignedToId` → `Employee` (assignment works). Stage machine in `routes/bookings.ts` (`STAGE_ORDER`).
- **Missing:** full enquiries→booking conversion workflow, quotation model.

## Capability: Publications (Blog)
- **Public pages:** `pages/BlogList.jsx`, `pages/blog/BlogDetail.jsx`
- **Models:** `BlogPost`
- **Public endpoint:** `GET /api/blogs`, `GET /api/blogs/:slug`
- **Admin endpoint:** `routes/blogs.ts`, `routes/staff-blogs.ts` (`/my`, POST/PUT/DELETE own)
- **Current admin UI:** `admin/crud/BlogAdmin.jsx`
- **Staff responsibilities:** draft, submit for review, own-author edit
- **Permissions:** `publications.view_own`, `publications.create`, `publications.update_own`, `publications.submit_review`, `publications.publish`, `publications.archive`
- **Status:** `staff-blogs` already scopes by author; PUT only `requireAuth`.

## Capability: Enquiries & Contact
- **Public pages:** `pages/Contact.jsx`
- **Models:** `ContactEnquiry`, `ProductInquiry`
- **Public endpoint:** `POST /api/contact-enquiries`, `POST /api/product-inquiries`
- **Admin endpoint:** `routes/contact-enquiries.ts`, `routes/product-inquiries.ts`
- **Permissions:** `enquiries.view_all`, `enquiries.view_assigned`, `enquiries.respond`, `enquiries.convert_to_booking`, `enquiries.close`
- **Status:** Implemented; assignment not yet modeled (no assignee FK on `ContactEnquiry`).

## Capability: Reviews / Testimonials
- **Models:** `Testimonial`, `ReviewReaction`
- **Public endpoint:** `GET /api/testimonials`
- **Admin endpoint:** `routes/testimonials.ts` (approve/reject/feature/reply)
- **Permissions:** `reviews.moderate`, `reviews.reply`, `reviews.publish`, `reviews.feature`
- **Status:** Implemented; no user-submitted review create flow (only testimonials seeded by admin).

## Capability: Staff Profiles
- **Models:** `Employee`, `EmployeePortfolioItem`, `EmployeeProfileStat`, `Certification`, `EmployeeEducationItem`
- **Public endpoint:** `GET /api/staff`, `GET /api/staff/:usernameOrId`
- **Admin endpoint:** `routes/employee-profiles.ts`, `routes/certifications.ts`
- **Current admin UI:** `admin/StaffManagement.jsx` (role only)
- **Staff self-service:** `admin/StaffDashboard.jsx`
- **Permissions:** `profile.update_own`, `profile.manage_visibility_own`, `staff.assign_department`, `staff.assign_position`, `staff.assign_permissions`
- **Status:** Profile data rich; **no department/position/seniority as relational entities** (only free-text `department`, `seniorityLevel`, `publicTitle` strings on `Employee`).

## Capability: Page Content
- **Models:** `WebContent`(home/about via sections), `HomeSection`, `AboutSection`, `CompanyStat`, `Announcement`, `SiteSettings`, `Navigation`
- **Admin endpoint:** `routes/site.ts`, `routes/home-sections.ts`, `routes/about-sections.ts`, `routes/company-stats.ts`, `routes/announcements.ts`, `routes/settings.ts`
- **Permissions:** `pages.update_home`, `pages.update_about`, `pages.update_contact`, `pages.update_footer`, `pages.update_navigation`, `pages.publish`
- **Status:** Implemented across many small routers.

## Capability: Media / Uploads
- **Models:** `File`, `MediaAsset`(if present)
- **Admin endpoint:** `routes/uploads.ts`, `routes/admin.ts` upload, `admin/FileUpload*.jsx`
- **Permissions:** `media.upload`, `media.update_own`, `media.delete_any`
- **Status:** S3 + local upload both present; admin upload requires `requireAdminOrStaff`.

## Capability: Careers
- **Models:** `JobPosting`
- **Admin endpoint:** `routes/careers.ts` (`/admin`, CRUD)
- **Permissions:** `roles`-guarded by ADMIN/HR/MANAGER today (transition to `staff.assign_*` / hiring permission)
- **Status:** Implemented; hiring workflow not connected to staff pipeline.

## Capability: CRM — Clients & Support
- **Models:** `Client`, `SupportTicket`, `ClientProject`, `ClientAccessToken`
- **Admin endpoint:** `routes/client-projects.ts`, `routes/support-tickets.ts`, `routes/leads.ts`
- **Permissions:** `bookings.message_customer`, `enquiries.respond`
- **Status:** Client portal exists (`pages/ClientDashboard.jsx`, `ClientPortalAccess`).

## Capability: Analytics
- **Models:** `PageView`, `AuditLog`(via `services/audit.ts`)
- **Admin endpoint:** `routes/admin.ts /dashboard/stats`
- **Permissions:** `analytics.view_dashboard`, `analytics.view_bookings`
- **Status:** Basic dashboard counts only; no content/enquiry/publication analytics.
