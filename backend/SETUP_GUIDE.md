# Backend Setup & Testing Instructions

## Current Status ✅

All TypeScript compilation errors and import issues have been resolved. The backend is now buildable and ready for local development.

### What Just Got Fixed
- ✅ Fixed `bullmq` version from empty to `^5.6.0`
- ✅ Fixed all AWS SDK, Sendgrid, and Stripe versions
- ✅ Fixed Prisma schema validation errors (all relation fields now properly defined)
- ✅ Added missing `Testimonial` model to schema
- ✅ Fixed import paths in `stripeService.ts` and `settingsController.ts`
- ✅ Fixed rate limiter IPv6 validation by adding `ipKeyGenerator`
- ✅ Added missing `requireAuth` import to `bookingsRouter`
- ✅ Made Sentry initialization optional (logs warning only if DSN missing)

### Test Execution Status
Tests now execute but fail with database connection errors (expected):
```
Test Files  2 failed (2)
Tests       2 failed | 1 passed | 4 skipped (7)
```

The failures are due to Prisma trying to connect to `localhost:5432` which isn't running. This is expected for local dev without a running database.

---

## Local Development Setup

### Prerequisites
- PostgreSQL 14+ running on `localhost:5432`
- Node 18+
- npm or yarn

### Step 1: Start PostgreSQL (if needed)

**Option A: Using Docker** (recommended)
```bash
docker run -d \
  --name angisoft-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=angisoft \
  -p 5432:5432 \
  postgres:15-alpine
```

**Option B: Using local PostgreSQL service**
```bash
sudo service postgresql start
# Then create database and user:
createdb angisoft
psql -U postgres -d angisoft -c "CREATE USER angisoft WITH ENCRYPTED PASSWORD 'password'; GRANT ALL PRIVILEGES ON DATABASE angisoft TO angisoft;"
```

### Step 2: Configure Environment

Create/update `.env` in `backend/`:
```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/angisoft"

# JWT & Auth
JWT_SECRET="your-secret-key-min-32-chars-long"
JWT_REFRESH_SECRET="your-refresh-secret-key-min-32-chars"
REFRESH_TOKEN_EXPIRY="7d"

# Email (SendGrid)
SENDGRID_API_KEY="SG.xxxx..."
EMAIL_FROM="noreply@angisoft.com"

# Stripe (payments)
STRIPE_SECRET="sk_test_xxxx..."
STRIPE_WEBHOOK_SECRET="whsec_xxxx..."

# AWS S3 / R2
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="xxxx..."
S3_BUCKET_NAME="angisoft-uploads"

# Redis (background jobs)
REDIS_URL="redis://localhost:6379"

# Sentry (optional error tracking)
SENTRY_DSN="https://xxxx@sentry.io/project"
NODE_ENV="development"

# CORS & Frontend
FRONTEND_URL="http://localhost:3000"
CORS_ORIGIN="http://localhost:3000,http://localhost:3001"

# Server
PORT=5000
API_VERSION="1.0.0"
```

### Step 3: Run Migrations

```bash
cd /home/prof_angera/Projects/robust-portfolio/backend

# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name init

# (Optional) Seed database
npm run prisma:seed
```

### Step 4: Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:5000`

### Step 5: Run Tests (with DB running)

```bash
npm test
```

All tests should pass once database is connected.

---

## Useful Commands

### Development
```bash
npm run dev              # Start server with hot-reload
npm test                 # Run all tests
npm run test:watch      # Run tests in watch mode
npm run build            # Build TypeScript to dist/
npm start               # Run compiled server from dist/
```

### Database
```bash
npx prisma generate     # Regenerate Prisma client
npx prisma migrate dev  # Create new migration interactively
npx prisma migrate deploy  # Apply pending migrations
npx prisma studio      # Open Prisma Studio (GUI database explorer)
npm run prisma:seed    # Run seed script
```

### Stripe
```bash
npm run reconcile:stripe  # Manually reconcile Stripe payments
```

---

## API Endpoints (Ready to Use)

