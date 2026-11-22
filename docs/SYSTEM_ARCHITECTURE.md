# AngiSoft Platform - Complete System Architecture

> **📜 HISTORICAL** — Describes pre-restructure architecture (`frontend/src`, `backend/src/routes/`).<br>
> **Do not cite for current structure.** Current architecture per `AGENTS.md` §Project Structure and `ANGISOFT_DIGITAL_HQ_PLAN.md` §3.

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ANGISOFT INTEGRATED PLATFORM                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 1. SYSTEM ADMIN PORTAL (admin.angisoft.co.ke)                        │  │
│  │    ✓ Company Services CRUD         → /v1/services (POST/PUT/DELETE) │  │
│  │    ✓ Company Projects CRUD         → /v1/projects (POST/PUT/DELETE) │  │
│  │    ✓ Blog Posts CRUD               → /v1/blogs (POST/PUT/DELETE)    │  │
│  │    ✓ Testimonials CRUD             → /v1/testimonials (...)         │  │
│  │    ✓ Site Settings Management      → /v1/settings (...)            │  │
│  │    ✓ View Bookings & Payments      → /v1/admin/bookings            │  │
│  │    ✓ Dashboard & Analytics         → /v1/admin/dashboard/stats      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                              ↓                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ BACKEND API (api.angisoft.co.ke or integrated)                       │  │
│  │ ├─ Database: PostgreSQL                                              │  │
│  │ ├─ ORM: Prisma                                                       │  │
│  │ ├─ Auth: JWT tokens (adminToken in localStorage)                    │  │
│  │ ├─ Models: Service, Project, BlogPost, Testimonial, Employee,       │  │
│  │ │           Client, Booking, Payment, Setting, File, etc.           │  │
│  │ └─ Queue: BullMQ for async jobs (email, file processing)            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                              ↓                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 2. PUBLIC FRONTEND (angisoft.co.ke)                                  │  │
│  │    ✓ Services Section     → Fetches /v1/services (published only)   │  │
│  │    ✓ Projects Section     → Fetches /v1/projects (published only)   │  │
│  │    ✓ Blog Section         → Fetches /v1/blogs (published only)      │  │
│  │    ✓ Staff Section        → Fetches /v1/staff (active employees)    │  │
│  │    ✓ Testimonials Section → Fetches /v1/testimonials (confirmed)    │  │
│  │    ✓ About Section        → Static content (from /v1/settings)      │  │
│  │    ✓ Booking Section      → Form with file upload & payment          │  │
│  │    ✓ Contact Section      → Contact form → saves to bookings         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 3. STAFF PORTAL (staff.angisoft.co.ke or /staff route)               │  │
│  │    ✓ Employee Login        → /v1/auth/login (staff credentials)    │  │
│  │    ✓ Dashboard             → View own profile & portfolio stats      │  │
│  │    ✓ Edit Profile/Bio      → PATCH /v1/staff/{id}                  │  │
│  │    ✓ Education History     → POST/PUT/DELETE /v1/education         │  │
│  │    ✓ Work Experience       → POST/PUT/DELETE /v1/experience        │  │
│  │    ✓ Skills               → POST/PUT/DELETE /v1/skills             │  │
│  │    ✓ View Assigned Bookings → /v1/admin/bookings?assigned=me       │  │
│  │    ✓ Update Booking Status → PUT /v1/admin/bookings/{id}/review    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                              ↓                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ STAFF PROFILE DATA                                                   │  │
│  │ ├─ Employee info (name, bio, avatar, contact)                        │  │
│  │ ├─ Education history (degree, school, dates, GPA, etc.)              │  │
│  │ ├─ Work experience (company, title, duration, description)           │  │
│  │ ├─ Skills (name, proficiency, endorsements)                          │  │
│  │ ├─ Social links (GitHub, LinkedIn, Portfolio, etc.)                  │  │
│  │ └─ Automatically displayed on Staff section of frontend              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 4. CLIENT INTERACTIONS (angisoft.co.ke)                              │  │
│  │    ✓ Browse Services      → GET /v1/services (published: true)      │  │
│  │    ✓ View Projects        → GET /v1/projects (published: true)      │  │
│  │    ✓ Read Blog            → GET /v1/blogs (published: true)         │  │
│  │    ✓ Book Service         → POST /v1/bookings (multipart + files)   │  │
│  │    ✓ Payment              → Stripe/PayPal/M-Pesa via /v1/payments   │  │
│  │    ✓ Track Booking        → GET /v1/bookings/{id}                   │  │
│  │    ✓ Submit Contact Form  → POST /v1/contact or /v1/bookings      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Data Flow Examples

