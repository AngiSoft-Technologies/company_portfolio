# 📌 QUICK REFERENCE — AngiSoft Platform

> **🛠 OPERATIONAL** — Current monorepo URLs, routes, and common tasks.
> Canonical plan: `ANGISOFT_DIGITAL_HQ_PLAN.md`. Repo conventions: `AGENTS.md`.

## 🔗 URLs

### Development (Local)
```
Web (public site + client portal):  http://localhost:5173
Admin (staff/ERP app):              http://localhost:5174
Admin login:                        http://localhost:5174/login
Backend API:                        http://localhost:5000/api
```

### Production
```
Web:        https://angisoft.co.ke
Admin:      https://admin.angisoft.co.ke
API:        https://api.angisoft.co.ke/api   (Netlify proxies /api/* same-origin)
CDN uploads: https://cdn.angisoft.co.ke       (Tigris bucket)
```

## 🧭 Admin app routes (`frontend/admin`, all lazy-loaded)

| Area | Routes |
|---|---|
| Dashboard | `/`, `/dashboard`, `/workspace`, `/staff-dashboard`, `/reports`, `/audit-log` |
| CRM / Sales | `/contacts`, `/opportunities` (leads + pipeline), `/quotes`, `/invoices`, `/renewals`, `/support-tickets` |
| Bookings / Projects | `/bookings`, `/projects`, `/client-projects` |
| Content | `/blogs`, `/services`, `/service-categories`, `/products`, `/pricing`, `/pricing-packages`, `/offices`, `/industries`, `/solutions`, `/sections`, `/about`, `/company-stats`, `/careers`, `/announcements`, `/faqs`, `/testimonials`, `/newsletters`, `/surveys`, `/product-inquiries` |
| Portfolio | `/workspace/portfolio-studio`, `/portfolio-approvals`, `/staff`, `/staff-access` |
| Finance | `/payments`, `/expenses`, `/payroll` |
| HR | `/staff`, `/attendance`, `/leave-requests`, `/payroll`, `/approvals` |
| System | `/settings`, `/settings/roles`, `/system`, `/ai`, `/ai-assist`, `/chat`, `/uploads` |

Legacy `/admin/*` paths redirect to the root equivalents.

## 🎯 Common tasks

### Publish a blog post
1. Admin → `/blogs` → New → fill title/slug/content → publish.

### Create a pricing package
1. Admin → `/pricing-packages` → New (name, slug, price, features) → publish.
   Public `/pricing` picks it up automatically.

### Add an office/location
1. Admin → `/offices` → New (name, address, hours lines `Mon-Fri: 08:00-17:00`) → publish.
   Public `/contact` renders it.

### Run payroll for a period
1. `/payroll` → add Salary Structures (basic + allowances/deductions).
2. "Generate payslips" with period (+ optional statutory).
3. Approve → "Pay out" (PayHero mobile money) or "Mark paid" manually.
4. "Send" emails the itemized payslip.

### Record attendance
- Staff self check-in/out; admin `/attendance` for records, holidays,
  weekly schedules, CSV/JSON import, and "Derive" (auto holiday/absent).

### Approvals
- `/approvals` — multi-step chains; each step gated by its own permission;
  "waiting on me" queue; self-decision blocked.

## 🧪 Verify

```bash
pnpm typecheck && pnpm lint && pnpm test        # backend vitest via turbo
cd backend && npx vitest run test/payroll.spec.ts   # single spec
pnpm perf:budget                               # bundle budgets
pnpm test:e2e                                  # Playwright (no backend needed)
```

Backend deploy: `fly deploy -a company-portfolio --local-only`.
Migrations: `pnpm prisma:migrate` artifacts under `backend/migrations/app/`;
production applies via Neon MCP + `refs/db.json` advance (see `BACKUP_RESTORE.md` / plan §11).
