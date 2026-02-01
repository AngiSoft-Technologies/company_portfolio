# 🧪 Testing Guide - AngiSoft Admin CMS System

## ✅ What's Been Completed

### Backend (Express + Prisma)
- ✅ All CRUD endpoints for Services, Projects, Blogs, Testimonials
- ✅ Admin routes for dashboard, bookings, employees, settings
- ✅ Staff routes for employee profiles and personal data
- ✅ Authentication middleware with role-based access
- ✅ Payment and booking management
- ✅ File upload handlers

### Frontend (React + Vite)
- ✅ BlogAdmin.jsx - Complete blog management interface
- ✅ Admin navigation with all management pages
- ✅ httpClient with automatic auth token attachment
- ✅ All frontend sections (Blog, Services, Projects, Staff, Testimonials) fetch from backend APIs
- ✅ Staff dashboard for personal portfolio management
- ✅ Admin dashboard with statistics

### Integration
- ✅ All section components call correct API endpoints
- ✅ Admin forms POST/PUT/DELETE to correct endpoints
- ✅ Frontend displays admin-created content
- ✅ Staff can manage their own portfolios

---

## 🚀 Quick Start Testing

### Prerequisites
```bash
# Terminal 1: Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
# Should see: Server running on http://localhost:5000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
# Should see: http://localhost:5174
```

---

## 📝 Test Scenarios

### Test 1: Create a Blog Post (Admin)

**Steps:**
```
1. Open http://localhost:5174/admin/login
2. Enter admin credentials (check backend for seed data)
3. Click "Blog Posts" in sidebar (under "Content" section)
4. Click "+ New Blog Post"
5. Fill in:
   - Title: "My First Blog Post"
   - Slug: "my-first-blog"
   - Content: "This is an exciting blog post about web development!"
   - Tags: "web, development, angisoft"
   - Published: ✓ (checked)
6. Click "Create"
```

**Expected Result:**
- ✅ Success message appears
- ✅ New blog post appears in the table
- ✅ Close modal and see post in list
- ✅ Refresh page and post still there (persisted to DB)

**Verify in Browser Console:**
```javascript
// In Developer Tools Console, copy-paste:
fetch('http://localhost:5000/api/blogs').then(r => r.json()).then(console.log)
// Should show your new blog post
```

---

### Test 2: View Blog Post on Homepage (Client)

**Steps:**
```
1. Go to http://localhost:5174 (homepage)
2. Scroll to "Latest Insights" (Blog section)
3. Look for your newly created blog post
4. Check the title, excerpt, tags are visible
```

**Expected Result:**
- ✅ Your blog post appears in the blog section
- ✅ Title and content are displayed
- ✅ Tags show correctly
- ✅ If you unpublish it in admin, it disappears from homepage

**Verify in Browser Console:**
```javascript
// Check what the Blog section fetched
fetch('http://localhost:5000/api/blogs').then(r => r.json()).then(d => {
  console.log('Total blogs:', d.length);
  console.log('Published:', d.filter(b => b.published));
})
```

---

### Test 3: Edit Blog Post (Admin)

**Steps:**
```
1. Go to /admin/blog
2. Find your blog post in the table
3. Click "Edit" button
4. Change the title to "My Updated Blog Post"
5. Click "Update"
```

**Expected Result:**
- ✅ Success message
- ✅ Title in table updates immediately
- ✅ Go to homepage, blog section shows updated title

---

### Test 4: Delete Blog Post (Admin)

**Steps:**
```
1. Go to /admin/blog
2. Find your blog post
3. Click "Delete"
4. Confirm in dialog: "Are you sure?"
5. Click "Delete" again
```

**Expected Result:**
- ✅ Success message
- ✅ Post disappears from table
- ✅ Homepage blog section no longer shows the post
- ✅ Verify with: `fetch('http://localhost:5000/api/blogs').then(r => r.json()).then(console.log)`

---

### Test 5: Admin Creates a Service (Verify Existing Flow)

**Steps:**
```
1. Go to /admin/services
2. Click "+ New Service"
3. Fill in:
   - Service Name: "AI Consulting"
   - Description: "Expert consultation on AI integration"
4. Click "Add"
```

**Expected Result:**
- ✅ Service appears in table
- ✅ Go to homepage > Services section
- ✅ New service appears in the grid
- ✅ Frontend displays the service card

---

### Test 6: Staff Updates Their Profile

**Steps:**
```
1. Go to /admin/staff-dashboard
2. Logout if logged in as admin
3. Login with staff credentials (need employee email/password)
4. See your profile information
5. Click "Edit" on Bio section
6. Update your bio to something descriptive
7. Click "Save"
```

**Expected Result:**
- ✅ Success message
- ✅ Bio displays in dashboard
- ✅ Go to homepage > Staff section
- ✅ Your updated bio shows in your profile card

---

### Test 7: Full Data Flow Verification

