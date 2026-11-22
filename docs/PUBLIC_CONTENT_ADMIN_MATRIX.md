# Public Content ↔ Admin Matrix

> **✅ REGENERATED 2026-11-20** against live routes (`backend/src/app.ts`), the Prisma contract, and `frontend/admin/src/app.tsx`. Supersedes the stale version that referenced deleted `frontend/src/admin/**` paths.
>
> Canonical ledger: `ANGISOFT_DIGITAL_HQ_PLAN.md` §6. Permission keys resolve through `backend/src/modules/identity/services/permissionRegistry.ts` (160 definitions, regenerated 2026-11-21).

Maps every public surface to its model(s), public endpoint, admin endpoint, admin screen, and gate permission.

| Public Surface | Model(s) | Public API | Admin API | Admin UI (`frontend/admin`) | Gate Permission | Status |
|---|---|---|---|---|---|---|
| Home | `HomeSection`, `CompanyStat` | `GET /v1/site/home`, `GET /v1/company-stats` | `GET/PUT /v1/home-sections`, `GET/POST/PUT/DELETE /v1/company-stats(/admin)` | `HomeSectionsAdmin` (`/sections`), `CompanyStatsAdmin` (`/company-stats`) | `pages.update_home`, `company_stats.view/update/delete` | ✅ |
| About | `AboutSection` | `GET /v1/site/about` | `/v1/about-sections` | `AboutAdmin` (`/about`) | `pages.update_about` | ✅ |
| Services List | `Service`, `ServiceCategory` | `GET /v1/services`, `GET /v1/service-categories` | `/v1/services/admin`, `/v1/service-categories/admin` | `ServicesAdmin` (`/services`), `ServiceCategoriesAdmin` (`/service-categories`) | `services.view/create/update`, `service_categories.*` | ✅ |
| Service Detail | `Service`, `ServiceFaq` | `GET /v1/services/:slug` | `/v1/services/:id`, `/v1/service-faqs` | `ServicesAdmin`, `FaqsAdmin` (`/faqs`) | `services.update`, `services.manage_faqs` | ✅ |
| Pricing | `PricingPackage`, `Service.pricing` (JSON legacy) + `site_pricing` setting | `GET /v1/pricing-packages`, `GET /v1/services`, `GET /v1/site/pricing` | `/v1/pricing-packages/admin`, `/v1/services/:id/pricing`, `PUT /v1/site/pricing` | `PricingPackagesAdmin` (`/pricing-packages`), `PricingAdmin` (`/pricing`), `ServicesAdmin` | `services.manage_pricing` | ✅ Package model + public cards on `/pricing` |
| Products List/Detail | `Product`, `ProductFaq`, `ProductInquiry` | `GET /v1/products`, `GET /v1/products/:slug`, `GET /v1/product-faqs` | `/v1/products/admin`, `/v1/product-faqs/admin` | `ProductsAdmin` (`/products`) | `products.*` | ✅ |
| Blog List/Detail | `BlogPost`, `BlogCategory` | `GET /v1/blogs`, `GET /v1/blogs/:slug` | `/v1/blogs/admin` | `BlogAdmin` (`/blogs`) | `publications.review/publish` | ✅ |
| Staff Publications | `StaffBlog` | `GET /v1/staff-blogs` | `/v1/staff-blogs` | `BlogAdmin` (shared) | `publications.create/update_own` | ✅ |
| Staff List/Detail | `Employee`, `EmployeePortfolioItem`, `Certification`, `EmployeeProfileStat` | `GET /v1/staff`, `GET /v1/staff/:usernameOrId` | `/v1/employee-profiles`, `/v1/certifications` | `StaffManagement` (`/staff`), `StaffAccess` (`/staff-access`), `StaffDashboard` (self) | `staff.view`, `profile.update_own` | ⚠️ Dept/pos assignment lives in `StaffAccess`, not `StaffManagement` |
| Portfolio Studio | `EmployeePortfolioItem`, `EmployeePortfolioConfig` | `GET /v1/staff/:usernameOrId` (`portfolioStudio` when published), `GET /v1/employee-profiles/portfolio-config/public/:employeeId` | `/v1/employee-profiles/portfolio-config(/:employeeId)(/publish|/unpublish)` | `PortfolioStudio` (`/workspace/portfolio-studio`, self-service), `PortfolioApprovals` (`/portfolio-approvals`) | `profile.update_own`, `profile.manage_gallery_own`, `staff.view` | ✅ Editor + drag ordering + themes/layouts + structured block editors (testimonials, featured work, case studies, certifications override, CV) + publish/version history + moderation; migration `20261120T1115` applied |
| Industries | `Industry` + `site_industries` setting | `GET /v1/industries`, `GET /v1/site/industries` | `/v1/industries/admin`, `PUT /v1/site/industries` | `IndustriesAdmin` (`/industries`), `SiteSettingsAdmin` | `industries.*`, `pages.update_industries` | ✅ |
| Industry Detail | `Industry`, `Project.industry` | `GET /v1/site/industries`, `GET /v1/projects` | as above | as above | — | ✅ projects filtered by `industry` slug |
| Solutions | `Solution` | `GET /v1/solutions` | `/v1/solutions/admin` | `SolutionsAdmin` (`/solutions`) | `solutions.*` | ✅ |
| Projects | `Project`, `ProjectEmployee`, `ProjectMilestone`, `ProjectActivity`, `ProjectComment`, `ProjectDeliverable` | `GET /v1/projects`, `GET /v1/projects/:slug` | `/v1/projects/admin`, `/v1/projects/staff*`, `/v1/client-projects` | `ProjectsAdmin` (`/projects`), `ClientProjectsManagement` (`/client-projects`) | `projects.view/manage/update_assigned` | ✅ |
| Booking | `Booking`, `BookingEvent`, `Payment` | `POST /v1/bookings`, `GET /v1/bookings/track/:token`, `GET /v1/bookings/lookup` | `/v1/bookings/admin*` | `BookingsManagement` (`/bookings`) | `bookings.view_all/update_assigned/change_stage/add_progress` | ✅ |
| Contact / Enquiries | `ContactEnquiry` | `POST /v1/contact-enquiries` | `/v1/contact-enquiries/admin` | `ContactsAdmin` (`/contacts`) | `enquiries.view_all/respond/close` | ✅ |
| Client Portal | `ClientAccessToken`, `ClientProject`, `Invoice`, `Quote`, `Testimonial` | `/v1/client-portal/*` (request-link, session, profile, bookings, projects, quotes, invoices, testimonials, project detail/comments) | `/v1/client-projects/admin` | `ClientProjectsManagement` (`/client-projects`), portal dashboard sections (projects/billing incl. pay-now/feedback) | `client_projects.view_all` | ✅ Testimonials land in `TestimonialsAdmin` moderation (`confirmed=false`) |
| Sales Pipeline | `Lead`, `Opportunity`, `Quote`, `QuoteLineItem`, `Invoice`, `InvoiceLineItem` | — (staff-only) | `/v1/leads`, `/v1/opportunities`, `/v1/quotes`, `/v1/invoices` | `OpportunitiesAdmin` (`/opportunities`), `QuotesAdmin` (`/quotes`), `InvoicesAdmin` (`/invoices`) | `opportunities.*`, `quotes.*`, `invoices.*`, `sales.pipeline.view` | ✅ |
| Testimonials | `Testimonial` | `GET /v1/testimonials` | `/v1/testimonials/admin` | `TestimonialsAdmin` (`/testimonials`) | `reviews.moderate` | ✅ |
| FAQs | `Faq`, `ServiceFaq` | `GET /v1/faqs`, `GET /v1/service-faqs` | `/v1/faqs`, `/v1/service-faqs` | `FaqsAdmin` (`/faqs`) | `faqs.*`, `services.manage_faqs` | ✅ |
| Careers | `JobPosting` | `GET /v1/careers` | `/v1/careers/admin` | `CareersAdmin` (`/careers`) | `careers.*` | ✅ |
| Announcements | `Announcement` | `GET /v1/announcements` | `/v1/announcements/admin` | `AnnouncementsAdmin` (`/announcements`) | `pages.update_announcements` | ✅ |
| Newsletter | `Newsletter` | `POST /v1/newsletter` | `/v1/newsletters/admin` | `NewslettersAdmin` (`/newsletters`) | `newsletters.*` | ✅ |
| Surveys | `Survey` | — | `/v1/surveys` | `SurveysAdmin` (`/surveys`) | `surveys.*` | ✅ |
| Support Tickets | `SupportTicket` | — (portal) | `/v1/support-tickets` | `SupportTicketsAdmin` (`/support-tickets`) | `support_tickets.*` | ✅ SLA badge + thread + internal notes |
| Product Inquiries | `ProductInquiry` | `POST /v1/product-inquiries` | `/v1/product-inquiries/admin` | `ProductInquiriesAdmin` (`/product-inquiries`) | `product_inquiries.*` | ✅ |
| AI Chatbot | `ChatConversation`, `ChatMessage` | `/v1/chatbot/*` (public widget) | `/v1/chatbot/conversations` | `ChatConversationsAdmin` (`/chat`) | `chatbot.view_all/respond` | ✅ |
| Notifications | `Notification` | — | `/v1/notifications` | — (in-app bell) | `notifications.*` | ⚠️ No dedicated admin screen |
| Files/Media | `File` | `/uploads/*` | `/v1/uploads` | `FileUploadManager` (`/uploads`) | `media.upload/manage` | ✅ |
| Legal (Privacy/Terms) | static/content | — | — | — | — | ⚠️ Static pages, not CMS-driven |
| Offices/Locations | `Office` | `GET /v1/offices` | `/v1/offices/admin` | `OfficesAdmin` (`/offices`), `SiteSettingsAdmin` (`/settings`) | `pages.update_contact` | ✅ Structured model; contact page renders `ContactOffices` cards |

## Notes

- **Permission resolution:** route guards use `requireAccess(permission, fallbackRoles)`; explicit DENY always wins (`effectivePermissions.ts`). Response shaping uses `hasPermission()` — `isRole()` no longer appears in route files.
- **Public content rule:** all public pages read `/v1/*`; business content must not be hardcoded in components (`AGENTS.md`).
- **Admin UIs:** all backend domains now have screens — Newsletters (`/newsletters`), Surveys (`/surveys`), Support Tickets (`/support-tickets`), Product Inquiries (`/product-inquiries`), Notifications (bell in header).
- **Structural gaps:** none remaining in the content matrix — Pricing-package and Office models shipped; Portfolio Studio complete incl. CV block.
