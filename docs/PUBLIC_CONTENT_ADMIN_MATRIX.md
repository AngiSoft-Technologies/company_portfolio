# Public Content ↔ Admin Matrix

> **✅ REGENERATED 2026-11-20** against live routes (`backend/src/app.ts`), the Prisma contract, and `frontend/admin/src/app.tsx`. Supersedes the stale version that referenced deleted `frontend/src/admin/**` paths.
>
> Canonical ledger: `ANGISOFT_DIGITAL_HQ_PLAN.md` §6. Permission keys resolve through `backend/src/modules/identity/services/permissionRegistry.ts` (160 definitions, regenerated 2026-11-21).

Maps every public surface to its model(s), public endpoint, admin endpoint, admin screen, and gate permission.

| Public Surface | Model(s) | Public API | Admin API | Admin UI (`frontend/admin`) | Gate Permission | Status |
|---|---|---|---|---|---|---|
| Home | `HomeSection`, `CompanyStat` | `GET /api/site/home`, `GET /api/company-stats` | `GET/PUT /api/home-sections`, `GET/POST/PUT/DELETE /api/company-stats(/admin)` | `HomeSectionsAdmin` (`/sections`), `CompanyStatsAdmin` (`/company-stats`) | `pages.update_home`, `company_stats.view/update/delete` | ✅ |
| About | `AboutSection` | `GET /api/site/about` | `/api/about-sections` | `AboutAdmin` (`/about`) | `pages.update_about` | ✅ |
| Services List | `Service`, `ServiceCategory` | `GET /api/services`, `GET /api/service-categories` | `/api/services/admin`, `/api/service-categories/admin` | `ServicesAdmin` (`/services`), `ServiceCategoriesAdmin` (`/service-categories`) | `services.view/create/update`, `service_categories.*` | ✅ |
| Service Detail | `Service`, `ServiceFaq` | `GET /api/services/:slug` | `/api/services/:id`, `/api/service-faqs` | `ServicesAdmin`, `FaqsAdmin` (`/faqs`) | `services.update`, `services.manage_faqs` | ✅ |
| Pricing | `PricingPackage`, `Service.pricing` (JSON legacy) + `site_pricing` setting | `GET /api/pricing-packages`, `GET /api/services`, `GET /api/site/pricing` | `/api/pricing-packages/admin`, `/api/services/:id/pricing`, `PUT /api/site/pricing` | `PricingPackagesAdmin` (`/pricing-packages`), `PricingAdmin` (`/pricing`), `ServicesAdmin` | `services.manage_pricing` | ✅ Package model + public cards on `/pricing` |
| Products List/Detail | `Product`, `ProductFaq`, `ProductInquiry` | `GET /api/products`, `GET /api/products/:slug`, `GET /api/product-faqs` | `/api/products/admin`, `/api/product-faqs/admin` | `ProductsAdmin` (`/products`) | `products.*` | ✅ |
| Blog List/Detail | `BlogPost`, `BlogCategory` | `GET /api/blogs`, `GET /api/blogs/:slug` | `/api/blogs/admin` | `BlogAdmin` (`/blogs`) | `publications.review/publish` | ✅ |
| Staff Publications | `StaffBlog` | `GET /api/staff-blogs` | `/api/staff-blogs` | `BlogAdmin` (shared) | `publications.create/update_own` | ✅ |
| Staff List/Detail | `Employee`, `EmployeePortfolioItem`, `Certification`, `EmployeeProfileStat` | `GET /api/staff`, `GET /api/staff/:usernameOrId` | `/api/employee-profiles`, `/api/certifications` | `StaffManagement` (`/staff`), `StaffAccess` (`/staff-access`), `StaffDashboard` (self) | `staff.view`, `profile.update_own` | ⚠️ Dept/pos assignment lives in `StaffAccess`, not `StaffManagement` |
| Portfolio Studio | `EmployeePortfolioItem`, `EmployeePortfolioConfig` | `GET /api/staff/:usernameOrId` (`portfolioStudio` when published), `GET /api/employee-profiles/portfolio-config/public/:employeeId` | `/api/employee-profiles/portfolio-config(/:employeeId)(/publish|/unpublish)` | `PortfolioStudio` (`/workspace/portfolio-studio`, self-service), `PortfolioApprovals` (`/portfolio-approvals`) | `profile.update_own`, `profile.manage_gallery_own`, `staff.view` | ✅ Editor + drag ordering + themes/layouts + structured block editors (testimonials, featured work, case studies, certifications override, CV) + publish/version history + moderation; migration `20261120T1115` applied |
| Industries | `Industry` + `site_industries` setting | `GET /api/industries`, `GET /api/site/industries` | `/api/industries/admin`, `PUT /api/site/industries` | `IndustriesAdmin` (`/industries`), `SiteSettingsAdmin` | `industries.*`, `pages.update_industries` | ✅ |
| Industry Detail | `Industry`, `Project.industry` | `GET /api/site/industries`, `GET /api/projects` | as above | as above | — | ✅ projects filtered by `industry` slug |
| Solutions | `Solution` | `GET /api/solutions` | `/api/solutions/admin` | `SolutionsAdmin` (`/solutions`) | `solutions.*` | ✅ |
| Projects | `Project`, `ProjectEmployee`, `ProjectMilestone`, `ProjectActivity`, `ProjectComment`, `ProjectDeliverable` | `GET /api/projects`, `GET /api/projects/:slug` | `/api/projects/admin`, `/api/projects/staff*`, `/api/client-projects` | `ProjectsAdmin` (`/projects`), `ClientProjectsManagement` (`/client-projects`) | `projects.view/manage/update_assigned` | ✅ |
| Booking | `Booking`, `BookingEvent`, `Payment` | `POST /api/bookings`, `GET /api/bookings/track/:token`, `GET /api/bookings/lookup` | `/api/bookings/admin*` | `BookingsManagement` (`/bookings`) | `bookings.view_all/update_assigned/change_stage/add_progress` | ✅ |
| Contact / Enquiries | `ContactEnquiry` | `POST /api/contact-enquiries` | `/api/contact-enquiries/admin` | `ContactsAdmin` (`/contacts`) | `enquiries.view_all/respond/close` | ✅ |
| Client Portal | `ClientAccessToken`, `ClientProject`, `Invoice`, `Quote`, `Testimonial` | `/api/client-portal/*` (request-link, session, profile, bookings, projects, quotes, invoices, testimonials, project detail/comments) | `/api/client-projects/admin` | `ClientProjectsManagement` (`/client-projects`), portal dashboard sections (projects/billing incl. pay-now/feedback) | `client_projects.view_all` | ✅ Testimonials land in `TestimonialsAdmin` moderation (`confirmed=false`) |
| Sales Pipeline | `Lead`, `Opportunity`, `Quote`, `QuoteLineItem`, `Invoice`, `InvoiceLineItem` | — (staff-only) | `/api/leads`, `/api/opportunities`, `/api/quotes`, `/api/invoices` | `OpportunitiesAdmin` (`/opportunities`), `QuotesAdmin` (`/quotes`), `InvoicesAdmin` (`/invoices`) | `opportunities.*`, `quotes.*`, `invoices.*`, `sales.pipeline.view` | ✅ |
| Testimonials | `Testimonial` | `GET /api/testimonials` | `/api/testimonials/admin` | `TestimonialsAdmin` (`/testimonials`) | `reviews.moderate` | ✅ |
| FAQs | `Faq`, `ServiceFaq` | `GET /api/faqs`, `GET /api/service-faqs` | `/api/faqs`, `/api/service-faqs` | `FaqsAdmin` (`/faqs`) | `faqs.*`, `services.manage_faqs` | ✅ |
| Careers | `JobPosting` | `GET /api/careers` | `/api/careers/admin` | `CareersAdmin` (`/careers`) | `careers.*` | ✅ |
| Announcements | `Announcement` | `GET /api/announcements` | `/api/announcements/admin` | `AnnouncementsAdmin` (`/announcements`) | `pages.update_announcements` | ✅ |
| Newsletter | `Newsletter` | `POST /api/newsletter` | `/api/newsletters/admin` | `NewslettersAdmin` (`/newsletters`) | `newsletters.*` | ✅ |
| Surveys | `Survey` | — | `/api/surveys` | `SurveysAdmin` (`/surveys`) | `surveys.*` | ✅ |
| Support Tickets | `SupportTicket` | — (portal) | `/api/support-tickets` | `SupportTicketsAdmin` (`/support-tickets`) | `support_tickets.*` | ✅ SLA badge + thread + internal notes |
| Product Inquiries | `ProductInquiry` | `POST /api/product-inquiries` | `/api/product-inquiries/admin` | `ProductInquiriesAdmin` (`/product-inquiries`) | `product_inquiries.*` | ✅ |
| AI Chatbot | `ChatConversation`, `ChatMessage` | `/api/chatbot/*` (public widget) | `/api/chatbot/conversations` | `ChatConversationsAdmin` (`/chat`) | `chatbot.view_all/respond` | ✅ |
| Notifications | `Notification` | — | `/api/notifications` | — (in-app bell) | `notifications.*` | ⚠️ No dedicated admin screen |
| Files/Media | `File` | `/uploads/*` | `/api/uploads` | `FileUploadManager` (`/uploads`) | `media.upload/manage` | ✅ |
| Legal (Privacy/Terms) | static/content | — | — | — | — | ⚠️ Static pages, not CMS-driven |
| Offices/Locations | `Office` | `GET /api/offices` | `/api/offices/admin` | `OfficesAdmin` (`/offices`), `SiteSettingsAdmin` (`/settings`) | `pages.update_contact` | ✅ Structured model; contact page renders `ContactOffices` cards |

## Notes

- **Permission resolution:** route guards use `requireAccess(permission, fallbackRoles)`; explicit DENY always wins (`effectivePermissions.ts`). Response shaping uses `hasPermission()` — `isRole()` no longer appears in route files.
- **Public content rule:** all public pages read `/api/*`; business content must not be hardcoded in components (`AGENTS.md`).
- **Admin UIs:** all backend domains now have screens — Newsletters (`/newsletters`), Surveys (`/surveys`), Support Tickets (`/support-tickets`), Product Inquiries (`/product-inquiries`), Notifications (bell in header).
- **Structural gaps:** none remaining in the content matrix — Pricing-package and Office models shipped; Portfolio Studio complete incl. CV block.
