# KEELCODE.md

Guidance for AI coding agents working in this repository.

## Project overview

AngiSoft Technologies — full-stack monorepo (no root `package.json`):

- `frontend/` — React 19 + Vite 7 public site and admin CMS (Tailwind 4, MUI, Redux Toolkit). Deployed to Netlify.
- `backend/` — Express 4 + TypeScript API, Prisma 7 ORM on Neon PostgreSQL. Deployed to Railway (root `Dockerfile`).
- `backend/prisma/` — schema, migrations, seed (`prisma.config.ts` normalizes `DATABASE_URL`).
- `docs/` — `ARCHITECTURE.md` (production architecture, booking/payment flows), `TESTING_GUIDE.md` (manual E2E scenarios).

Public pages must be data-driven from `/api/*`; the admin CMS owns content (services, projects, blog, staff, testimonials, settings, FAQs, chatbot).

## Commands

Run from the package directory — there is no monorepo root.

### Backend (`backend/`)

```bash
cp .env.example .env        # fill DATABASE_URL + secrets
npm install
npx prisma generate
npm run prisma:migrate:dev  # create tables
npm run prisma:seed
npm run dev                 # API at http://localhost:5000 (ts-node-dev)
npm run build               # tsc → dist/
npm run start               # node dist/index.js
npm run start:prod          # migrate deploy + seed + start
npm test                    # vitest
npm test -- auth.spec.ts    # single file
npm test -- -t "pattern"    # by name
npx prisma studio
```

Requires Node >= 22.

### Frontend (`frontend/`)

```bash
npm install
npm run dev      # Vite at http://localhost:5173, proxies /api + /uploads → :5000
npm run build
npm run lint     # ESLint
npm test         # vitest (jsdom)
npm run preview
```

Dev proxy reads `VITE_API_BASE_URL` (default `http://localhost:5000`). Vite alias `@` → `./src`. Dev watcher uses polling (`usePolling: true`).

## Backend architecture

- `backend/src/app.ts` — Express app: security middleware (helmet, CORS, body limits, cookies, sanitization) → routers under `/api` → `/health` → not-found/error handlers.
- `backend/src/index.ts` — bootstrap: validates DB connection, starts workers, graceful shutdown.
- `backend/src/db.ts` — singleton Prisma client with Neon adapter. Never create per-request clients.
- `backend/src/routes/` — 40+ route modules (lowercase-hyphenated filenames, camelCase exports). Many export factories receiving the shared Prisma client, e.g. `bookingsRouter(prisma)`.
- `backend/middleware/auth.js`, `backend/logger.js` — legacy files outside `src/`, copied by the Dockerfile.
- Auth: JWT access tokens + refresh-token cookies, `requireAuth` middleware, role checks on `req.user.role`. Roles: `ADMIN`, `MARKETING`, `DEVELOPER`. Restrict publish/delete/security actions to `ADMIN`.
- Background work: `backend/src/workers/` and `backend/src/queue/` (BullMQ/ioredis; email, file processing, reconciliation).
- Payments/webhooks: verify provider signatures (Stripe) and update `Payment`/`Booking` state idempotently.
- Booking status is a state machine from `SUBMITTED` through review/payment/delivery/completion.

## Frontend architecture

- `frontend/src/main.jsx` — React root wrapped in `ErrorBoundary`, `ThemeProvider`, `ToastContainer`.
- `frontend/src/routes.jsx` — public routes under main layout (`/`, `/services`, `/projects`, `/blog`, `/book`, …); admin under `/admin` (`/admin/login` separate).
- Admin CMS screens: `frontend/src/admin/` and `frontend/src/admin/crud/`.
- Shared UI: `frontend/src/components/` (+ `modern/`, inputs, cards, charts).
- Branding/CMS flow: `SiteSettingsAdmin.jsx` persists via `/api/site/branding` (`site_branding` Setting key).
- Never hardcode business content in components — fetch CMS-managed data.

## Testing

- Backend: Vitest + Supertest in `backend/test/` (`*.spec.ts`). `auth.spec.ts` mocks `backend/src/db`; `integration.spec.ts` uses a real Prisma client and resets data — point it at a test database, never production.
- Frontend: Vitest/jsdom, config inline in `frontend/vite.config.js`, setup file `frontend/setupTests.js`. Tests live near sources as `*.test.jsx` / `*.spec.jsx`.

## Conventions

- Frontend: 2-space indent, semicolons, `PascalCase` components, `useX` hooks. ESLint allows unused vars matching `^[A-Z_]`.
- Backend: route files lowercase-hyphenated (`staff-dashboard.ts`), exports camelCase.
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:` with optional scopes).
- Validation/sanitization centralized in middleware; keep public forms and auth routes rate-limited.

## Deployment

- Railway: root `Dockerfile` (backend context) — `npm ci --include=dev`, `prisma generate`, `tsc`, `npm run start:prod`.
- Netlify: builds `frontend/`, proxies `/uploads/*` to `api.angisoft.co.ke` before the SPA catch-all (see `netlify.toml`).
- Prisma 7: `npx prisma generate` uses a placeholder URL when `DATABASE_URL` is unset; `prisma.config.ts` strips quotes from Railway-injected values.

## Reference docs

- `AGENTS.md` — repo guidelines summary.
- `CLAUDE.md` — continuation priorities (current branding tasks), deeper architecture notes.
- `CONTRIBUTING.md` — setup and PR guidelines.
- `docs/ARCHITECTURE.md`, `docs/TESTING_GUIDE.md`.
- `.github/copilot-instructions.md` — project-specific patterns and pitfalls.
