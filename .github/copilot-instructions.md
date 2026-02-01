# Copilot Instructions for AngiSoft Technologies

## Architecture Overview

**Full-stack monorepo**: Frontend (React + Vite) and Backend (Node.js + Express + TypeScript + Prisma ORM on Postgres).

**Key principle**: All content is CMS-managed via admin backend—no hardcoded static content. Clients submit bookings with files; admins review and process payments via Stripe/PayPal/M-Pesa webhooks.

**Data model**: 
- **Employees** (invited via email token) → role-based access (ADMIN/MARKETING/DEVELOPER)
- **Clients** → Bookings (state machine: SUBMITTED → UNDER_REVIEW → ACCEPTED → TERMS_ACCEPTED → DEPOSIT_PAID → IN_PROGRESS → DELIVERED → COMPLETED)
- **Payments** → multiple providers; webhook reconciliation required
- **Files** → stored in R2/S3; metadata in Postgres
- **Services, Projects, BlogPosts, Settings** → admin-managed content

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for sequence diagrams and deployment recommendations.

## Backend Patterns & Conventions

### File Structure
- **Routes** → entry points; parse/validate request; call controllers
- **Controllers** → business logic; use CRUD helper utility
- **Middleware** → auth (JWT), validation (Zod), sanitization, rate limiting
- **Utils** → CRUD helper (`createCrudRouter`), token generation, password policy
- **Services** → cross-cutting (email, payments, monitoring, audit)
- **Workers** → async jobs via BullMQ (email, file processing, Stripe reconciliation)

### Authentication & Authorization
- **Token flow**: `POST /api/auth/login` → access token (short-lived) + refresh token (httpOnly cookie)
- **Auth middleware** ([src/middleware/auth.ts](src/middleware/auth.ts)): Extract Bearer token, verify JWT via `verifyAccessToken()`, populate `req.user` with `{sub, role}`
- **Protected endpoints**: Use `requireAuth` middleware; check `req.user.role` for RBAC
- **Token utils** ([src/utils/token.ts](src/utils/token.ts)): `generateAccessToken()`, `verifyAccessToken()`, `generateRefreshToken()`
- **Password policy** ([src/utils/passwordPolicy.ts](src/utils/passwordPolicy.ts)): Uses zxcvbn for strength validation

### Validation & Sanitization
- **Zod schemas** ([src/middleware/validation.ts](src/middleware/validation.ts)): Define schemas inline in routes or import from shared files
- **Sanitization**: `sanitizeMiddleware` strips XSS/script tags automatically; use `sanitizeInput()` for nested fields
- **Rate limiting** ([src/middleware/rateLimiter.ts](src/middleware/rateLimiter.ts)): `authRateLimiter` on `/api/auth` routes; public forms (bookings) should also be rate-limited

### Database & Prisma
- **Schema** ([backend/prisma/schema.prisma](backend/prisma/schema.prisma)): UUID primary keys; enums for status/role/type; cascading deletes where appropriate
- **Client usage**: Always import from `@prisma/client`; pass `prisma` instance via route factory function parameter (e.g., `export default function bookingsRouter(prisma: PrismaClient)`)
- **Migrations**: Run `npm run prisma:migrate:dev --name <name>` locally; CI uses `npx prisma migrate deploy` (idempotent)
- **Upserts**: Use `findUnique()` before `create()` if need atomicity; for clients, use `client.upsert()` on email

### Error Handling
- **Error handler middleware** ([src/middleware/errorHandler.ts](src/middleware/errorHandler.ts)): Catches unhandled exceptions; returns structured JSON
- **Pattern**: Use try-catch in route handlers; return appropriate status codes (400 validation, 401 auth, 404 not found, 500 server error)
- **Sentry integration**: Automatic via `initSentry()` in [src/app.ts](src/app.ts); tag errors with context

### Background Jobs
- **BullMQ + Redis** ([src/queue/index.ts](src/queue/index.ts)): `getQueue(name)` returns Queue; `createWorker(name, processor)` starts worker
- **Processors** ([src/workers/](src/workers/)): emailWorker, fileProcessor, reconciliationWorker
- **Pattern**: Enqueue job in route handler (e.g., when booking submitted, add email job); worker processes asynchronously
- **Example**: `await getQueue('email').add('send', {to, subject, html})`

