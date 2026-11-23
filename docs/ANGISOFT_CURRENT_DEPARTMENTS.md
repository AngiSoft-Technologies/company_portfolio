# AngiSoft Current Departments

> **🔄 REGENERATE** — Rebuilt against live code on **2026-11-23**. Live registry is the seeded DB data, not a proposal: `backend/prisma/seed-professional.ts:62-93` seeds **5 departments** and **11 positions**; `Employee.departmentId`/`positionId` are relational fields in `backend/src/prisma/contract.prisma`.
>
> Legacy premise retired: the old claim "the DB has no `Department` entity; `Employee.department` is free text" is **false**. So is "`SALES` exists in the role enum" (no `SALES` system role). Infrastructure/CI now exists (`infrastructure/`, `.github/workflows/`).
> Canonical plan: `ANGISOFT_DIGITAL_HQ_PLAN.md` §7 and §10. Seed source of truth: `backend/prisma/seed-professional.ts`.
> Classification: **REQUIRED_NOW**, **USEFUL_NOW**, **FUTURE**, **NOT_CURRENTLY_JUSTIFIED**.

---

## 1. Software Engineering — **REQUIRED_NOW** (seeded `SOFTWARE_ENGINEERING`)

- **Evidence:** Services Web/Mobile Development, Code Debugging, System & Database Design; four products (PetroFlow, DukaFlow, KejaLink, AngiTunes); `modules/projects/routes/projects.ts`; `modules/billing`, `modules/agents` backend work.
- **Supports:** all custom software services and products; platform backend; AI workforce engine.
- **Seeded positions (4):** Founder & Lead Software Developer, Flutter / Mobile Developer, Full-Stack Developer, Backend / Database Developer.
- **Future extensions:** Systems Analyst (listed in plan §7, **not** in current seed), DevOps/SRE (not justified as a separate dept — CI/deploy scripts exist but no dedicated team).

## 2. Design & Creative — **REQUIRED_NOW** (seeded `DESIGN_CREATIVE`)

- **Evidence:** Graphic Design service; product UI/branding; `@angisoft/ui` tokens/themes; public imagery via Tigris CDN; design system rules (`ANGISOFT_DESIGN_SYSTEM_RULES.md`).
- **Supports:** product branding, marketing media, portfolio studio themes.
- **Seeded positions (2):** UI/UX Designer, Graphic Designer. `displayTitleTemplate` for both is `"{seniority} …"`.

## 3. Data & Analytics — **USEFUL_NOW** (seeded `DATA_ANALYTICS`)

- **Evidence:** Data Analysis service; `PageView`, `AnalyticsEvent`, `CompanyStat` models; `/v1/admin/reports/overview`; analytics permission keys in the registry.
- **Supports:** client reporting, internal dashboards.
- **Seeded position (1):** Data Analyst. (`ML Engineer` in plan §7 is **not** seeded.)

## 4. Content & Communications — **USEFUL_NOW** (seeded `CONTENT_COMMS`)

- **Evidence:** `BlogPost`, `StaffBlog`, `Announcement`, `Testimonial`, CMS routers, marketing copy, newsletter (`Newsletter`, `Subscriber`).
- **Supports:** publications, page content, careers/about copy, i18n dictionary upkeep.
- **Seeded positions (2):** Content Contributor, Content & Communications Officer.

## 5. Client Operations & Support — **REQUIRED_NOW** (seeded `CLIENT_OPS`)

- **Evidence:** booking 9-stage machine, `ContactEnquiry`, `ProductInquiry`, `SupportTicket` (SLA), `ClientAccessToken` portal, `Conversation`/`ConversationMessage` unified inbox.
- **Supports:** bookings, enquiries, client success, support and communications inbox.
- **Seeded positions (2):** Support Specialist, Client Operations Coordinator.
- **Planned, not seeded:** Client Success Manager, Technical Account Manager. **Contradiction flagged (2026-11-23):** canonical plan §7.1/§7.2 labels these "Seeded", but the code seed (`backend/prisma/seed-professional.ts`) and a read-only live Neon query both return the same 11 positions with no CSM/TAM rows. Kept as *planned* until a seed change is approved — do not cite the plan's "Seeded" heading as evidence.

## 6. Product Management — **FUTURE** (role, not a seeded department)

- **Evidence:** four products with `ProductStatus`; no PM row in `seed-professional.ts`.
- **Position:** Product Manager (part-time) — plan §7 future list. Gate: add `PRODUCT` department key + position row in seed before assigning staff.

## 7. Cybersecurity — **NOT_CURRENTLY_JUSTIFIED** as an internal department

- **Evidence:** public site markets cyber *document* services (KRA/SHA/good-conduct); there is no security operations unit, audit/IR workflow, or seeded `CYBER` department. `SecurityPanel` is an MFA settings screen, not a SOC.
- **Canonical distinction (`ANGISOFT_DIGITAL_HQ_PLAN.md` §10):** a service line may be marketed without being an internal department. Do not infer a department from `BRAND_EXPANSION_STRATEGY.md` (💡 HYPOTHESIS).

## 8. Human Resources — **PARTIAL / FUTURE**

- **Evidence:** `HR` app role exists in the seed; HR functional surface is live (`/leave-requests`, `/attendance`, `/payroll`, `SalaryStructure`, `PayrollRun`, `/careers`). **No seeded `HR` department** and no HR business-partner position.
- **Recommendation:** keep HR work under existing roles; create a department only when an HR owner is hired. **Recruiting/contracts/orders are modeled in code** (`backend/src/modules/hr/**`, contract models `JobRequisition`/`Candidate`/`Offer`/`Contract`/`SalesOrder`); the additive migration `20261123040000_hr_recruiting_contracts_orders` is **not applied live** and needs approval. Performance reviews, goals, training records, directory privacy and offboarding are also modeled and mounted at `/v1/hr/performance/*` from the additive `20261123060000_phase2_delivery_slices` migration (also local-only).

## 9. Finance — **FUTURE as a department; command surface is live**

- **Evidence:** Phase 7 Finance Hub screens (`/finance*`) and `finance.*` permissions exist; no seeded `FINANCE` department/finance-manager position. Provider tables exist but are empty in production.
- **Recommendation:** treat Finance as a function of ADMIN/SUPER_ADMIN until a finance owner is assigned.

---

### Departments to AVOID creating from assumptions

- **DevOps / Platform Engineering** — deploy scripts and Fly/Netlify infra exist, but no distinct team or seeded department.
- **QA / Test Engineering** — tests exist as files (backend Vitest, `e2e/` Playwright); no dedicated function.
- **Sales** — no `SALES` system-role enum value; sales pipeline is a workspace, not a seeded department (leads/opportunities/quotes live under CRM).
- **Cybersecurity** — see §7.

### Verified seed summary

| Department key | Name | Seeded positions |
|---|---|---|
| `SOFTWARE_ENGINEERING` | Software Engineering | 4 |
| `DESIGN_CREATIVE` | Design & Creative | 2 |
| `DATA_ANALYTICS` | Data & Analytics | 1 |
| `CONTENT_COMMS` | Content & Communications | 2 |
| `CLIENT_OPS` | Client Operations & Support | 2 |

Total: **5 departments / 11 positions** (`backend/prisma/seed-professional.ts`). Seniority levels: `Junior`, `Mid`, `Senior`, `Lead`. Five presets seeded (`PRESETS`): `developer`, `designer`, `content`, `coordinator`, `support`. See `ANGISOFT_POSITION_REQUIREMENTS.md` for per-position permission bundles.
