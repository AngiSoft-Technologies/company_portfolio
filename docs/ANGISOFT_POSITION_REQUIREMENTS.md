# AngiSoft Position Requirements

Positions derived from **real platform responsibilities**, not generic titles.
Public profile type = what the Staff List (`pages/StaffList.jsx`) and `GET /api/staff` should show.
System role (SUPER_ADMIN/ADMIN/STAFF) is **separate** — never exposed publicly.

| Position | Department | Evidence | Supported Services | Supported Products | Internal Responsibilities | Suggested Permissions | Required Now | Future Role | Public Profile Type |
|---|---|---|---|---|---|---|---|---|---|
| Founder & Lead Software Developer | Software Engineering | Single founder pattern; products all founder-built; `Employee.role` seeded as owner | All custom software | All 4 | Architecture, final sign-off | SUPER_ADMIN + all | REQUIRED_NOW | — | "Founder & Lead Software Developer" |
| Flutter / Mobile Developer | Software Engineering | Products KejaLink & AngiTunes use/plan Flutter; Service "Mobile Development" | Mobile Development | KejaLink, AngiTunes | Build mobile apps, mobile releases | `projects.update_assigned`, `products.update_assigned`, `publications.create` | REQUIRED_NOW | Lead Mobile | "Mobile Application Developer" |
| Full-Stack Developer | Software Engineering | `routes/services.ts`, `routes/projects.ts`, web services | Web Development, Custom Systems | DukaFlow, PetroFlow | Build web apps, APIs, dashboards | `services.update_assigned`, `projects.update_assigned`, `publications.create` | REQUIRED_NOW | Tech Lead | "Full-Stack Developer" |
| Backend / Database Developer | Software Engineering | Service "System and Database Design"; `prisma/schema.prisma` owned | System and Database Design, Code Debugging | All (data layer) | Schema, APIs, data pipelines | `services.update_assigned`, `projects.add_progress` | USEFUL_NOW | Data Architect | "Backend & Database Developer" |
| UI/UX Designer | Design & Creative | Product UI, design system CSS, Service "Graphic Design" | Graphic Design | All (UI) | Wireframes, flows, design tokens | `media.upload`, `products.manage_media_assigned`, `publications.create` | REQUIRED_NOW | Design Lead | "UI/UX Designer" |
| Graphic Designer | Design & Creative | `Logos/` assets, branding, posters | Graphic Design | All (brand) | Logos, marketing art | `media.upload`, `pages.update_*`(partial) | USEFUL_NOW | Brand Designer | "Graphic Designer" |
| Data Analyst | Data & Analytics | Service "Data Analysis" (Python/Excel) | Data Analysis | — | Dashboards, reports, `CompanyStat` | `analytics.view_*`, `pages.update_*`(stats) | USEFUL_NOW | Analytics Lead | "Data Analyst" |
| Content Contributor | Content & Communications | `BlogPost` system, `Announcement`, marketing copy | — | — | Draft publications, announcements | `publications.create`, `publications.update_own`, `media.upload` | USEFUL_NOW | Comms Officer | "Content Contributor" |
| Customer Relations Officer | Client Operations | `ContactEnquiry`, `ProductInquiry`, `Booking` | — (all sales-facing) | — | Respond enquiries, convert to booking | `enquiries.respond`, `enquiries.convert_to_booking`, `bookings.message_customer` | REQUIRED_NOW | CRM Lead | "Customer Relations Officer" |
| Technical Support Engineer | Client Operations | `SupportTicket`, `Client` portal, booking progress | Code Debugging | All (support) | Resolve tickets, booking progress | `bookings.view_assigned`, `bookings.update_assigned`, `bookings.add_progress` | USEFUL_NOW | Support Lead | "Technical Support Engineer" |
| Operations Administrator | Client Operations | `routes/settings.ts`, `SiteSettings`, scheduling | Online Applications | — | Ops coordination, settings | `settings.manage`, `bookings.assign` | USEFUL_NOW | Ops Manager | "Operations Administrator" |
| Product Manager (part-time) | Product Management (FUTURE dept) | 4 products with `ProductStatus` lifecycle | — | All 4 | Roadmap, releases | `products.update`, `products.publish` | FUTURE | Product Lead | "Product Manager" |

### Positions explicitly NOT created now
- Cybersecurity Engineer — no secure-engineering service exists (see `ANGISOFT_CURRENT_DEPARTMENTS.md` §7).
- DevOps / SRE — no infra team code.
- QA Engineer — tests are files, not a function.
- Sales Executive — `SALES` enum exists but no pipeline.
- HR Generalist — hiring is ad-hoc via invites (`Employee.inviteToken`), no HR workflow.