### Payment Flows
- **Stripe integration** ([src/routes/bookings.ts](src/routes/bookings.ts)): Create PaymentIntent on booking creation if deposit required; store in DB as PENDING
- **Webhook handling** ([src/routes/payments.ts](src/routes/payments.ts)): Verify webhook signature; update Payment status and Booking.depositPaidAt; send receipt email
- **M-Pesa & PayPal**: Placeholder structures in schema; implement similar webhook patterns
- **Reconciliation**: Nightly job ([src/scripts/reconcile-stripe.js](src/scripts/reconcile-stripe.js)) checks Stripe for discrepancies

### File Uploads
- **Multer** ([src/routes/bookings.ts](src/routes/bookings.ts)): `upload.array('files', 5)` for multipart form data
- **Validation** ([src/middleware/fileValidation.ts](src/middleware/fileValidation.ts)): Check MIME types, size limits (10MB total)
- **Storage**: Files saved to `uploads/` folder locally; in production, upload to Cloudflare R2 or S3 via worker
- **DB metadata**: Create `File` record with ownerType, ownerId, URL for retrieval

## Frontend Patterns & Conventions

### Tech Stack
- **React** + **Vite** + **Tailwind CSS** + **Redux Toolkit** (state management)
- **Material-UI (MUI)** for form components and admin dashboards
- **Axios** for API calls; interceptors handle auth token refresh
- **React Router** (v6+) for navigation

### Component Structure
- **Pages**: User-facing views (public site, booking form, client dashboard)
- **Admin**: Separate layout and protected routes; uses MUI DataGrid for tables
- **Contexts**: Redux slices for state (auth, bookings, settings)
- **Utils**: Helpers for API calls, validation, formatting

### Key Workflows
1. **Public booking**: Fill form → upload files → submit → admin review → payment link
2. **Admin login**: Password login → 2FA challenge → dashboard access
3. **Staff dashboard**: Calendar view (FullCalendar) of bookings; drill-down to booking details

### CORS & API Integration
- **Base URL**: Set in `.env` or axios config; defaults to backend at `/api`
- **Auth header**: Axios interceptor adds `Authorization: Bearer <token>`
- **Cookie refresh**: Refresh token stored in httpOnly cookie; refresh endpoint auto-called on 401

## Admin Workflows & Staff Management

### Booking Review & Assignment
- **Endpoints** ([../../backend/src/routes/admin.ts](../../backend/src/routes/admin.ts)): `GET /api/admin/bookings` (list with filters), `PUT /api/admin/bookings/:id/review` (accept/reject), `PUT /api/admin/bookings/:id/assign` (assign staff)
- **State transitions**: SUBMITTED → UNDER_REVIEW (upon manual review) → ACCEPTED/REJECTED; accepted bookings send payment link to client
- **Assignment**: Staff (DEVELOPER/MARKETING role) can be assigned to bookings; triggers audit log for accountability
- **Booking details**: Includes full client info, file metadata, payment status, notes, and assignee

### Staff Management & Invitations
- **Invite flow** ([../../backend/src/routes/invite.ts](../../backend/src/routes/invite.ts)): Admin sends email invite with token; employee accepts via link, sets password (validated by zxcvbn strength checker)
- **Roles**: ADMIN (full access), MARKETING (bookings + content management), DEVELOPER (bookings + technical services)
- **Profile routes** ([../../backend/src/routes/staff-dashboard.ts](../../backend/src/routes/staff-dashboard.ts)): Staff can update profile (name, bio, avatar), change password (requires current password verification)
- **Two-factor auth**: Optional for staff; uses TOTP + backup codes stored in DB

### Content Management (CMS)
- **Services, Projects, BlogPosts**: Managed via admin endpoints; `published` flag controls visibility on public site
- **Settings & Site content**: Key-value store accessed by frontend; cached in Redux state
- **Audit logging** ([../../backend/src/services/audit.ts](../../backend/src/services/audit.ts)): All admin actions (create, update, delete, role change) logged with actor ID, timestamp, and metadata for compliance

