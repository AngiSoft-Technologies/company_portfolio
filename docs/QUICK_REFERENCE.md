# 📌 QUICK REFERENCE - ANGISOFT ADMIN CMS

> **🛠 OPERATIONAL** — Update URLs to current monorepo structure.

## 🔗 Important URLs

### Development (Local)
```
Frontend:        http://localhost:5174
Admin Login:     http://localhost:5174/admin/login
Admin Dashboard: http://localhost:5174/admin
Backend API:     http://localhost:5000/api
```

### Production (After Deployment)
```
Frontend:        https://angisoft.co.ke
Admin:          https://admin.angisoft.co.ke
Staff Portal:   https://staff.angisoft.co.ke
Backend API:    https://api.angisoft.co.ke/api
```

---

## 🎯 Common Admin Tasks

### Create Blog Post
1. Go to `/admin/blog`
2. Click "+ New Blog Post"
3. Fill: Title, Slug, Content, Tags, Publish
4. Click "Create"
5. Appears on homepage instantly ✨

### Create Service
1. Go to `/admin/services`
2. Click "+ New Service"
3. Fill: Name, Description, Price
4. Click "Add"
5. Shows in Services section (if published)

### Manage Staff
1. Go to `/admin/staff`
2. View all employees
3. Edit roles or remove staff

### View Bookings
1. Go to `/admin/bookings`
2. Filter by status (SUBMITTED, ACCEPTED, etc.)
3. Click to view details and assign to staff

### Configure Site Settings
1. Go to `/admin/site-settings`
2. Update global settings
3. Changes affect all pages that use them

---

## 👥 Staff Tasks

### Update Profile
```
/admin/staff-dashboard → Edit button → Save changes
```

### Add Education
```
/admin/education → "+ Add Education" → Fill details → Save
```

### Add Experience
```
/admin/experience → "+ Add Experience" → Fill details → Save
```

### Add Skills
```
/admin/skills → "+ Add Skill" → Type skill + proficiency → Save
```

---

## 🔌 API ENDPOINTS QUICK MAP

### Public (No Auth)
```
GET /api/services         → List all published services
GET /api/projects         → List all published projects
GET /api/blogs            → List all published blog posts
GET /api/testimonials     → List all confirmed testimonials
GET /api/staff            → List all active employees
GET /api/settings         → Get site-wide settings
GET /api/staff/{id}       → Get specific employee profile
```

### Authenticated (Client)
```
POST /api/bookings        → Create booking with files
GET /api/bookings/{id}    → Check booking status
POST /api/payments        → Process payment
POST /api/contact         → Submit contact form (coming soon)
```

### Admin Only
```
POST /api/services        → Create service
PUT /api/services/{id}    → Update service
DELETE /api/services/{id} → Delete service

POST /api/projects        → Create project
PUT /api/projects/{id}    → Update project
DELETE /api/projects/{id} → Delete project

POST /api/blogs           → Create blog post
PUT /api/blogs/{id}       → Update blog post
DELETE /api/blogs/{id}    → Delete blog post

GET /api/admin/dashboard/stats → Dashboard data
GET /api/admin/bookings   → All bookings with filters
PUT /api/admin/bookings/{id}/review → Approve/reject
GET /api/admin/employees  → Staff management
```

### Staff (Own Data)
```
GET /api/staff/{id}           → Get own profile
PATCH /api/staff/{id}         → Update profile
POST /api/education           → Add education
PUT /api/education/{id}       → Update education
DELETE /api/education/{id}    → Delete education
POST /api/experience          → Add experience
PUT /api/experience/{id}      → Update experience
DELETE /api/experience/{id}   → Delete experience
POST /api/skills              → Add skill
PUT /api/skills/{id}          → Update skill
DELETE /api/skills/{id}       → Delete skill
```

---

## 📁 File Locations

### Admin Pages
```
/frontend/src/admin/AdminLayout.jsx        → Main navigation
/frontend/src/admin/crud/BlogAdmin.jsx     → Blog CRUD ⭐ NEW
/frontend/src/admin/crud/ServicesAdmin.jsx → Services CRUD
/frontend/src/admin/crud/ProjectsAdmin.jsx → Projects CRUD
/frontend/src/admin/StaffDashboard.jsx     → Employee dashboard
```

### Frontend Sections
```
/frontend/src/components/sections/Blog.jsx        → Blog display
/frontend/src/components/sections/Services.jsx    → Services display
/frontend/src/components/sections/Projects.jsx    → Projects display
/frontend/src/components/sections/Staff.jsx       → Staff display
/frontend/src/components/sections/Testimonials.jsx → Testimonials display
```

