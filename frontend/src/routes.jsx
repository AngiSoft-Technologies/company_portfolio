import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import ProjectDetails from "./pages/ProjectDetails";
import ProjectLists from "./pages/ProjectLists";
import ServicesList from "./pages/ServicesList";
import TestimonialsList from "./pages/TestimonialsList";
import Booking from "./pages/Booking";
import BookingStatus from "./pages/BookingStatus";
import StaffList from "./pages/StaffList";
import StaffDetail from "./pages/StaffDetail";
import ServiceDetail from "./pages/ServiceDetail";
import BlogList from "./pages/BlogList";
import BlogDetail from "./pages/BlogDetail";import NewsletterConfirm from './pages/NewsletterConfirm';
import NewsletterUnsubscribe from './pages/NewsletterUnsubscribe';import AppLayout from "./layouts/AppLayout";
import AdminLogin from './admin/AdminLogin';
import AdminLayout from './admin/AdminLayout';
import FileUpload from './admin/FileUpload';
import EnhancedAdminDashboard from './admin/EnhancedAdminDashboard';
import BookingsManagement from './admin/BookingsManagement';
import StaffManagement from './admin/StaffManagement';
import FileUploadManager from './admin/FileUploadManager';
import StaffDashboard from './admin/StaffDashboard';
import NotFoundAdmin from './admin/NotFoundAdmin';
import SystemPanel from './admin/SystemPanel';

const AboutAdmin = lazy(() => import('./admin/crud/AboutAdmin'));
const ProjectsAdmin = lazy(() => import('./admin/crud/ProjectsAdmin'));
const SkillsAdmin = lazy(() => import('./admin/crud/SkillsAdmin'));
const ServicesAdmin = lazy(() => import('./admin/crud/ServicesAdmin'));
const ServiceCategoriesAdmin = lazy(() => import('./admin/crud/ServiceCategoriesAdmin'));
const BlogAdmin = lazy(() => import('./admin/crud/BlogAdmin'));
const EducationAdmin = lazy(() => import('./admin/crud/EducationAdmin'));
const ExperienceAdmin = lazy(() => import('./admin/crud/ExperienceAdmin'));
const ContactsAdmin = lazy(() => import('./admin/crud/ContactsAdmin'));
const TestimonialsAdmin = lazy(() => import('./admin/crud/TestimonialsAdmin'));
const HobbiesAdmin = lazy(() => import('./admin/crud/HobbiesAdmin'));
const InterestsAdmin = lazy(() => import('./admin/crud/InterestsAdmin'));
const SocialMediaAdmin = lazy(() => import('./admin/crud/SocialMediaAdmin'));
const QuotesAdmin = lazy(() => import('./admin/crud/QuotesAdmin'));
const SiteSettingsAdmin = lazy(() => import('./admin/crud/SiteSettingsAdmin'));
const ChatConversationsAdmin = lazy(() => import('./admin/crud/ChatConversationsAdmin'));

const AdminProtectedLayout = () => {
  const isLoggedIn = !!localStorage.getItem('adminToken');
  if (!isLoggedIn) return <Navigate to="/admin/login" replace />;
  return (
    <AdminLayout>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Loading...</div>}>
        <Outlet />
      </Suspense>
    </AdminLayout>
  );
};

const RoutesComponent = () => {
  return (
    <Router>
      <Routes>
        {/* User routes */}
        <Route path="/*" element={<AppLayout />} >
          <Route index element={<Home />} />
          <Route path="projects" element={<ProjectLists />} />
          <Route path="services" element={<ServicesList />} />
          <Route path="service/:slug" element={<ServiceDetail />} />
          <Route path="project/:id" element={<ProjectDetails />} />
          <Route path="staff" element={<StaffList />} />
          <Route path="staff/:id" element={<StaffDetail />} />
          <Route path="testimonials" element={<TestimonialsList />} />
          <Route path="blog" element={<BlogList />} />
          <Route path="blog/:id" element={<BlogDetail />} />
          <Route path="book" element={<Booking />} />
          <Route path="booking/:id" element={<BookingStatus />} />
          <Route path="newsletter/confirm" element={<NewsletterConfirm />} />
          <Route path="newsletter/unsubscribe" element={<NewsletterUnsubscribe />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminProtectedLayout />}>
          <Route index element={<EnhancedAdminDashboard />} />
          <Route path="bookings" element={<BookingsManagement />} />
          <Route path="bookings/:id" element={<BookingsManagement />} />
          <Route path="staff" element={<StaffManagement />} />
          <Route path="staff-dashboard" element={<StaffDashboard />} />
          <Route path="upload-manager" element={<FileUploadManager />} />
          <Route path="about" element={<AboutAdmin />} />
          <Route path="site-settings" element={<SiteSettingsAdmin />} />
          <Route path="projects" element={<ProjectsAdmin />} />
          <Route path="skills" element={<SkillsAdmin />} />
          <Route path="services" element={<ServicesAdmin />} />
          <Route path="service-categories" element={<ServiceCategoriesAdmin />} />
          <Route path="blog" element={<BlogAdmin />} />
          <Route path="education" element={<EducationAdmin />} />
          <Route path="experience" element={<ExperienceAdmin />} />
          <Route path="contacts" element={<ContactsAdmin />} />
          <Route path="testimonials" element={<TestimonialsAdmin />} />
          <Route path="upload" element={<FileUpload />} />
          <Route path="hobbies" element={<HobbiesAdmin />} />
          <Route path="interests" element={<InterestsAdmin />} />
          <Route path="social-media" element={<SocialMediaAdmin />} />
          <Route path="quotes" element={<QuotesAdmin />} />
          <Route path="chat-conversations" element={<ChatConversationsAdmin />} />
          <Route path="system" element={<SystemPanel />} />
          <Route path="*" element={<NotFoundAdmin />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default RoutesComponent;
