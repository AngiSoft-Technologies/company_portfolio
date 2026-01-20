# AngiSoft Technologies - Production Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Redis (for queues)
- S3/R2 or compatible storage
- Stripe account (for payments)
- SendGrid account (for emails)

### Environment Setup

#### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Server
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
CORS_ORIGIN=https://yourdomain.com

# Payments
STRIPE_SECRET=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SENDGRID_API_KEY=SG....

# Storage
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=angisoft-uploads
S3_REGION=us-east-1
S3_PUBLIC_BASE_URL=https://your-cdn.com

# Redis
REDIS_URL=redis://...

# Admin
ADMIN_EMAIL=admin@angisoft-technologies.com
```

#### Frontend (.env)
```bash
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

### Installation

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
npm start

# Frontend
cd frontend
npm install
npm run build
# Deploy dist/ folder to Cloudflare Pages or your hosting
```

## ✨ Key Features

### Admin System
- **Dashboard**: Real-time statistics, recent bookings, quick actions
- **Booking Management**: Search, filter, review, assign, track payments
- **Staff Management**: CRUD operations, avatar upload, role management
- **File Upload**: Categorized uploads (avatars, CVs, documents, logos)
- **Settings**: Site-wide configuration management

### Staff Dashboard
- **Profile Management**: Edit bio, contact info, upload avatar
- **Document Upload**: CVs, portfolios, certificates
- **Content Overview**: View own services, projects, bookings
- **Password Management**: Secure password changes

### Public Website
- **Company Branding**: Logo, teal color scheme, professional design
- **Staff Portfolios**: Individual team member pages
- **Service Pages**: Detailed service information
- **Project Pages**: Full project showcases
- **Booking System**: Multi-step form with validation
- **Status Tracking**: Customer booking status page

## 🔒 Security Features

- ✅ Input sanitization (XSS protection)
- ✅ File upload validation (size, type)
- ✅ JWT authentication with refresh tokens
- ✅ Role-based access control
- ✅ Rate limiting on auth endpoints
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ Request size limits

## 📊 Performance Features

- ✅ Code splitting & lazy loading
- ✅ Pagination for large lists
- ✅ Search & filtering
- ✅ Loading states
- ✅ Error boundaries
- ✅ Efficient database queries

## 🎨 Branding

- **Logo**: AngiSoft Technologies logo integrated
- **Colors**: Teal (#14B8A6) primary brand color
- **Design**: Modern, professional, responsive

## 📝 API Endpoints

### Public
- `GET /api/services` - List services
- `GET /api/projects` - List projects
- `GET /api/staff` - List staff
- `GET /api/staff/:id` - Staff details
- `POST /api/bookings` - Create booking
- `GET /api/bookings/:id` - Booking status

### Admin (Auth Required)
- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `GET /api/admin/bookings` - List bookings
- `GET /api/admin/employees` - List employees
- `POST /api/admin/upload` - Upload files
- `PUT /api/admin/settings/:key` - Update settings

### Staff Dashboard (Auth Required)
- `GET /api/staff-dashboard/profile` - Get profile
- `PUT /api/staff-dashboard/profile` - Update profile
- `POST /api/staff-dashboard/profile/avatar` - Upload avatar
- `POST /api/staff-dashboard/profile/documents` - Upload documents

## 🧪 Health Checks

- `GET /health` - Full health check (database, uptime)
- `GET /health/ready` - Readiness probe (for load balancers)

## 📦 Deployment

### Backend
1. Build: `npm run build`
2. Run migrations: `npx prisma migrate deploy`
3. Start: `npm start` or use PM2/Docker

### Frontend
1. Build: `npm run build`
2. Deploy `dist/` folder to:
   - Cloudflare Pages (recommended)
   - Vercel
   - Netlify
   - Any static hosting

### Database
- Use managed PostgreSQL (Supabase, Neon, AWS RDS)
- Run migrations on deploy
- Set up automated backups

## 🔧 Monitoring

- Health check endpoint for monitoring
- Error logging (integrate Sentry)
- Performance monitoring
- Uptime tracking

## 📚 Documentation

- See `ADMIN_SYSTEM.md` for admin features
- See `FEATURES_IMPLEMENTED.md` for public features
- See `PRODUCTION_ENHANCEMENTS.md` for technical details

---

**Status**: ✅ Production-ready
**Version**: 1.0.0