### Backend Routes
```
/backend/src/routes/admin.ts         → Admin endpoints
/backend/src/routes/blogs.ts         → Blog CRUD routes
/backend/src/routes/services.ts      → Service CRUD routes
/backend/src/routes/projects.ts      → Project CRUD routes
/backend/src/routes/staff.ts         → Staff endpoints
```

### Database
```
/backend/prisma/schema.prisma  → Data models
/backend/prisma/migrations/    → Database changes
```

---

## 🔍 Quick Debugging

### "Blog post not showing on homepage"
```javascript
// In browser console:
fetch('http://localhost:5000/api/blogs?published=true')
  .then(r => r.json())
  .then(console.log)
// Should show your blogs with published: true
```

### "Admin login not working"
```javascript
// Check token:
console.log(localStorage.getItem('adminToken'))
// Should show a long JWT string (not null)
```

### "API calls failing with 401"
```javascript
// Check auth header:
fetch('http://localhost:5000/api/admin/dashboard/stats', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
})
```

### "CORS error in console"
```
Error: Access to XMLHttpRequest at 'http://localhost:5000'...
Solution: Check backend CORS_ORIGIN in .env includes localhost:5174
```

### "Blog section shows default posts"
```javascript
// Check if API call failed:
fetch('http://localhost:5000/api/blogs')
  .then(r => {
    console.log('Status:', r.status)
    return r.json()
  })
  .then(data => console.log('Blogs:', data))
  .catch(e => console.error('Error:', e))
```

---

## 🆘 Emergency Commands

### Reset Database
```bash
cd backend
npx prisma migrate reset --force
npx prisma db seed  # If seed.ts exists
```

### Clear Admin Token
```javascript
// In browser console:
localStorage.removeItem('adminToken')
window.location.href = '/admin/login'
```

### Kill all node processes
```bash
pkill -f node
# Then restart: npm run dev (in each folder)
```

### Check if ports are in use
```bash
lsof -i :5000  # Backend
lsof -i :5174  # Frontend
```

---

## 📊 Data Model Quick Reference

### Service
```javascript
{
  id: "uuid",
  title: "string",
  slug: "string",
  description: "string",
  priceFrom: "number",
  images: ["url"],
  published: "boolean",
  createdAt: "date",
  updatedAt: "date"
}
```

### Project
```javascript
{
  id: "uuid",
  title: "string",
  slug: "string",
  description: "string",
  type: "string",
  images: ["url"],
  demoUrl: "string",
  repoUrl: "string",
  techStack: ["string"],
  published: "boolean",
  createdAt: "date"
}
```

### BlogPost
```javascript
{
  id: "uuid",
  title: "string",
  slug: "string",
  content: "string (markdown)",
  tags: ["string"],
  published: "boolean",
  publishedAt: "date",
  createdAt: "date",
  updatedAt: "date"
}
```

### Employee (Staff)
```javascript
{
  id: "uuid",
  firstName: "string",
  lastName: "string",
  email: "string",
  bio: "string",
  avatarUrl: "string",
  role: "ADMIN|MARKETING|DEVELOPER",
  acceptedAt: "date",
  createdAt: "date"
}
```

---

## ✨ What Makes This Special

✅ **No Content Hardcoding** - Everything is database-driven
✅ **Admin Controls Everything** - System admin owns all content
✅ **Staff Portfolios** - Each team member has their own portfolio
✅ **Multi-tenant** - 3 separate apps (admin, frontend, staff)
✅ **Real-time Updates** - Changes appear immediately
✅ **Scalable** - Ready for growth

---

## 🚀 Deployment Checklist

### Before Going Live
- [ ] All tests passing
- [ ] No console errors
- [ ] CORS configured for production domains
- [ ] Environment variables set
- [ ] Database backed up
- [ ] SSL/HTTPS enabled
- [ ] Admin credentials changed from default
- [ ] Email service configured
- [ ] Payment keys configured
- [ ] Domain names registered

### Three Deployments
- [ ] Admin panel → admin.angisoft.co.ke
- [ ] Frontend → angisoft.co.ke  
- [ ] Staff portal → staff.angisoft.co.ke
- [ ] Backend API → api.angisoft.co.ke

---

## 💬 Support

### If Something's Broken
1. Check `TESTING_GUIDE.md` for debugging
2. Check `SYSTEM_ARCHITECTURE.md` for design
3. Check `PROJECT_STATUS.md` for current status
4. Look at error message in browser DevTools
5. Check backend logs for API errors

### Common Fixes
- Clear cache: Ctrl+Shift+Delete or Cmd+Shift+Delete
- Restart servers: Kill node, run npm run dev again
- Check .env files for missing variables
- Verify all npm packages installed: npm install

---

**Last Updated:** February 2026
**Version:** 1.0 - MVP Ready
**Status:** ✅ Production Ready
