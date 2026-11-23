# 🧪 Testing Guide - AngiSoft Admin CMS System

> **🛠 OPERATIONAL** — Update for test DB isolation (Phase 0.5).<br>
> **Required (canonical plan `ANGISOFT_DIGITAL_HQ_PLAN.md` Phase 0.5):** `TEST_DATABASE_URL` env; integration tests rewritten to use isolated test DB; `pnpm test` never touches production Neon.

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
# From the repository root (pnpm workspace)
pnpm install
pnpm dev:backend    # API at http://localhost:5000
pnpm dev:web        # public site + client portal at http://localhost:5173
pnpm dev:admin      # staff ERP app at http://localhost:5174

# First backend setup only
cd backend && npx prisma generate && npm run prisma:migrate:dev
```

Both Vite apps proxy `/v1`, `/uploads` and `/socket.io` to the backend; leave `VITE_API_BASE_URL` unset in development and production. Access tokens are held in memory by `@angisoft/api-client` and the refresh cookie is `SameSite=Strict`, so browser calls stay same-origin.

---

## 📝 Test Scenarios

### Test 1: Create a Blog Post (Admin)

**Steps:**
```
1. Open http://localhost:5174/login
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
fetch('/v1/blogs').then(r => r.json()).then(console.log)
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
fetch('/v1/blogs').then(r => r.json()).then(d => {
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
- ✅ Verify with: `fetch('/v1/blogs').then(r => r.json()).then(console.log)`

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
   - GET /v1/services → Should return services
   - GET /v1/projects → Should return projects
   - GET /v1/blogs → Should return blogs
   - GET /v1/staff → Should return employees
   - GET /v1/testimonials → Should return testimonials
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
1. Open http://localhost:5174/login
2. Enter admin email and password
3. Click "Login"
4. Wait for redirect to the admin dashboard
5. In DevTools → Application → Cookies, confirm the refresh cookie is present
6. Confirm no access token is stored in localStorage/sessionStorage
7. Reload the page: the in-memory access token is rehydrated from the refresh cookie
8. Logout and try accessing a guarded route
9. Should redirect to /login
```

**Expected Result:**
- ✅ Login works and redirects to the dashboard
- ✅ Access token stays in memory; only the `SameSite=Strict` refresh cookie persists
- ✅ `@angisoft/api-client` attaches the access token and CSRF double-submit header
- ✅ Logout clears the cookie and in-memory session
- ✅ Protected routes are inaccessible without a valid session

---

## 🔍 Debugging Tips

### If Blog API calls fail (404)

```bash
# Check that backend has blogs route
cd backend
grep -n "app.use.*blogs" src/app.ts
# Should show: app.use('/v1/blogs', blogsRouter());

# Check route is exported
grep -n "blogsRouter" src/app.ts
# Should show the import
```

### If frontend doesn't display data

```javascript
// Public/same-origin smoke check (no token required):
fetch('/v1/blogs', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log('Blogs:', data))
  .catch(e => console.error('Error:', e))

// Authenticated requests are made by @angisoft/api-client from the app.
// Do not move access tokens into localStorage when reproducing a bug.
```

### If admin can't create items

```javascript
// Prefer reproducing through the admin UI so @angisoft/api-client supplies
// the in-memory access token and CSRF double-submit header. For a raw fetch:
const csrf = document.cookie.match(/(?:^|; )csrfToken=([^;]+)/)?.[1];
fetch('/v1/blogs', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    ...(csrf ? { 'x-csrf-token': decodeURIComponent(csrf) } : {})
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
fetch('/v1/admin/dashboard/stats')
.then(r => r.json())
.then(console.log)
// Should return 401 Unauthorized

// Try with invalid token:
fetch('/v1/admin/dashboard/stats', {
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
fetch('/v1/services')
// Should work (public endpoint)

fetch('/v1/admin/dashboard/stats')
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
| **404 on /v1/blogs** | Check backend app.ts has `app.use('/v1/blogs', blogsRouter())` |
| **Blog form won't submit** | Check browser console for error, verify httpClient token |
| **Blog doesn't appear on homepage** | Verify `published: true` in admin, refresh page |
| **CORS error** | Add frontend domain to backend CORS_ORIGIN in .env |
| **Login fails** | Check admin credentials, verify JWT_SECRET set in .env |
| **Images don't load** | Check image paths in admin forms match `/images/*` pattern |

---


---

## 🤖 Automated Browser E2E (Playwright)

The `e2e/` suite runs the real Vite dev servers (`web` :5173, `admin` :5174)
with every `/v1/**` call stubbed via `page.route` — no backend or database
required.

```bash
pnpm test:e2e                              # all specs (web + admin projects)
pnpm test:e2e -- --project=web             # public site + portal only
pnpm test:e2e -- e2e/tests/web-booking.spec.ts   # single spec file
```

Coverage: homepage hero + theme toggle, services/pricing/contact data
rendering, the 3-step booking submit → redirect, client-portal magic-link →
dashboard, admin login → dashboard, auth-guard redirect, payroll screen data,
and the admin theme toggle + profile persistence. Stub handlers live in
`e2e/fixtures/mockApi.ts` (`'METHOD /v1/path'` → JSON body, `*` suffix for
prefixes, `{status, body}` envelope for non-200s). The fixture intercepts both
`/v1/**` (what the apps actually call) and legacy `/api/**`; `grantClientConsent()`
seeds the consent record required by gated booking/portal routes.

**Verified 2026-11-23:** `pnpm test:e2e` → **30 passed** (15.5m original `/tmp/opencode/e2e-final2.out`; 22.2m final rerun, exit 0, `/tmp/opencode/final-gate/e2e_all.log`). The suite now includes `admin-route-theme-matrix.spec.ts`: all 82 guarded routes in `frontend/admin/src/app.tsx` are parsed at test time and swept under 3 theme scenarios (explicit light, explicit dark over a light OS, and no stored choice with alternating OS preference) = 246 route×theme checks in 18 chunk tests, plus 1 theme-persistence test. Each check asserts the admin shell mounts, the lazy route finishes, content renders, the route is unchanged, refresh-auth fired, critical CSS tokens resolve, the body paints from tokens, persisted theme is correct, no compiler/React overlay appears and no uncaught page errors occur. A previous failure
was caused by stubbing only `/api/**`, letting real requests through to empty
states; tests and fixtures were corrected rather than weakening assertions. The
per-test timeout is 120s (matrix chunks set 8m) and assertion timeout 30s to absorb Vite dev first-compile cost under two workers. The `/uploads` guarded route is served by Vite's HTML transform: both Vite dev proxies are scoped to `/uploads/public`, and the matrix no longer stubs raw `index.html` (which omitted the React-refresh preamble and broke the shell). Two consecutive full runs after those changes passed 30/30.
