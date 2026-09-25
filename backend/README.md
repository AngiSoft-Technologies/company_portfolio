# AngiSoft Backend

Express + TypeScript API powering the AngiSoft Technologies platform, with PostgreSQL via Prisma ORM.

## Tech Stack

- **Runtime**: Node.js >= 24
- **Framework**: Express 4
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon) with Prisma ORM
- **Auth**: JWT + bcrypt + 2FA (otplib)
- **Payments**: Stripe
- **Storage**: S3-compatible (AWS S3 / Cloudflare R2)
- **Queue**: BullMQ + Redis (ioredis)
- **Email**: Nodemailer (Zoho SMTP)
- **AI**: OpenAI / Hugging Face chatbot
- **Logging**: Winston
- **Testing**: Vitest + Supertest

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma      Database models
│   └── seed.ts            Sample data seeder
├── src/
│   ├── index.ts           Server entry point
│   ├── routes/            API route handlers
│   ├── middleware/         Auth, RBAC, rate limiting
│   └── ...                Controllers, services, utils
├── test/                  Vitest + Supertest specs
├── scripts/               Migration and utility scripts
├── Dockerfile             Production container build
└── .env                   Runtime config + secrets (gitignored; no .env.example)
```

## Setup

```bash
# no .env.example — edit backend/.env directly (gitignored) and fill in
# DATABASE_URL + secrets there.
npm install
npx prisma contract emit   # emit P8 contract artifacts (src/prisma/) — committed ones also work
npm run prisma:migrate:dev # emit contract + plan a migration from changes
npm run prisma:seed        # seed sample data
npm run dev                # API at http://localhost:5000
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with ts-node-dev (hot reload) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled output |
| `npm run start:prod` | Start the compiled server (migrations run during deployment) |
| `npm run start:worker` | Workers-only process (Fly `worker` group) |
| `npm run mcp:stdio` | Model Context Protocol server over stdio |
| `npm run prisma:generate` | Emit Prisma 8 contract artifacts |
| `npm run prisma:migrate:dev` | Emit contract + plan a migration |
| `npm run prisma:migrate` | Apply planned migrations (production) |
| `npm run prisma:seed` | Seed database |
| `npm test` | Run Vitest |

## Environment Variables

Config comes from `backend/.env` (no `.env.example` template). Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `JWT_SECRET` | JWT signing key (min 32 chars) |
| `STRIPE_SECRET` | Stripe secret key |
| `PAYSTACK_SECRET_KEY` | Paystack secret key |
| `MPESA_*` | M-Pesa Daraja STK Push sandbox/production creds |
| `PAYHERO_*` | PayHero aggregation API creds (Kenyan banks/M-Pesa) |
| `SMTP_*` | Zoho Mail SMTP credentials |
| `S3_*` | S3/R2 storage credentials (AWS_* names accepted, set by `fly storage create`) |
| `REDIS_URL` | Url — powers queue + cache; unset = in-memory fallbacks |
| `REDIS_FAMILY` | IPv6 family for Upstash-on-Fly Redis (6) |
| `CACHE_ENABLED` / `PUBLIC_CACHE_TTL` | Public JSON response cache |
| `OPENAI_API_KEY` | AI chatbot API key |

## API Endpoints

The server exposes REST endpoints under `/api/`:

- `/api/auth` — Login, register, 2FA, password reset
- `/api/services` — Public service listings
- `/api/projects` — Portfolio projects
- `/api/blog` — Blog posts (draft/published)
- `/api/staff` — Staff profiles
- `/api/testimonials` — Client testimonials
- `/api/contact` — Contact form submissions
- `/api/checkout` — Stripe payment sessions
- `/api/admin/*` — Admin CMS endpoints (role-protected)

Health check: `GET /health`

## Deployment (Fly.io)

Deployed to **Fly.io** via Docker (`backend/Dockerfile`); see `backend/fly.toml`.

```bash
fly launch --no-deploy                            # first time, from backend/
fly storage create --public                       # Tigris bucket → sets AWS_* secrets
fly redis create                                  # Upstash Redis → put its URL in REDIS_URL
fly secrets set "REDIS_URL=..." "REDIS_FAMILY=6"  # plus DATABASE_URL, JWT_SECRET, SMTP_*, ...
fly certs add api.angisoft.co.ke                  # attach the custom domain
fly deploy                                        # migrations run via release_command
fly scale count web=2 worker=1                    # scale independently
```

One image, two process groups: `web` (`npm run start`, HTTP + realtime) and `worker`
(`npm run start:worker`, queue workers only — no HTTP listener).

## Testing

```bash
npm test              # Vitest
```

Tests use Supertest against the Express app. Integration tests should scope DB cleanup to test data only — never touch production records.

## Database

Prisma schema defines models for: Employee, Service, Project, BlogPost, Testimonial, Client, Invoice, Payment, and more.

```bash
npx prisma studio    # visual database browser
npx prisma contract emit && npx prisma migration plan   # plan a migration from contract changes
npx prisma db migrate --db "$DATABASE_URL"               # apply planned migrations
```