### 1. Admin Creates a Service
```
System Admin → /admin/services → BlogAdmin.jsx
  └─ Fill form (title, description, price, images)
     └─ Click "Create"
        └─ POST /v1/services { title, description, ...}
           └─ Backend: prisma.service.create()
              └─ Database: INSERT INTO Service
                 └─ Response: { id, title, ... }
                    └─ Frontend: fetch /v1/services again
                       └─ Display in table immediately
                          └─ User sees: "Service created successfully"
```

### 2. Client Views Services on Homepage
```
Public User → angisoft.co.ke → Home.jsx
  └─ Page loads
     └─ Services section calls useEffect()
        └─ Fetches GET /v1/services
           └─ Backend filters: where { published: true }
              └─ Returns only published services
                 └─ Frontend renders in ServiceCard components
                    └─ User sees: All published services with images, descriptions, prices
```

### 3. Staff Member Updates Their Profile
```
Developer Employee → /admin/staff-dashboard or /staff
  └─ Login with employee credentials
     └─ Dashboard shows: Name, Bio, Avatar, Education, Experience, Skills
        └─ Click "Edit Education"
           └─ educationAdmin.jsx opens form
              └─ POST /v1/education { school, degree, dates, ... }
                 └─ Backend: prisma.education.create({ employeeId, ... })
                    └─ Database: INSERT INTO Education
                       └─ Response: { id, school, ... }
                          └─ Staff page refreshes
                             └─ User sees: New education entry in their profile
                                └─ Admin can now see this in Staff section on homepage
```

### 4. Payment Webhook Flow
```
Client → /book → Select Service & Pay
  └─ Enter payment info
     └─ Frontend: Stripe.confirmPayment()
        └─ Stripe: Process payment
           └─ Stripe webhook → POST /v1/payments/webhook
              └─ Backend: Verify signature
                 └─ prisma.payment.update({ status: 'SUCCEEDED' })
                    └─ prisma.booking.update({ depositPaidAt: now() })
                       └─ Email worker: Send receipt
                          └─ Admin sees: Booking moved to DEPOSIT_PAID status
                             └─ Client sees: Payment confirmation & booking status
```

---

## 🛠️ Current Implementation Status

### ✅ COMPLETE

