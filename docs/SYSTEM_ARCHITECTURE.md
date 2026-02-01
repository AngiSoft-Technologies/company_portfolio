# AngiSoft Platform - Complete System Architecture

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ANGISOFT INTEGRATED PLATFORM                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 1. SYSTEM ADMIN PORTAL (admin.angisoft.co.ke)                        │  │
│  │    ✓ Company Services CRUD         → /api/services (POST/PUT/DELETE) │  │
│  │    ✓ Company Projects CRUD         → /api/projects (POST/PUT/DELETE) │  │
│  │    ✓ Blog Posts CRUD               → /api/blogs (POST/PUT/DELETE)    │  │
│  │    ✓ Testimonials CRUD             → /api/testimonials (...)         │  │
│  │    ✓ Site Settings Management      → /api/settings (...)            │  │
│  │    ✓ View Bookings & Payments      → /api/admin/bookings            │  │
│  │    ✓ Dashboard & Analytics         → /api/admin/dashboard/stats      │  │
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
│  │    ✓ Services Section     → Fetches /api/services (published only)   │  │
│  │    ✓ Projects Section     → Fetches /api/projects (published only)   │  │
│  │    ✓ Blog Section         → Fetches /api/blogs (published only)      │  │
│  │    ✓ Staff Section        → Fetches /api/staff (active employees)    │  │
│  │    ✓ Testimonials Section → Fetches /api/testimonials (confirmed)    │  │
│  │    ✓ About Section        → Static content (from /api/settings)      │  │
│  │    ✓ Booking Section      → Form with file upload & payment          │  │
│  │    ✓ Contact Section      → Contact form → saves to bookings         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 3. STAFF PORTAL (staff.angisoft.co.ke or /staff route)               │  │
│  │    ✓ Employee Login        → /api/auth/login (staff credentials)    │  │
│  │    ✓ Dashboard             → View own profile & portfolio stats      │  │
│  │    ✓ Edit Profile/Bio      → PATCH /api/staff/{id}                  │  │
│  │    ✓ Education History     → POST/PUT/DELETE /api/education         │  │
│  │    ✓ Work Experience       → POST/PUT/DELETE /api/experience        │  │
│  │    ✓ Skills               → POST/PUT/DELETE /api/skills             │  │
│  │    ✓ View Assigned Bookings → /api/admin/bookings?assigned=me       │  │
│  │    ✓ Update Booking Status → PUT /api/admin/bookings/{id}/review    │  │
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
│  │    ✓ Browse Services      → GET /api/services (published: true)      │  │
│  │    ✓ View Projects        → GET /api/projects (published: true)      │  │
│  │    ✓ Read Blog            → GET /api/blogs (published: true)         │  │
│  │    ✓ Book Service         → POST /api/bookings (multipart + files)   │  │
│  │    ✓ Payment              → Stripe/PayPal/M-Pesa via /api/payments   │  │
│  │    ✓ Track Booking        → GET /api/bookings/{id}                   │  │
│  │    ✓ Submit Contact Form  → POST /api/contact or /api/bookings      │  │
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
        └─ POST /api/services { title, description, ...}
           └─ Backend: prisma.service.create()
              └─ Database: INSERT INTO Service
                 └─ Response: { id, title, ... }
                    └─ Frontend: fetch /api/services again
                       └─ Display in table immediately
                          └─ User sees: "Service created successfully"
```

### 2. Client Views Services on Homepage
```
Public User → angisoft.co.ke → Home.jsx
  └─ Page loads
     └─ Services section calls useEffect()
        └─ Fetches GET /api/services
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
              └─ POST /api/education { school, degree, dates, ... }
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
           └─ Stripe webhook → POST /api/payments/webhook
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
| Services CRUD | ✅ Ready | /api/services |
| Projects CRUD | ✅ Ready | /api/projects |
| Blogs CRUD | ✅ Ready | /api/blogs |
| Testimonials CRUD | ✅ Ready | /api/testimonials |
| Admin Routes | ✅ Ready | /api/admin/* |
| Staff Routes | ✅ Ready | /api/staff |
| Settings | ✅ Ready | /api/settings |
| Auth | ✅ Ready | /api/auth |
| Bookings | ✅ Ready | /api/bookings |
| Payments | ✅ Ready | /api/payments |
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
| Contact Messages Endpoint | Need GET /api/admin/contact-messages |
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
4. Console: Verify GET /api/blogs returns the post
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
- `GET /api/services` → Published services
- `GET /api/projects` → Published projects
- `GET /api/blogs` → Published blog posts
- `GET /api/testimonials` → Confirmed testimonials
- `GET /api/staff` → Active employees
- `GET /api/settings` → Site settings

### Auth Required
- `POST /api/bookings` → Create booking (files)
- `GET /api/bookings/{id}` → Check booking status
- `POST /api/payments` → Process payment

### Admin Only
- `GET /api/admin/dashboard/stats` → Dashboard data
- `GET /api/admin/bookings` → All bookings
- `PUT /api/admin/bookings/{id}/review` → Approve/reject
- `GET /api/admin/employees` → Staff management
- `POST /api/services` → Create service (admin)
- `PUT /api/services/{id}` → Update service (admin)
- `DELETE /api/services/{id}` → Delete service (admin)

### Staff (Self)
- `GET /api/staff/{id}` → Own profile
- `PATCH /api/staff/{id}` → Update profile
- `POST /api/education` → Add education
- `POST /api/experience` → Add experience
- `POST /api/skills` → Add skill

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
