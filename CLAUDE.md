# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

AngiSoft Technologies is a full-stack monorepo with:

- `frontend/`: React 19 + Vite public website and admin CMS UI.
- `backend/`: Express + TypeScript API backed by Prisma/PostgreSQL.
- `backend/prisma/`: Prisma schema and migrations for the core domain model.
- `docs/`: Architecture and testing guidance.

Public pages are intended to be data-driven through `/api/*`; the admin CMS is the source of truth for public content such as services, projects, blog posts, staff, testimonials, settings, FAQs, and chatbot content.

## Current continuation priorities

> The master plan lives in `docs/ROADMAP.md` (phases: 1 object storage, 2 payments,
> 3 platform architecture/realtime/scale, 4 UI revamp). Execution is env-gated
> (missing keys → fail closed, never break existing flows) and idempotent.

- **Phase 1 (code complete; needs Tigris keys)** - Tigris/S3 object storage for uploads: `backend/src/services/storage/s3.ts`
  is the single S3 client (`isS3Enabled`, `uploadObject`, `getObject`, `toPublicUrl`); `routes/uploads.ts`
  writes to bucket when S3 is configured, else local disk. See ROADMAP Phase 1 for env vars.
- **Phase 2 (code complete; needs provider keys)** - Payment gateway: Paystack + PayHero (M-Pesa & Kenyan banks via STK) + Stripe,
  unified in `backend/src/services/payments/` with signature/reference-verified webhooks. Add live keys + verify E2E on Fly.io (live keys needed in `.env`).
- **Phase 3 (realtime + replicas + queue + cache + MCP done)** - Realtime:
  `services/realtime/index.ts` (Socket.IO on the same server; JWT handshake auth; rooms `user:<id>`,
  `staff`, `booking:<id>`; secure anonymous `booking:join` via publicReference + trackingToken). Fan-out
  originates in `services/bookingEvents.ts` (`booking:event`), `services/notifications.ts`
  (`notification:new`), and `services/payments/index.ts` (`payment:status`). Read replicas: `db.ts` uses
  `@prisma/extension-read-replicas` when `DATABASE_URL_REPLICA` is set (prod-only; reads→replica,
  writes→primary). `/health/readyz` = deep probe (DB + optional Redis ping + workers). Redis-gated
  queue: `queue/index.ts` = BullMQ when `REDIS_URL`, draining in-memory fallback otherwise (processor
  lookup by queue name — the old `'send'` job-name bug is fixed); add/worker/`getWorkers`/`closeWorkers`
  (wired into graceful shutdown). Redis-gated public JSON cache: `middleware/cache.ts` +
  `services/cache.ts` (allow-listed public GET routes, `s-maxage` headers for CDN, `purgeCache`,
  env `CACHE_ENABLED`/`PUBLIC_CACHE_TTL`). MCP read-only: `mcp/tools.ts` + `mcp/index.ts` (stdio via
  `npm run mcp:stdio`, HTTP on `/mcp` behind `MCP_HTTP_ENABLED`). gRPC deliberately doc-only. Remaining:
  CDN rollout (needs S3 layer live — Phase 1 keys), admin-write cache purge wiring if TTL too slow.
- **Phase 4 (asset + palette sweep done)** - all runtime assets route through `resolveAssetUrl`
  (frontend `/uploads/public` literals converted so `ASSET_BASE_URL` CDN is drop-in). Brand palette
  aligned: `constants.js` `BRAND_COLORS`, `ThemeContext`, `index.css` @theme, and 24 components swept to
  official hexes (`#0875FF`/`#00AFFF`/`#27D94B`/`#07142B`); per-product gradient identity hues kept.
  Realtime in UI: `hooks/useRealtime.js` + `BookingProgress.jsx` auto-refresh. Remaining: skeletons,
  admin notification badges via `notification:new`, favicon/logo surfaces (see below).
- Branding first - update the site to use the new favicon/logo assets before redesigning colors or layouts.
- New public assets - use `frontend/public/favicon*.png`, `frontend/public/favicon.ico`, `frontend/public/site.webmanifest`, and `frontend/public/images/Logos/`.
- Legacy asset paths - current git status shows deleted old assets: `/favicon.svg`, `/images/angisoft_logo.png`, and `/images/Logo - AngiSoft Technologies.*`; avoid depending on them.
- HTML metadata - `frontend/index.html` still references `/favicon.svg` and `/images/angisoft_logo.png`; update favicon, manifest, theme-color, and OG image with the new brand assets.
- Frontend logo surfaces - check `frontend/src/components/sections/Header.jsx`, `Hero.jsx`, and `Footer.jsx` for hardcoded initials/old image paths before page redesign work.
- Brand color sources - `frontend/src/contexts/ThemeContext.jsx`, `frontend/src/index.css`, and
  `frontend/src/utils/constants.js` are now aligned to the new logo palette (blue `#0875FF`, cyan
  `#00AFFF`, green `#27D94B`, navy `#07142B`); use those exact hexes in any new UI, don't reintroduce
  the old `#0A3DFF`/`#00C2FF`/`#39FF6A` values.
- CMS branding flow - admin branding settings live in `frontend/src/admin/crud/SiteSettingsAdmin.jsx` and persist through `/api/site/branding` (`site_branding` Setting key).

