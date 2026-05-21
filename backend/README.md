# AngiSoft Backend

Express + TypeScript API powering the AngiSoft Technologies platform, with PostgreSQL via Prisma ORM.

## Tech Stack

- **Runtime**: Node.js >= 22
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
└── .env.example           Required environment variables
```

## Setup

```bash
cp .env.example .env       # fill in DATABASE_URL and secrets
npm install
npx prisma generate        # generate Prisma client
npm run prisma:migrate:dev # run migrations
npm run prisma:seed        # seed sample data
npm run dev                # API at http://localhost:5000
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with ts-node-dev (hot reload) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled output |
| `npm run start:prod` | Migrate + seed + start (Docker entrypoint) |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate:dev` | Create and apply migrations |
| `npm run prisma:migrate` | Deploy migrations (production) |
| `npm run prisma:seed` | Seed database |
| `npm test` | Run Vitest |

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `JWT_SECRET` | JWT signing key (min 32 chars) |
| `STRIPE_SECRET` | Stripe secret key |
| `SMTP_*` | Zoho Mail SMTP credentials |
| `S3_*` | S3/R2 storage credentials |
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

## Deployment

Deployed to **Railway** via Docker (`Dockerfile`). The container runs `npm run start:prod` which applies migrations, seeds (if needed), and starts the server.

Config: `../railway.json` with health check on `/health`.

## Testing

```bash
npm test              # Vitest
```

Tests use Supertest against the Express app. Integration tests should scope DB cleanup to test data only — never touch production records.

## Database

Prisma schema defines models for: Employee, Service, Project, BlogPost, Testimonial, Client, Invoice, Payment, and more.

```bash
npx prisma studio    # visual database browser
npx prisma migrate dev --name describe_change   # create a migration
```