**Steps:**
```bash
# Terminal 3: Check what frontend fetches
1. Open browser DevTools → Network tab
2. Go to http://localhost:5174
3. Watch for these API calls:
   - GET /api/services → Should return services
   - GET /api/projects → Should return projects
   - GET /api/blogs → Should return blogs
   - GET /api/staff → Should return employees
   - GET /api/testimonials → Should return testimonials
4. Click each response tab to see the JSON
```

**Expected Result:**
- ✅ All API calls succeed (200 status)
- ✅ Data is valid JSON
- ✅ `published: true` filter applied for services/projects/blogs
- ✅ Staff shows `acceptedAt` (employees who accepted invites)

---

### Test 8: Authentication Flow

**Steps:**
```
1. Open http://localhost:5174/admin/login
2. Enter admin email and password
3. Click "Login"
4. Wait for redirect to /admin dashboard
5. Open DevTools → Application → Local Storage
6. Check: `adminToken` is set
7. Go back to /admin/services
8. Logout and try accessing /admin
9. Should redirect to /admin/login
```

**Expected Result:**
- ✅ Login works, redirects to dashboard
- ✅ `adminToken` appears in localStorage
- ✅ httpClient automatically adds it to API requests
- ✅ Logout clears token
- ✅ Protected routes inaccessible without token

---

## 🔍 Debugging Tips

### If Blog API calls fail (404)

```bash
# Check that backend has blogs route
cd backend
grep -n "app.use.*blogs" src/app.ts
# Should show: app.use('/api/blogs', blogsRouter());

# Check route is exported
grep -n "blogsRouter" src/app.ts
# Should show the import
```

### If frontend doesn't display data

```javascript
// In browser console, manually test the API:
const token = localStorage.getItem('adminToken');
fetch('http://localhost:5000/api/blogs', {
  headers: token ? { 'Authorization': `Bearer ${token}` } : {}
})
.then(r => r.json())
.then(data => console.log('Blogs:', data))
.catch(e => console.error('Error:', e))

// If CORS error, check backend CORS config in src/app.ts
```

### If admin can't create items

```javascript
// Check what error the API returns:
fetch('http://localhost:5000/api/blogs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
  },
  body: JSON.stringify({
    title: 'Test',
    slug: 'test',
    content: 'Test content',
    published: true
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

---

## 📊 Test Results Template

Copy and fill this in as you test:

```markdown
## My Test Results - [DATE]

### Backend Status
- [ ] Services API working
- [ ] Projects API working
- [ ] Blogs API working
- [ ] Testimonials API working
- [ ] Staff API working
- [ ] Admin routes working
- [ ] Auth working

### Frontend Status
- [ ] Admin login working
- [ ] BlogAdmin page loads
- [ ] Can create blog post
- [ ] Blog post appears in table
- [ ] Blog appears on homepage
- [ ] Blog edits work
- [ ] Blog deletes work

### Integration Status
- [ ] Admin creates service → appears on frontend
- [ ] Admin creates project → appears on frontend
- [ ] Admin creates blog → appears on frontend
- [ ] Staff updates profile → appears on homepage
- [ ] API calls in DevTools show correct data

### Issues Found
1. [Issue]
   - Location: [file path]
   - Error: [exact error message]
   - Fix: [attempted solution]
   - Status: [Fixed / Investigating / Blocked]

---
```

---

## 🔐 Security Testing (Advanced)

### Test Unauthorized Access
```javascript
// Try to call admin endpoint without token:
fetch('http://localhost:5000/api/admin/dashboard/stats')
.then(r => r.json())
.then(console.log)
// Should return 401 Unauthorized

// Try with invalid token:
fetch('http://localhost:5000/api/admin/dashboard/stats', {
  headers: { 'Authorization': 'Bearer invalid-token' }
})
.then(r => r.json())
.then(console.log)
// Should return 401 Unauthorized
```

### Test CORS
```javascript
// CORS should only allow certain origins:
// From different domain in console:
fetch('http://localhost:5000/api/services')
// Should work (public endpoint)

fetch('http://localhost:5000/api/admin/dashboard/stats')
// Should fail (requires auth)
```

---

## 📝 Next Steps After Testing

If all tests pass:
1. ✅ BlogAdmin is fully functional
2. ✅ Admin-to-backend flow verified
3. ✅ Backend-to-frontend flow verified
4. ✅ Ready to build contact messages endpoint
5. ✅ Ready to configure CORS for production domains
6. ✅ Ready to deploy to admin.angisoft.co.ke

---

## 📞 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **404 on /api/blogs** | Check backend app.ts has `app.use('/api/blogs', blogsRouter())` |
| **Blog form won't submit** | Check browser console for error, verify httpClient token |
| **Blog doesn't appear on homepage** | Verify `published: true` in admin, refresh page |
| **CORS error** | Add frontend domain to backend CORS_ORIGIN in .env |
| **Login fails** | Check admin credentials, verify JWT_SECRET set in .env |
| **Images don't load** | Check image paths in admin forms match `/images/*` pattern |

---