### Dashboard Statistics
- **Admin dashboard** (`GET /api/admin/dashboard/stats`): Total bookings, pending count, service/project/staff/client counts, recent bookings feed
- **Real-time filters**: Bookings can be filtered by status (SUBMITTED, UNDER_REVIEW, etc.) and paginated (default 20 per page)

## Development Workflow

### Setup
```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Testing
- **Backend**: `npm test` (Vitest); integration tests in [../../backend/src/test/](../../backend/src/test/)
- **Frontend**: `npm test` in frontend/
- **Pre-commit**: Lint must pass (`npm run lint` in both packages)

### Debugging
- **Backend**: Set breakpoints in VS Code; run `npm run dev` and use debugger
- **Logs**: Winston logger ([../../backend/src/index.ts](../../backend/src/index.ts)) outputs to console and `backend/logs/`; Sentry captures errors
- **Database**: Use `npx prisma studio` to inspect data graphically

## Project-Specific Patterns

1. **CRUD helper** ([../../backend/src/utils/crud.ts](../../backend/src/utils/crud.ts)): Avoids boilerplate for simple resources; define schema, controller, and route factory
2. **Two-factor auth** ([../../backend/src/services/twofactor.ts](../../backend/src/services/twofactor.ts)): TOTP + backup codes for employees; optional for clients
3. **Email service** ([../../backend/src/services/email.ts](../../backend/src/services/email.ts)): Uses SendGrid or Nodemailer; templates are HTML strings
4. **Audit logging** ([../../backend/src/services/audit.ts](../../backend/src/services/audit.ts)): Log sensitive actions (login, payment, role change) for compliance
5. **Environment isolation**: `.env.example` lists all required variables; tests use separate `DATABASE_URL_TEST` if needed

## Key Files to Reference

- Architecture & planning: [../../docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- Auth patterns: [../../backend/src/middleware/auth.ts](../../backend/src/middleware/auth.ts), [../../backend/src/utils/token.ts](../../backend/src/utils/token.ts)
- Booking flow: [../../backend/src/routes/bookings.ts](../../backend/src/routes/bookings.ts)
- Admin routes: [../../backend/src/routes/admin.ts](../../backend/src/routes/admin.ts)
- Prisma schema: [../../backend/prisma/schema.prisma](../../backend/prisma/schema.prisma)
- Example controller: [../../backend/src/controllers/](../../backend/src/controllers/)
- App bootstrap: [../../backend/src/app.ts](../../backend/src/app.ts)

## Common Pitfalls to Avoid

1. **Prisma client**: Always pass `prisma` instance to route factories; don't create new clients per request
2. **Auth middleware**: Verify both token validity and user existence in DB before processing requests
3. **File uploads**: Always validate MIME type and size; sanitize filenames before storage
4. **Webhook verification**: Never trust webhook data without cryptographic signature verification
5. **N+1 queries**: Use Prisma `select` and `include` to fetch related data in one query
6. **Secrets in code**: All API keys, DB URLs, Stripe secrets must be environment variables only
7. **CORS**: Check `CORS_ORIGIN` env var; default allows production domain only
8. **Rate limiting**: Apply to auth endpoints and public forms; customize delays for sensitive ops

## Troubleshooting Guide

### Database & Migrations
- **Migration stuck**: Kill `npm run dev` process and run `npx prisma migrate reset --force` to clear DB in dev; in CI, use `prisma migrate deploy` (idempotent)
- **Prisma cache issues**: Delete `.prisma/` folder and run `npx prisma generate` again
- **Duplicate unique key error (P2002)**: Check if record exists before insert; use `upsert` for email-based client lookups
- **Record not found (P2025)**: Verify related records exist before FK operations; wrap in try-catch and return 404

### Authentication & Tokens
- **401 Unauthorized on protected routes**: Verify `Authorization: Bearer <token>` header present; check token expiry with `verifyAccessToken()` utility
- **Refresh token not working**: Check `REDIS_URL` configured; refresh tokens stored as httpOnly cookies at `path: /api/auth`
- **2FA setup fails**: Ensure `otplib` installed; verify TOTP secret stored in `employee.twoFactorSecret`
- **Password validation too strict**: Adjust zxcvbn score threshold in [../../backend/src/utils/passwordPolicy.ts](../../backend/src/utils/passwordPolicy.ts)

### File Uploads
- **413 Payload too large**: Check `express.json({ limit: '10mb' })` in [../../backend/src/app.ts](../../backend/src/app.ts); verify file size < 10MB per file
- **File not saved**: Verify `uploads/` directory writable; check Multer destination path and that files were parsed from multipart form data
- **MIME type rejected**: Validate against whitelist in [../../backend/src/middleware/fileValidation.ts](../../backend/src/middleware/fileValidation.ts); common mimes: `application/pdf`, `image/*`, `text/plain`

### Email Delivery
- **Email not sent**: Check `SENDGRID_API_KEY` or `SMTP_*` env vars in [../../backend/src/services/email.ts](../../backend/src/services/email.ts); verify `EMAIL_FROM` domain whitelisted
- **Email queue stuck**: Inspect Redis with `redis-cli KEYS 'bullmq:emails*'`; restart worker via `npm run dev` or manually flush queue
- **Template issues**: Email templates are HTML strings; test with sample HTML before sending

### Payments & Webhooks
- **Stripe webhook signature invalid**: Verify `STRIPE_WEBHOOK_SECRET` matches endpoint in Stripe dashboard; check request body not parsed as JSON before verification
- **Payment status not updating**: Ensure webhook processor calls `await prisma.payment.update()` and `await prisma.booking.update({ depositPaidAt })`; check webhook logs in Sentry
- **M-Pesa integration error**: Refer to [../../backend/src/routes/payments.ts](../../backend/src/routes/payments.ts) placeholder; implement similar signature verification and idempotent webhook handling

### Performance Issues
- **N+1 queries**: Add `.include({ relation: true })` or `.select()` to Prisma queries; check [../../backend/src/routes/admin.ts](../../backend/src/routes/admin.ts) for example multi-field includes
- **Slow dashboard load**: Dashboard stats query runs 7 parallel Promise.all calls; add indexes on `status`, `published`, `acceptedAt` in Postgres
- **Memory leak in queue workers**: Ensure workers terminate gracefully; check for unclosed database connections or dangling event listeners

### CORS & API Errors
- **CORS error in browser**: Verify frontend origin in `CORS_ORIGIN` env var or `defaultOrigins` array in [../../backend/src/app.ts](../../backend/src/app.ts); credentials must be `true` for cookies
- **Options preflight fails**: Ensure CORS middleware runs before route handlers; check `helmet` CSP doesn't block origin
- **Rate limit 429**: Wait 1 minute (auth endpoints) or clear Redis queue; configurable in [../../backend/src/middleware/rateLimiter.ts](../../backend/src/middleware/rateLimiter.ts)

### Logging & Monitoring
- **No error traces in production**: Verify Sentry DSN in `.env`; check `initSentry()` called in [../../backend/src/app.ts](../../backend/src/app.ts) before route setup
- **Logs not written to file**: Winston logs to `backend/logs/` if configured; verify directory writable and log level set in logger config
- **Audit logs missing**: Ensure `logAudit()` called for sensitive actions; check database has `AuditLog` table after migrations

## Deployment Notes

- **CI/CD**: GitHub Actions runs lint, test, `prisma generate`, migrations on push
- **Production secrets**: Use platform secret management (Render, Fly, etc.); never commit `.env`
- **Database**: Use managed Postgres (Supabase, Neon) with automated backups
- **File storage**: Cloudflare R2 (recommended) or AWS S3 with CDN (CloudFront)
- **Frontend hosting**: Cloudflare Pages or Netlify with auto-deploy from main branch
- **Email service**: Configure SendGrid or Postmark API key in production environment
- **Monitoring**: Sentry captures backend errors; set up Datadog or similar for logs
