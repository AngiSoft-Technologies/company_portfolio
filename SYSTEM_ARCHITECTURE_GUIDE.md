# System Architecture & Navigation Guide

## Table of Contents
1. [How the System is Rendered](#how-the-system-is-rendered)
2. [Accessing the Admin Panel](#accessing-the-admin-panel)
3. [Public Pages (Default Routes)](#public-pages-default-routes)
4. [Layout Structure](#layout-structure)
5. [Navigation System](#navigation-system)
6. [Dynamic Data Display](#dynamic-data-display)
7. [UI State Management](#ui-state-management)

---

## How the System is Rendered

### Entry Point Flow

```
index.html
  └── <div id="root"></div>
        └── main.jsx (React 18 createRoot)
              └── App.jsx
                    └── RoutesComponent (routes.jsx)
                          └── React Router
                                ├── Public Routes (AppLayout)
                                └── Admin Routes (AdminLayout)
```

### Detailed Rendering Process

1. **`index.html`**: Contains the root `<div id="root">` element
2. **`main.jsx`**: 
   - Uses React 18's `createRoot` API
   - Wraps the app in:
     - `React.StrictMode` (development checks)
     - `ErrorBoundary` (catches React errors)
     - `ToastContainer` (global notifications)
   - Renders `<App />` component

3. **`App.jsx`**: Simple wrapper that renders `<RoutesComponent />`

4. **`routes.jsx`**: 
   - **Manages global theme state** (light/dark mode)
   - **Initializes React Router** (`BrowserRouter`)
   - **Defines two route groups**:
     - Public routes (wrapped in `AppLayout`)
     - Admin routes (wrapped in `AdminLayout`)

### Theme Management

The theme is managed at the **`RoutesComponent` level** and:
- Persists to `localStorage` (key: `"theme"`)
- Falls back to system preference if no saved theme
- Applies theme class to `document.documentElement`
- Passes `theme` and `toggleTheme` as props to all child components

---

## Accessing the Admin Panel

### Admin Login Route

**URL**: `/admin/login`

- **Public route** (no authentication required)
- Component: `AdminLogin.jsx`
- Features:
  - Email/password login
  - "Forgot Password" functionality
  - Theme toggle
  - Stores JWT token in `localStorage` as `'adminToken'`

### Admin Protected Routes

**Base URL**: `/admin/*`

All admin routes are protected by `AdminProtectedLayout` which:
1. Checks for `localStorage.getItem('adminToken')`
2. If no token → redirects to `/admin/login`
3. If token exists → renders `AdminLayout` with sidebar navigation

### Available Admin Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/admin` | `EnhancedAdminDashboard` | Main dashboard (stats, overview) |
| `/admin/bookings` | `BookingsManagement` | Manage booking requests |
| `/admin/staff` | `StaffManagement` | Manage staff members |
| `/admin/staff-dashboard` | `StaffDashboard` | Staff self-service dashboard |
| `/admin/upload-manager` | `FileUploadManager` | File upload management |
| `/admin/services` | `ServicesAdmin` | Manage services (lazy loaded) |
| `/admin/projects` | `ProjectsAdmin` | Manage projects (lazy loaded) |
| `/admin/about` | `AboutAdmin` | Manage about content (lazy loaded) |
| `/admin/skills` | `SkillsAdmin` | Manage skills (lazy loaded) |
| `/admin/education` | `EducationAdmin` | Manage education (lazy loaded) |
| `/admin/experience` | `ExperienceAdmin` | Manage experience (lazy loaded) |
| `/admin/contacts` | `ContactsAdmin` | Manage contacts (lazy loaded) |
| `/admin/testimonials` | `TestimonialsAdmin` | Manage testimonials (lazy loaded) |
| `/admin/system` | `SystemPanel` | System settings |

### Admin Layout Features

- **Sidebar Navigation**: Collapsible menu with all admin sections
- **Top Bar**: 
  - User info
  - Notifications dropdown
  - Messages dropdown
  - Theme toggle
  - Logout button
- **Lazy Loading**: Admin CRUD components are code-split for performance

---

## Public Pages (Default Routes)

### Default Route (Homepage)

**URL**: `/` or root domain

- Component: `Home.jsx`
- Layout: `AppLayout` (Header + Footer)
- Sections displayed:
  1. `Hero` - Company introduction
  2. `About` - Company information
  3. `Services` - Featured services
  4. `Staff` - Featured team members
  5. `Projects` - Featured projects
  6. `Education` - Education section
  7. `Experience` - Experience section
  8. `Skills` - Skills showcase
  9. `Contact` - Contact form

### Public Route Structure

All public routes are nested under `AppLayout` which provides:
- **Header** (`Header.jsx`): Logo, navigation, theme toggle
- **Main Content** (`<Outlet />`): Dynamic page content
- **Footer** (`Footer.jsx`): Company info, links

### Available Public Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Home` | Homepage with all sections |
| `/projects` | `ProjectLists` | List all published projects |
| `/project/:id` | `ProjectDetails` | Individual project detail page |
| `/services` | `ServicesList` | List all published services |
| `/service/:slug` | `ServiceDetail` | Individual service detail page |
| `/staff` | `StaffList` | List all staff members |
| `/staff/:id` | `StaffDetail` | Individual staff portfolio page |
| `/testimonials` | `TestimonialsList` | List all testimonials |
| `/book` | `Booking` | Multi-step booking form |
| `/booking/:id` | `BookingStatus` | Track booking status & payments |
| `/*` (catch-all) | `NotFound` | 404 error page |

---

## Layout Structure

### AppLayout (Public Pages)

```jsx
<AppLayout>
  <Header />          {/* Sticky top navigation */}
  <main>
    <Outlet />        {/* Dynamic page content */}
  </main>
  <Footer />          {/* Bottom footer */}
</AppLayout>
```

**File**: `frontend/src/layouts/AppLayout.jsx`

**Features**:
- Consistent header/footer across all public pages
- Theme-aware styling
- Responsive design

### AdminLayout (Admin Pages)

```jsx
<AdminLayout>
  <Sidebar />         {/* Collapsible navigation */}
  <TopBar />          {/* User info, notifications */}
  <main>
    <Outlet />        {/* Admin page content */}
  </main>
</AdminLayout>
```

**File**: `frontend/src/admin/AdminLayout.jsx`

**Features**:
- Sidebar navigation with icons
- Notification system
- Message system
- User profile dropdown
- Theme toggle
- Logout functionality

---

## Navigation System

### Public Navigation

**Component**: `NavBar.jsx` (used in `Header.jsx`)

**Navigation Links**:
- `#introduction` - Scroll to hero section
- `#about` - Scroll to about section
- `/services` - Services listing page
- `/staff` - Team listing page
- `/projects` - Projects listing page
- `/book` - Booking form
- `#contact-me` - Scroll to contact section

**Navigation Features**:
- Desktop: Horizontal menu (hidden on mobile)
- Mobile: Hamburger menu → Sidebar (`SideBar.jsx`)
- Theme-aware styling
- Active link highlighting

### Admin Navigation

**Component**: `AdminLayout.jsx` sidebar

**Navigation Items**:
- Dashboard
- Bookings
- Staff Management
- My Dashboard (staff self-service)
- Services
- Projects
- File Upload
- About, Skills, Education, Experience
- Contacts, Testimonials
- Hobbies, Interests, Social Media, Quotes
- System Panel

**Navigation Features**:
- Collapsible sidebar
- Icon-based navigation
- Active route highlighting
- Responsive (hides on mobile, shows hamburger)

### Programmatic Navigation

Uses **React Router's `useNavigate` hook**:

```jsx
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/projects');           // Navigate to route
navigate('/project/123');         // Navigate with params
navigate(-1);                     // Go back
```

---

## Dynamic Data Display

### Data Fetching Pattern

All pages follow a consistent pattern:

```jsx
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await apiGet('/endpoint');
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, [dependencies]);
```

### API Client

**File**: `frontend/src/js/httpClient.js`

**Features**:
- Centralized API calls
- Automatic token injection (`Authorization: Bearer <token>`)
- Error handling with toast notifications
- Base URL configuration (`VITE_API_BASE_URL`)
- Automatic 401 redirect to login

**Methods**:
- `apiGet(url)` - GET request
- `apiPost(url, data)` - POST request
- `apiPut(url, data)` - PUT request
- `apiPatch(url, data)` - PATCH request
- `apiDelete(url)` - DELETE request

### Data Flow Example: Project Details

```
User clicks project card
  └── navigate('/project/:id')
        └── ProjectDetails component mounts
              └── useEffect triggers
                    └── apiGet('/projects/:id')
                          └── Backend API
                                └── Prisma query
                                      └── Database
                                            └── Response
                                                  └── setProject(data)
                                                        └── Component re-renders
                                                              └── Display project details
```

### Filtering & Pagination

- **Filtering**: Done client-side (e.g., `data.filter(p => p.published !== false)`)
- **Pagination**: Utility functions in `frontend/src/utils/pagination.js`
- **Search**: `SearchBar` component for filtering lists

---

## UI State Management

### State Management Strategy

The system uses **React's built-in state management** (no Redux/Zustand):

1. **Local Component State** (`useState`)
   - Component-specific data
   - Form inputs
   - Loading/error states
   - UI toggles (modals, dropdowns)

2. **URL State** (React Router)
   - Current route
   - Route parameters (`:id`, `:slug`)
   - Query parameters

3. **LocalStorage** (Browser Storage)
   - Theme preference (`"theme"`)
   - Authentication token (`"adminToken"`)
   - User preferences
   - Temporary data (e.g., `"lastBookingId"`)

4. **Props Drilling**
   - Theme passed from `RoutesComponent` → Layouts → Pages → Components
   - Consistent theming across entire app

### State Management Examples

#### 1. Theme State (Global)

```jsx
// routes.jsx
const [theme, setTheme] = useState(() => {
  const saved = localStorage.getItem("theme");
  return saved || (systemPrefersDark ? "dark" : "light");
});

// Persists to localStorage on change
useEffect(() => {
  localStorage.setItem("theme", theme);
  document.documentElement.classList.add(theme);
}, [theme]);
```

#### 2. Component State (Local)

```jsx
// ProjectDetails.jsx
const [project, setProject] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
```

#### 3. Form State

```jsx
// Booking.jsx
const [formData, setFormData] = useState({
  name: '',
  email: '',
  // ... more fields
});

const [currentStep, setCurrentStep] = useState(1);
```

#### 4. Authentication State

```jsx
// AdminProtectedLayout
const isLoggedIn = !!localStorage.getItem('adminToken');
```

### State Updates Flow

```
User Action
  └── Event Handler
        └── setState() / API Call
              └── Component Re-render
                    └── UI Updates
```

### Loading States

- **Loading Spinners**: `LoadingSpinner.jsx` component
- **Skeleton Screens**: Placeholder content while loading
- **Error States**: Error messages with retry buttons

### Error Handling

- **Error Boundaries**: `ErrorBoundary.jsx` catches React errors
- **API Errors**: Handled in `httpClient.js` with toast notifications
- **Form Validation**: `validation.js` utilities + Yup schemas

---

## Key Files Reference

### Routing & Layout
- `frontend/src/routes.jsx` - All route definitions
- `frontend/src/layouts/AppLayout.jsx` - Public page layout
- `frontend/src/admin/AdminLayout.jsx` - Admin page layout

### Navigation
- `frontend/src/components/sections/Header.jsx` - Public header
- `frontend/src/components/sections/NavBar.jsx` - Public navigation
- `frontend/src/components/SideBar.jsx` - Mobile sidebar

### State & Data
- `frontend/src/js/httpClient.js` - API client
- `frontend/src/utils/toast.js` - Toast notifications
- `frontend/src/utils/validation.js` - Form validation

### Entry Points
- `frontend/src/main.jsx` - React app entry
- `frontend/src/App.jsx` - Root component

---

## Quick Start Guide

### Accessing Public Site
1. Navigate to root URL: `http://localhost:5173/` (or production domain)
2. Homepage displays automatically
3. Use navigation menu to browse sections

### Accessing Admin Panel
1. Navigate to: `http://localhost:5173/admin/login`
2. Enter admin credentials (email/password)
3. Upon login, redirected to `/admin` dashboard
4. Use sidebar to navigate admin sections

### Development
```bash
# Frontend
cd frontend
npm run dev        # Starts Vite dev server (usually :5173)

# Backend
cd backend
npm run dev        # Starts Express server (usually :5000)
```

---

## Summary

- **Rendering**: React 18 → App → Routes → Layouts → Pages
- **Admin Access**: `/admin/login` → authenticate → `/admin/*`
- **Public Pages**: Root `/` → AppLayout → Home/Projects/Services/etc.
- **Layout**: Two layouts (AppLayout for public, AdminLayout for admin)
- **Navigation**: Header nav (public) + Sidebar nav (admin)
- **Data**: API calls via `httpClient.js`, state via `useState`
- **State**: Local state + localStorage + URL params

The system is designed for **separation of concerns**: public and admin areas are completely separate, with shared utilities (API client, theme) but independent layouts and navigation.

