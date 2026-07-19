# AngiSoft Current Departments

Derived from the **actual** services, products, and workflows — not generic tech-company org charts.
Classification legend: **REQUIRED_NOW**, **USEFUL_NOW**, **FUTURE**, **NOT_CURRENTLY_JUSTIFIED**.

> Today the DB has no `Department` entity. `Employee.department` is a free-text string. These are *proposed* departments to introduce as a relational table, each justified by concrete platform evidence.

---

## 1. Software Engineering — **REQUIRED_NOW**
- **Evidence:** Services "Web Development", "Mobile Development", "Code Debugging", "System and Database Design", "Custom Systems" (`Service` rows), and Products PetroFlow/DukaFlow/KejaLink/AngiTunes all require build work. `routes/projects.ts` powers Client/portfolio projects.
- **Supports:** All custom software services + all 4 products.
- **Positions:** Flutter Developer, Full-Stack Developer, Backend Developer, Database Developer, Systems Analyst.

## 2. Design & Creative — **REQUIRED_NOW**
- **Evidence:** Service "Graphic Design", product UI/branding needs, `uploads/public/images/Logos/` assets, CSS/design system in `frontend/src/css/blog/*`.
- **Supports:** Service "Graphic Design", product branding, marketing media.
- **Positions:** UI/UX Designer, Graphic Designer.

## 3. Data & Analytics — **USEFUL_NOW**
- **Evidence:** Service "Data Analysis" (Python/Excel dashboards), `PageView`/`analytics` collection, `CompanyStat` content managed in admin.
- **Supports:** Service "Data Analysis", internal reporting.
- **Positions:** Data Analyst.

## 4. Content & Communications — **USEFUL_NOW**
- **Evidence:** `BlogPost` publication system, `Announcement`, `Testimonial`, `pages.update_*` content routers, marketing services.
- **Supports:** Publications, page content, careers/about copy.
- **Positions:** Content Contributor, Content & Communications Officer.

## 5. Client Operations & Support — **REQUIRED_NOW**
- **Evidence:** `Booking` workflow + `STAGE_ORDER` stage machine, `ContactEnquiry`, `ProductInquiry`, `SupportTicket`, `Client` portal.
- **Supports:** Bookings, enquiries, client success.
- **Positions:** Customer Relations Officer, Technical Support Engineer, Operations Administrator.

## 6. Product Management — **FUTURE (useful now as a role, not a full dept)**
- **Evidence:** 4 products in active development with distinct stages (`ProductStatus` enum). No PM today.
- **Positions:** Product Manager (1, part-time), Technical Project Manager.

## 7. Cybersecurity — **FUTURE / NOT_CURRENTLY_JUSTIFIED**
- **Evidence:** The prompt lists "document editing, KRA/SHA/good conduct applications" under Cyber services on the public site, but **no secure backend service, no security operations unit, no audit/IR workflow exists in code**. The company markets cyber *document* services, not cybersecurity engineering.
- **Recommendation:** Do **not** create a Cybersecurity department in the active model yet. Keep schema extensible (`department` is a relation, so it can be added later without migration pain).

## 8. Human Resources — **FUTURE**
- **Evidence:** `Careers`/`JobPosting`, `Employee` hiring fields (invite/accept), but no HR operations workflow.
- **Recommendation:** Add when hiring ramps; not needed to operate current platform.

---

### Departments to AVOID creating now
- "DevOps / Platform Engineering" — no CI/CD or infra code present beyond deploy scripts.
- "QA / Test Engineering" — no test-orchestration team; tests exist as files only.
- "Sales" — `SALES` exists in the role enum but no sales pipeline/CRM-ops code; treat as FUTURE.