### Public Routes
- `GET /` - Health check
- `POST /api/bookings` - Create booking
- `GET /api/services` - List services
- `GET /api/projects` - List projects
- `GET /api/blogs` - List blog posts
- `GET /api/testimonials` - List testimonials

### Auth Routes
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/2fa/enroll` - Enroll in TOTP 2FA
- `POST /api/auth/2fa/verify` - Verify TOTP code
- `POST /api/auth/2fa/backup/verify` - Verify backup code

### Admin Routes (require auth)
- `POST /api/invite` - Create employee invite
- `POST /api/invite/accept` - Accept invite with password
- `POST /api/payments/create-intent` - Create Stripe PaymentIntent
- `POST /api/uploads/sign` - Get presigned S3 upload URL
- `POST /api/uploads/confirm` - Confirm file upload
- `CRUD /api/services` - Services management
- `CRUD /api/projects` - Projects management
- `CRUD /api/blogs` - Blog posts management
- `CRUD /api/testimonials` - Testimonials management
- `GET /api/settings` - Get app settings

---

## Testing Locally

### Health Check
```bash
curl http://localhost:5000/
# Response: AngiSoft Technologies API (Postgres)
```

### Create Booking
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+1234567890",
    "title": "Resume Review",
    "description": "Please review my resume",
    "projectType": "RESUME"
  }'
```

### List Services
```bash
curl http://localhost:5000/api/services
```

---

## Next Steps

1. **Start PostgreSQL** using one of the methods above
2. **Configure `.env`** with your credentials
3. **Run migrations**: `npx prisma migrate dev --name init`
4. **Start dev server**: `npm run dev`
5. **Run tests**: `npm test`
6. **Test endpoints** using curl or Postman

Once everything is running locally, you can:
- Create bookings via public API
- Test 2FA login flow
- Create admin users via invite flow
- Test Stripe payment integration (with test keys)
- Upload files to S3/R2
- Monitor background jobs with Redis

---

## Troubleshooting

### "Can't reach database server"
- Ensure PostgreSQL is running on `localhost:5432`
- Check `DATABASE_URL` in `.env`
- Verify credentials are correct

### "Cannot find module 'helmet'"
- Run `npm install` again to ensure all dependencies are installed
- Delete `node_modules` and run `npm install` fresh

### "SENTRY_DSN not configured"
- This is just a warning, not an error
- Sentry is optional; add `SENTRY_DSN` to `.env` to enable error tracking

### Port 5000 already in use
- Change `PORT` in `.env` to an available port (e.g., `PORT=5001`)
- Or kill the process: `lsof -ti:5000 | xargs kill -9`

---

## Architecture Overview

```
Backend Structure:
├── src/
│   ├── app.ts                 # Express app setup & middleware
│   ├── index.ts              # Server entry point & worker startup
│   ├── db.ts                 # Prisma client singleton
│   ├── routes/               # API route handlers
│   ├── controllers/          # Business logic & CRUD operations
│   ├── services/             # External integrations (Stripe, S3, Sentry, etc.)
│   ├── workers/              # Background job processors (email, files, reconciliation)
│   ├── middleware/           # Express middleware (auth, validation, error handling)
│   ├── utils/                # Helpers (CRUD router, tokens, passwords, etc.)
│   ├── types/                # TypeScript type declarations
│   └── queue/                # BullMQ queue management
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Migration files
├── test/                     # Test files
├── scripts/                  # Utility scripts (e.g., reconcile-stripe.js)
└── package.json

Key Technologies:
- Express.js - HTTP server framework
- Prisma - ORM & database management
- PostgreSQL - Primary database
- Redis - Session store & background job queue
- BullMQ - Background job processing
- Stripe - Payment processing
- AWS S3 / Cloudflare R2 - File storage
- SendGrid - Email delivery
- TOTP / Zxcvbn - Security (2FA, password strength)
- Vitest + Supertest - Testing
```

---

**Generated**: 3 December 2025  
**Status**: Ready for local development with database setup required