| Component | Status | Path |
|-----------|--------|------|
| **Backend** | |
| Services CRUD | ✅ Ready | /v1/services |
| Projects CRUD | ✅ Ready | /v1/projects |
| Blogs CRUD | ✅ Ready | /v1/blogs |
| Testimonials CRUD | ✅ Ready | /v1/testimonials |
| Admin Routes | ✅ Ready | /v1/admin/* |
| Staff Routes | ✅ Ready | /v1/staff |
| Settings | ✅ Ready | /v1/settings |
| Auth | ✅ Ready | /v1/auth |
| Bookings | ✅ Ready | /v1/bookings |
| Payments | ✅ Ready | /v1/payments |
| **Frontend** | |
| AdminLayout | ✅ Done | /admin/* |
| EnhancedAdminDashboard | ✅ Done | /admin |
| ServicesAdmin | ✅ Done | /admin/services |
| ProjectsAdmin | ✅ Done | /admin/projects |
| **BlogAdmin** | ✅ **JUST CREATED** | /admin/blog |
| TestimonialsAdmin | ✅ Done | /admin/testimonials |
| StaffManagement | ✅ Done | /admin/staff |
| StaffDashboard | ✅ Done | /admin/staff-dashboard |
| EducationAdmin | ✅ Done | /admin/education |
| ExperienceAdmin | ✅ Done | /admin/experience |
| SkillsAdmin | ✅ Done | /admin/skills |
| Services Section | ✅ Fetches API | Displays published |
| Projects Section | ✅ Fetches API | Displays published |
| Blog Section | ✅ Fetches API | Displays published |
| Staff Section | ✅ Fetches API | Shows active employees |
| Testimonials Section | ✅ Fetches API | Shows confirmed |
| httpClient | ✅ Ready | Attaches adminToken |

### 🟡 PENDING

| Item | Action Required |
|------|-----------------|
| Full Integration Test | Need to verify end-to-end flow |
| Contact Messages Endpoint | Need GET /v1/admin/contact-messages |
| CORS Configuration | Update for admin.angisoft.co.ke domain |
| Deployment | Setup separate domains |
| Image Uploads in Admin | Add file picker to admin forms |

---

## 🧪 Testing Checklist

### Test 1: Admin Creates Blog Post
```bash
1. Go to http://localhost:5174/admin/login
2. Login with admin credentials
3. Click "Blog Posts" in sidebar
4. Click "+ New Blog Post"
5. Fill form:
   - Title: "Test Post"
   - Slug: "test-post"
   - Content: "This is a test"
   - Tags: "test, angisoft"
   - Published: checked
6. Click "Create"
7. Verify: Success message + appears in table
```

### Test 2: Frontend Displays Blog Post
```bash
1. Go to http://localhost:5174/ (homepage)
2. Scroll to Blog section
3. Check: New blog post appears
4. Console: Verify GET /v1/blogs returns the post
5. Click "Read More" → should navigate to post details
```

### Test 3: Admin Updates Service
```bash
1. Go to /admin/services
2. Click "Edit" on any service
3. Change: description
4. Click "Update"
5. Verify: Success message
6. Go to homepage Services section
7. Refresh page
8. Check: Updated description shows
```

### Test 4: Staff Updates Profile
```bash
1. Go to /admin/staff-dashboard
2. Login with employee credentials
3. Click "Edit" on profile
4. Update: Bio
5. Click "Save"
6. Go to homepage Staff section
7. Find staff member
8. Check: Updated bio shows
```

---

## 📍 Key Endpoints Reference

### Public (No Auth)
- `GET /v1/services` → Published services
- `GET /v1/projects` → Published projects
- `GET /v1/blogs` → Published blog posts
- `GET /v1/testimonials` → Confirmed testimonials
- `GET /v1/staff` → Active employees
- `GET /v1/settings` → Site settings

### Auth Required
- `POST /v1/bookings` → Create booking (files)
- `GET /v1/bookings/{id}` → Check booking status
- `POST /v1/payments` → Process payment

### Admin Only
- `GET /v1/admin/dashboard/stats` → Dashboard data
- `GET /v1/admin/bookings` → All bookings
- `PUT /v1/admin/bookings/{id}/review` → Approve/reject
- `GET /v1/admin/employees` → Staff management
- `POST /v1/services` → Create service (admin)
- `PUT /v1/services/{id}` → Update service (admin)
- `DELETE /v1/services/{id}` → Delete service (admin)

### Staff (Self)
- `GET /v1/staff/{id}` → Own profile
- `PATCH /v1/staff/{id}` → Update profile
- `POST /v1/education` → Add education
- `POST /v1/experience` → Add experience
- `POST /v1/skills` → Add skill

---

## 🚀 Deployment Architecture

### Three Separate Deployments
```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Admin Panel         │     │ Public Frontend   │     │ Staff Portal    │
│ admin.angisoft.     │     │ angisoft.co.ke    │     │ staff.angisoft. │
│ co.ke               │     │                  │     │ co.ke            │
│                     │     │                  │     │                 │
│ React/Vite App      │     │ React/Vite App   │     │ React/Vite App  │
│ Port: 3000 (build)  │     │ Port: 5174 (dev) │     │ Port: 3001      │
│ or 3000             │     │                  │     │ or dedicated    │
└──────────┬──────────┘     └────────┬─────────┘     └────────┬────────┘
           │                        │                        │
           └────────────┬───────────┴────────────┬──────────┘
                        ↓                         ↓
                 ┌───────────────────────────────────┐
                 │  Backend API                      │
                 │  api.angisoft.co.ke               │
                 │ (or integrated endpoint)          │
                 │                                   │
                 │ Express + Prisma + PostgreSQL     │
                 │ Port: 5000                        │
                 │                                   │
                 │ ✓ CORS allows 3 domains           │
                 │ ✓ JWT auth for admin token        │
                 │ ✓ Email/payment webhooks          │
                 └───────────────────────────────────┘
                         ↓
                   PostgreSQL
                   Database
```

### Environment Variables
```bash
# Backend (.env)
DATABASE_URL=postgresql://...
CORS_ORIGIN=https://angisoft.co.ke,https://admin.angisoft.co.ke,https://staff.angisoft.co.ke
JWT_SECRET=...
STRIPE_KEY=...
...

# Frontend (.env.local)
VITE_API_BASE_URL=https://api.angisoft.co.ke

# Admin (.env.local)
VITE_API_BASE_URL=https://api.angisoft.co.ke

# Staff Portal (.env.local)
VITE_API_BASE_URL=https://api.angisoft.co.ke
```

---

## 📞 Contact Form Integration

Currently: Contact → Email or Booking record
Future: Dedicated Contact model + view in admin

```typescript
// Proposed: backend/prisma/schema.prisma
model ContactMessage {
  id String @id @default(uuid())
  name String
  email String
  phone String?
  subject String
  message String
  read Boolean @default(false)
  replied Boolean @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 🎯 Next Steps (Recommended Order)

1. ✅ **BlogAdmin created & integrated** ← YOU ARE HERE
2. 🔄 **Run local tests** (admin CRUD → frontend display)
3. 📝 **Update Contact endpoint** (add contact messages model)
4. 🔐 **Test Auth flows** (admin login, staff login, token refresh)
5. 📤 **File upload testing** (service/project images in admin)
6. 🌍 **CORS configuration** (add admin/staff domains)
7. 🚀 **Deployment** (separate domains for admin/staff/frontend)
8. ✨ **Polish & polish** (error handling, validations, styling)
