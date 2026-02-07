# Production Seeding Guide

## Overview

The database seeding runs automatically on every production deployment via the `start:prod` script:

```bash
npx prisma migrate deploy && npx prisma db seed && node dist/index.js
```

## What Gets Seeded

### 1. Admin User
- **Email**: `admin@angisoft.co.ke`
- **Password**: Set via `ADMIN_PASSWORD` env var (defaults to `ChangeMe123!`)
- **Role**: ADMIN
- **Name**: Super admin
- **Phone**: +254710398690

**⚠️ IMPORTANT**: Set `ADMIN_PASSWORD` in production environment variables!

### 2. Site Settings
- Hero section (headline, stats, CTA buttons)
- About section (company description, values)
- Contact information (email, phone, WhatsApp, address, social links)
- Footer content (quick links, legal links, newsletter)
- Branding (logo paths, colors, site name)
- UI copy (labels, badges, button text)
- Booking flow configuration

### 3. Service Categories (8 categories)
- Custom Software
- Automation & Debugging
- Data Analysis
- Cyber Services
- Government Services
- Advertising
- Internet Services (unpublished)
- Entertainment Services (unpublished)

### 4. Services (10 services)
All services include pricing, descriptions, target audience, and project scope.

### 5. Projects (6 portfolio items)
- E-Commerce Platform
- School Management System
- Fleet Tracking Solution
- Clinic Management App
- Restaurant POS System
- Data Analytics Dashboard

### 6. Blog Posts (3 articles)
- Why Every Business in Kenya Needs a Digital Presence in 2026
- How to Choose the Right Software Development Partner
- The Complete Guide to M-Pesa Integration for Your Business

### 7. Testimonials (5 client reviews)
All confirmed testimonials with 5-star ratings from real project types.

### 8. Staff Members (4 team members)
- Default password: `Welcome123!` (they should change on first login)
- Roles: 3 DEVELOPER, 1 MARKETING
- Includes bio, email, phone

### 9. FAQs (13 questions)
Categorized by: General, Bookings & Projects, Payments, Technical, Newsletter

## Idempotency

The seed script is **idempotent** - it can run multiple times safely:
- Uses `upsert` for settings (updates if exists, creates if not)
- Checks for existing records before creating admin/staff
- Uses `skipDuplicates: true` for batch inserts

## Production Deployment Checklist

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host/database?pgbouncer=true

# Admin Account
ADMIN_PASSWORD=<strong-password-here>  # ⚠️ CRITICAL

# Email (Zoho SMTP)
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_USER=info@angisoft.co.ke
SMTP_PASS=<zoho-password>
EMAIL_FROM_GENERAL=info@angisoft.co.ke
EMAIL_FROM_SUPPORT=support@angisoft.co.ke
EMAIL_FROM_NOREPLY=noreply@angisoft.co.ke
EMAIL_FROM_UPDATES=updates@angisoft.co.ke

# Security
JWT_SECRET=<random-256-bit-string>
JWT_REFRESH_SECRET=<random-256-bit-string>

# Stripe (if using)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App Config
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://angisoft.co.ke
CORS_ORIGIN=https://angisoft.co.ke
```

### Deployment Steps (Railway Example)

1. **Set Environment Variables** in Railway dashboard
2. **Push code** to main branch
3. **Railway auto-deploys** with this flow:
   - Builds Docker image
   - Runs `npm run start:prod`
   - Executes migrations (`npx prisma migrate deploy`)
   - **Runs seeding** (`npx prisma db seed`)
   - Starts server (`node dist/index.js`)

### First Deployment

On first deploy:
1. Database tables created via migrations
2. Seed data populated automatically
3. Admin account created with your `ADMIN_PASSWORD`

### Subsequent Deployments

Seeding runs but:
- Existing records are NOT overwritten (upsert/skipDuplicates)
- New services/projects added if slugs don't exist
- Settings updated to latest values

## Manual Seeding

If you need to manually re-seed:

```bash
# Local
npm run prisma:seed

# Production (Railway CLI)
railway run npx ts-node prisma/seed.ts
```

## Updating Seed Data

To change production content:

1. Edit `/backend/prisma/seed.ts`
2. Update values (hero text, services, projects, etc.)
3. Commit and push
4. Railway redeploys and runs updated seed

## Data Accuracy Checklist

All seeded data has been verified for production:

- ✅ Real company contact info (+254710398690, info@angisoft.co.ke)
- ✅ Accurate social media links (LinkedIn, X, Facebook, GitHub)
- ✅ Kenya-focused services (M-Pesa, KRA, SHA)
- ✅ Realistic project examples (POS, School, Clinic, Fleet)
- ✅ Professional testimonials (no placeholder names)
- ✅ Relevant blog content (Kenya digital economy, M-Pesa integration)
- ✅ Staff members with Kenyan names and @angisoft.co.ke emails
- ✅ Pricing in KES range appropriate for East African market

## Security Notes

1. **Change default passwords immediately** after first login
2. Set strong `ADMIN_PASSWORD` in production env
3. Staff default password `Welcome123!` should be changed by each user
4. Invite new staff via email invitation system (don't use seed script)

## Troubleshooting

### Seed Fails on Deployment

Check logs for:
- Database connection errors → Verify `DATABASE_URL`
- Prisma client not generated → Run `npx prisma generate` in Dockerfile
- TypeScript errors → Ensure `ts-node` installed and working

### Admin Login Fails

Verify:
- Email: `admin@angisoft.co.ke` (exact match)
- Password: Value of `ADMIN_PASSWORD` env var
- Account created: Check database `Employee` table

### Duplicate Key Errors

Seeding is idempotent but if you manually created records with same slugs/emails, seed may fail. Safe to ignore if data already exists.

## Support

For seeding issues, contact the dev team or check Railway deployment logs.
