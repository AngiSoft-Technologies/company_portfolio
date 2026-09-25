import { Routes, Route } from 'react-router-dom';
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

export default function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        element={
          <AdminProtectedLayout>
            <AdminLayout />
          </AdminProtectedLayout>
        }
      >
        <Route path="/admin" element={<EnhancedAdminDashboard />} />
        <Route path="/admin/dashboard" element={<EnhancedAdminDashboard />} />
        <Route path="/admin/staff-dashboard" element={<StaffDashboard />} />
        <Route path="/admin/contacts" element={<ContactsAdmin />} />
        <Route path="/admin/chat" element={<ChatConversationsAdmin />} />
        <Route path="/admin/projects" element={<ProjectsAdmin />} />
        <Route path="/admin/client-projects" element={<ClientProjectsManagement />} />
        <Route path="/admin/bookings" element={<BookingsManagement />} />
        <Route path="/admin/blogs" element={<BlogAdmin />} />
        <Route path="/admin/products" element={<ProductsAdmin />} />
        <Route path="/admin/services" element={<ServicesAdmin />} />
        <Route path="/admin/service-categories" element={<ServiceCategoriesAdmin />} />
        <Route path="/admin/sections" element={<HomeSectionsAdmin />} />
        <Route path="/admin/settings" element={<SiteSettingsAdmin />} />
        <Route path="/admin/faqs" element={<FaqsAdmin />} />
        <Route path="/admin/careers" element={<CareersAdmin />} />
        <Route path="/admin/testimonials" element={<TestimonialsAdmin />} />
        <Route path="/admin/industries" element={<IndustriesAdmin />} />
        <Route path="/admin/solutions" element={<SolutionsAdmin />} />
        <Route path="/admin/pricing" element={<PricingAdmin />} />
        <Route path="/admin/about" element={<AboutAdmin />} />
        <Route path="/admin/payments" element={<PaymentsAdmin />} />
        <Route path="/admin/staff" element={<StaffManagement />} />
        <Route path="/admin/staff-access" element={<StaffAccess />} />
        <Route path="/admin/ai" element={<AIConfigAdmin />} />
        <Route path="/admin/system" element={<SystemPanel />} />
        <Route path="/admin/uploads" element={<FileUploadManager />} />
      </Route>
      <Route path="/admin/*" element={<NotFoundAdmin />} />
      <Route path="*" element={<NotFoundAdmin />} />
    </Routes>
  );
}