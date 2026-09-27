import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AdminLogin } from '@/layouts/AdminLogin';
import { AdminLayout } from '@/layouts/AdminLayout';
import { NotFoundAdmin } from '@/layouts/NotFoundAdmin';
import { AdminProtectedLayout } from '@angisoft/auth';
import { EnhancedAdminDashboard, StaffDashboard } from '@/features/dashboard';
import { ContactsAdmin, ChatConversationsAdmin } from '@/features/crm';
import { ClientProjectsManagement, ProjectsAdmin } from '@/features/projects';
import { BookingsManagement } from '@/features/bookings';
import { BlogAdmin, ProductsAdmin, ServicesAdmin, ServiceCategoriesAdmin, HomeSectionsAdmin, SiteSettingsAdmin, FaqsAdmin, CareersAdmin, TestimonialsAdmin, IndustriesAdmin, SolutionsAdmin, PricingAdmin, AboutAdmin } from '@/features/cms';
import { PaymentsAdmin } from '@/features/finance';
import { StaffManagement, StaffAccess } from '@/features/hr-staff';
import { AIConfigAdmin } from '@/features/ai-tools';
import { SystemPanel, FileUploadManager } from '@/features/settings';

function LegacyAdminRedirect() {
  const location = useLocation();
  const target = location.pathname.replace(/^\/admin(?:\/|$)/, '/') || '/';
  return <Navigate to={target} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      <Route
        element={
          <AdminProtectedLayout>
            <AdminLayout />
          </AdminProtectedLayout>
        }
      >
        <Route path="/" element={<EnhancedAdminDashboard />} />
        <Route path="dashboard" element={<EnhancedAdminDashboard />} />
        <Route path="staff-dashboard" element={<StaffDashboard />} />
        <Route path="contacts" element={<ContactsAdmin />} />
        <Route path="chat" element={<ChatConversationsAdmin />} />
        <Route path="projects" element={<ProjectsAdmin />} />
        <Route path="client-projects" element={<ClientProjectsManagement />} />
        <Route path="bookings" element={<BookingsManagement />} />
        <Route path="blogs" element={<BlogAdmin />} />
        <Route path="products" element={<ProductsAdmin />} />
        <Route path="services" element={<ServicesAdmin />} />
        <Route path="service-categories" element={<ServiceCategoriesAdmin />} />
        <Route path="sections" element={<HomeSectionsAdmin />} />
        <Route path="settings" element={<SiteSettingsAdmin />} />
        <Route path="faqs" element={<FaqsAdmin />} />
        <Route path="careers" element={<CareersAdmin />} />
        <Route path="testimonials" element={<TestimonialsAdmin />} />
        <Route path="industries" element={<IndustriesAdmin />} />
        <Route path="solutions" element={<SolutionsAdmin />} />
        <Route path="pricing" element={<PricingAdmin />} />
        <Route path="about" element={<AboutAdmin />} />
        <Route path="payments" element={<PaymentsAdmin />} />
        <Route path="staff" element={<StaffManagement />} />
        <Route path="staff-access" element={<StaffAccess />} />
        <Route path="ai" element={<AIConfigAdmin />} />
        <Route path="system" element={<SystemPanel />} />
        <Route path="uploads" element={<FileUploadManager />} />
      </Route>
      <Route path="/admin" element={<LegacyAdminRedirect />} />
      <Route path="/admin/*" element={<LegacyAdminRedirect />} />
      <Route path="*" element={<NotFoundAdmin />} />
    </Routes>
  );
}