# AngiSoft Position Requirements

> **🔄 REGENERATE** — Rebuilt against live code on **2026-11-23**. Source of truth: `backend/prisma/seed-professional.ts:97-173` (**11 seeded positions**, 5 departments) plus `backend/src/modules/identity/services/permissionRegistry.ts` (213 keys at verification time).
>
> Retired assumptions from the previous version: `pages/StaffList.jsx` (deleted legacy SPA), `routes/services.ts` (now `modules/cms/routes/services.ts`), `prisma/schema.prisma` (now `src/prisma/contract.prisma`), and the old position names (`Technical Support Engineer` → **Support Specialist**, `Operations Administrator` → **Client Operations Coordinator**, `Customer Relations Officer` unseeded). Permission bundles below are the **actual seeded `defaultPermissionKeys`**, not suggestions.
> Rationale: `ANGISOFT_CURRENT_DEPARTMENTS.md`; canonical plan: `ANGISOFT_DIGITAL_HQ_PLAN.md` §7/§5.3.

---

## Seeded position catalogue (live registry)

Public profile type comes from `Position.displayTitleTemplate` + `Employee.publicTitle` + `departmentId`/`positionId`. **System role** (`SUPER_ADMIN`/`ADMIN`/`MARKETING`/`DEVELOPER`/`STAFF`/…) is separate and never published.

| # | Position (seed title) | Department | `displayTitleTemplate` | Seeded permission bundle (`defaultPermissionKeys`) | Required | Public profile title |
|---|---|---|---|---|---|---|
| 1 | Founder & Lead Software Developer | Software Engineering | `Founder & {seniority} Software Developer` | broad admin set: `profile.edit`, products/services/projects view+manage, publications view/manage/publish, bookings/enquiries/reviews/media view+manage, analytics.view, page_content view/manage, staff.view, `administration.settings/roles/audit`; system role `SUPER_ADMIN` supplies `*` | REQUIRED_NOW | "Founder & Lead Software Developer" |
| 2 | Flutter / Mobile Developer | Software Engineering | `{seniority} Flutter Developer` | `profile.edit`, `products.view_assigned`, `products.update_assigned`, `projects.view_assigned`, `projects.update_assigned`, `publications.update_own`, `media.upload` | REQUIRED_NOW | "{seniority} Flutter Developer" |
| 3 | Full-Stack Developer | Software Engineering | `{seniority} Full-Stack Developer` | `profile.edit`, `services.view`, `products.view_assigned`, `products.update_assigned`, `projects.view_assigned`, `projects.update_assigned`, `publications.update_own`, `media.upload` | REQUIRED_NOW | "{seniority} Full-Stack Developer" |
| 4 | Backend / Database Developer | Software Engineering | `{seniority} Backend Developer` | `profile.edit`, `services.view`, `projects.view_assigned`, `projects.update_assigned`, `publications.update_own` | USEFUL_NOW | "{seniority} Backend Developer" |
| 5 | UI/UX Designer | Design & Creative | `{seniority} UI/UX Designer` | `profile.edit`, `publications.update_own`, `media.upload`, `media.view` | REQUIRED_NOW | "{seniority} UI/UX Designer" |
| 6 | Graphic Designer | Design & Creative | `{seniority} Graphic Designer` | `profile.edit`, `publications.update_own`, `media.upload`, `media.view` | USEFUL_NOW | "{seniority} Graphic Designer" |
| 7 | Data Analyst | Data & Analytics | `{seniority} Data Analyst` | `profile.edit`, `publications.update_own`, `analytics.view`, `media.upload` | USEFUL_NOW | "{seniority} Data Analyst" |
| 8 | Content Contributor | Content & Communications | `Content Contributor` | `profile.edit`, `publications.view_own`, `publications.update_own`, `publications.view`, `media.upload` | USEFUL_NOW | "Content Contributor" |
| 9 | Content & Communications Officer | Content & Communications | `Content & Communications Officer` | `profile.edit`, `publications.view/manage/publish`, `media.upload/manage`, `page_content.view` | FUTURE (seeded, unassigned) | "Content & Communications Officer" |
| 10 | Support Specialist | Client Operations & Support | `Support Specialist` | `profile.edit`, `bookings.view_assigned`, `bookings.update_assigned`, `bookings.message_customer`, `enquiries.view_assigned`, `enquiries.respond`, `enquiries.close` | REQUIRED_NOW | "Support Specialist" |
| 11 | Client Operations Coordinator | Client Operations & Support | `Client Operations Coordinator` | `profile.edit`, `bookings.view`, `bookings.update_assigned`, `bookings.message_customer`, `enquiries.view`, `enquiries.manage`, `enquiries.respond` | USEFUL_NOW | "Operations Coordinator" |

Seniority levels (all positions): `Junior`, `Mid`, `Senior`, `Lead`.

## Permission presets (seeded `PermissionPreset` rows)

| Preset | Name | Starter keys |
|---|---|---|
| `developer` | Developer | `profile.edit`, `products.view_assigned/update_assigned`, `projects.view_assigned/update_assigned`, `services.view`, `publications.update_own`, `media.upload` |
| `designer` | Designer | design/media-oriented bundle (`seed-professional.ts:182`) |
| `content` | Content | publication-oriented bundle (`seed-professional.ts:188`) |
| `coordinator` | Coordinator | booking/enquiry coordination bundle (`seed-professional.ts:194`) |
| `support` | Support | support/enquiry bundle (`seed-professional.ts:200`) |

**Precedence note:** `Position.defaultPermissionKeys` is the **PRESET** source (precedence 20) in `effectivePermissions.ts`. `PermissionPreset` rows are seeded as reusable templates written through the admin UI as GRANT rows; the resolver does **not** read the `PermissionPreset` table directly. Applying a preset writes `EmployeePermission` GRANT rows (precedence 40), which is why the two mechanisms are additive and an explicit DENY still wins.

## Roles are separate from positions

App roles seeded by `backend/prisma/seed.ts:134-141`: `SUPER_ADMIN`, `ADMIN`, `MARKETING`, `CONTENT_CREATOR`, `BLOG_MANAGER`, `HR`, `DEVELOPER`, `STAFF` (with `ROLE_DEFAULT_PERMISSIONS` bundles). A position is a **job title/preset**; a role is a **system access tier**. `requireAccess()` checks the canonical permission first, then the fallback role — with explicit DENY checked first.

## Caveats / open issues

1. **Manual key map drift — CLOSED.** `backend/prisma/seed-professional.ts:14,17-34` imports `PERMISSIONS` from the canonical registry and derives `K` at compile time via mapped types plus `Object.fromEntries`; renamed keys need no seed edit. **No code gap remains** (the live seed itself is still approval-gated, see item 2).
2. **Permission seed not applied in production** — the live `Permission` table has 16 legacy keys vs 213 in code (main-session Neon MCP check, 2026-11-23). Until `npx prisma db seed` runs, position bundles that reference canonical keys resolve only through aliases or not at all. **Open production blocker.**
3. **Unseeded roles from the old architecture** — Sales Engineer, DevOps Engineer, Cybersecurity Specialist, HR Business Partner, Recruiter, Payroll Administrator, Learning & Development, Finance Manager, Accountant, Legal Counsel, Office Manager remain future/deferred (plan §7). No Sales Executive: there is no `SALES` system role.
4. **Position assignments are data, not code** — this table describes the seed; the live assignment of employees to positions is in `Employee.positionId` and can change without a code deploy.