## Common commands

Run commands from the package directory shown; there is no root `package.json`.

### Backend (`backend/`)

```bash
npm install
npx prisma generate
npm run prisma:migrate:dev
npm run dev                 # API on http://localhost:5000
npm run build               # TypeScript compile to dist/
npm run start               # Run compiled dist/index.js
npm test                    # Run all backend Vitest tests
npm test -- auth.spec.ts    # Run one backend test file
npm test -- -t "auth flows" # Run tests matching a name pattern
npx prisma studio           # Inspect local database
```

Useful Prisma scripts:

```bash
npm run prisma:generate
npm run prisma:migrate      # deploy migrations
npm run prisma:seed
```

### Frontend (`frontend/`)

```bash
npm install
npm run dev                 # Vite on http://localhost:5173, proxies /api
npm run build               # Production build to dist/
npm run lint                # ESLint
npm test                    # Run frontend Vitest tests
npm test -- path/to/file.test.jsx
npm run preview             # Preview built frontend
```

The Vite dev proxy reads `VITE_API_BASE_URL` and defaults to `http://localhost:5000`; requests to `/api` are proxied to the backend.

## Backend architecture

`backend/src/app.ts` builds the Express app. It applies security and request middleware first (`helmet`, CORS, JSON/urlencoded limits, cookies, sanitization), mounts all API routers under `/api`, exposes `/health`, then installs not-found and error handlers last.

`backend/src/index.ts` is the runtime bootstrap. It validates the database connection before listening, starts background workers, and handles graceful shutdown.

Important backend patterns:

- Route modules live in `backend/src/routes/`. Many export factory functions that receive the shared Prisma client, e.g. `bookingsRouter(prisma)` or `adminRouter(prisma)`.
- The shared Prisma client comes from `backend/src/db`; do not create a new Prisma client per request.
- Authentication uses `/api/auth`, JWT access tokens, refresh-token cookies, and `requireAuth` middleware. Role-sensitive actions should check `req.user.role` and keep publish/delete/security-sensitive actions restricted to `ADMIN`.
- Validation and sanitization are centralized in middleware; public forms and auth routes should remain rate-limited.
- Background work is organized under `backend/src/workers/` and queue helpers under `backend/src/queue/` for email, file processing, and reconciliation flows.
- Payment/webhook code must verify provider signatures and handle updates idempotently before changing `Payment` or `Booking` state.

The Prisma schema models employees, clients, bookings, payments, files, services, service categories, projects, blog posts, settings, testimonials, staff notes, refresh tokens, audit logs, newsletter subscribers, FAQs, and chatbot conversations. Booking status is a state machine from `SUBMITTED` through review/payment/delivery/completion states.

## Frontend architecture

`frontend/src/main.jsx` creates the React root and wraps the app with `ErrorBoundary`, `ThemeProvider`, and `ToastContainer`.

`frontend/src/routes.jsx` defines the main routing split:

- Public site routes are nested under the main app layout (`/`, `/services`, `/service/:slug`, `/projects`, `/project/:id`, `/staff`, `/blog`, `/book`, `/booking/:id`, newsletter routes, etc.).
- Admin routes live under `/admin`, with `/admin/login` separate from the protected admin layout.

Frontend conventions and integration points:

- API calls generally target `/api` through the Vite proxy or an `API_BASE_URL` helper.
- Public content components should fetch CMS-managed data instead of hardcoding business content.
- Admin CMS screens live under `frontend/src/admin/` and `frontend/src/admin/crud/`.
- Reusable UI is split between `frontend/src/components/`, `frontend/src/components/modern/`, inputs, cards, charts, and shared utilities.
- Vite aliases `@` to `./src`.
- Vitest uses jsdom with setup file `frontend/setupTests.js` as configured in `frontend/vite.config.js`.

## Testing notes

Backend tests use Vitest + Supertest in `backend/test/`:

- `auth.spec.ts` mocks `backend/src/db` for auth smoke tests.
- `integration.spec.ts` uses a real Prisma client and resets booking/client/payment or employee/token data in setup.

Before running integration tests, make sure the backend environment points to an appropriate test database. Avoid running destructive test setup against production data.

Frontend tests use Vitest/jsdom. Place tests near frontend source files with `*.test.jsx` or `*.spec.jsx` naming.

Manual public/admin scenarios are documented in `docs/TESTING_GUIDE.md`.

## Content and domain constraints

Core service areas include custom software, data analysis, cyber/document services, advertising, and future internet/entertainment services. Keep public content editable through admin-managed models where possible.

Relevant content fields:

- Services: title, category/categoryId, description, pricing/scope, publication status.
- Projects: title, slug, tags/tech stack, summary/description, publication status.
- Blog posts: title, slug, author, tags, publication status/date.
- Staff profiles: role, bio, skills/profile fields.
- Testimonials: name, role/company, rating, quote/text, confirmation/publication state.

## Reference docs

- `docs/ARCHITECTURE.md`: production architecture, core booking/payment sequences, deployment recommendations.
- `docs/TESTING_GUIDE.md`: manual end-to-end testing scenarios.
- `.github/copilot-instructions.md`: detailed project-specific patterns and pitfalls that may be useful when deeper context is needed.
