import { useEffect, useState, lazy, Suspense } from "react";
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
import AppLayout from "./layouts/AppLayout";
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
const EducationAdmin = lazy(() => import('./admin/crud/EducationAdmin'));
const ExperienceAdmin = lazy(() => import('./admin/crud/ExperienceAdmin'));
const ContactsAdmin = lazy(() => import('./admin/crud/ContactsAdmin'));
const TestimonialsAdmin = lazy(() => import('./admin/crud/TestimonialsAdmin'));
const HobbiesAdmin = lazy(() => import('./admin/crud/HobbiesAdmin'));
const InterestsAdmin = lazy(() => import('./admin/crud/InterestsAdmin'));
const SocialMediaAdmin = lazy(() => import('./admin/crud/SocialMediaAdmin'));
const QuotesAdmin = lazy(() => import('./admin/crud/QuotesAdmin'));

const AdminProtectedLayout = ({ theme, toggleTheme }) => {
  const isLoggedIn = !!localStorage.getItem('adminToken');
  if (!isLoggedIn) return <Navigate to="/admin/login" replace />;
  return (
    <AdminLayout theme={theme} toggleTheme={toggleTheme}>
      <Suspense fallback={<div>Loading...</div>}>
        <Outlet />
      </Suspense>
    </AdminLayout>
  );
};

const RoutesComponent = () => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return systemPrefersDark ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <Router>
      <Routes>
        {/* User routes */}
        <Route path="/*" element={<AppLayout theme={theme} toggleTheme={toggleTheme} />} >
          <Route index element={<Home theme={theme} />} />
          <Route path="projects" element={<ProjectLists theme={theme} />} />
          <Route path="services" element={<ServicesList theme={theme} />} />
          <Route path="service/:slug" element={<ServiceDetail theme={theme} />} />
          <Route path="project/:id" element={<ProjectDetails theme={theme} />} />
          <Route path="staff" element={<StaffList theme={theme} />} />
          <Route path="staff/:id" element={<StaffDetail theme={theme} />} />
          <Route path="testimonials" element={<TestimonialsList theme={theme} />} />
          <Route path="book" element={<Booking theme={theme} />} />
          <Route path="booking/:id" element={<BookingStatus theme={theme} />} />
          <Route path="*" element={<NotFound theme={theme} />} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminLogin theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/admin" element={<AdminProtectedLayout theme={theme} toggleTheme={toggleTheme} />}>
          <Route index element={<EnhancedAdminDashboard theme={theme}/>} />
          <Route path="bookings" element={<BookingsManagement theme={theme}/>} />
          <Route path="bookings/:id" element={<BookingsManagement theme={theme}/>} />
          <Route path="staff" element={<StaffManagement theme={theme}/>} />
          <Route path="staff-dashboard" element={<StaffDashboard theme={theme}/>} />
          <Route path="upload-manager" element={<FileUploadManager theme={theme}/>} />
          <Route path="about" element={<AboutAdmin theme={theme}/>} />
          <Route path="projects" element={<ProjectsAdmin theme={theme}/>} />
          <Route path="skills" element={<SkillsAdmin theme={theme}/>} />
          <Route path="services" element={<ServicesAdmin theme={theme}/>} />
          <Route path="education" element={<EducationAdmin theme={theme}/>} />
          <Route path="experience" element={<ExperienceAdmin theme={theme}/>} />
          <Route path="contacts" element={<ContactsAdmin theme={theme}/>} />
          <Route path="testimonials" element={<TestimonialsAdmin theme={theme}/>} />
          <Route path="upload" element={<FileUpload theme={theme}/>} />
          <Route path="hobbies" element={<HobbiesAdmin theme={theme}/>} />
          <Route path="interests" element={<InterestsAdmin theme={theme}/>} />
          <Route path="social-media" element={<SocialMediaAdmin theme={theme}/>} />
          <Route path="quotes" element={<QuotesAdmin theme={theme}/>} />
          <Route path="system" element={<SystemPanel theme={theme}/>} />
          <Route path="*" element={<NotFoundAdmin theme={theme}/>} />
        </Route>
      </Routes>
    </Router>
  );
};

export default RoutesComponent;