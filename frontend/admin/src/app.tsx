import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AdminLogin } from '@/layouts/AdminLogin';
import { AdminLayout } from '@/layouts/AdminLayout';
import { NotFoundAdmin } from '@/layouts/NotFoundAdmin';
import { AdminProtectedLayout } from '@angisoft/auth';

// Route-level code splitting: each admin screen is its own chunk so the
// entry bundle stays small (mirrors the web app's lazy routing).
const EnhancedAdminDashboard = lazy(() => import('@/features/dashboard/EnhancedAdminDashboard'));
const StaffDashboard = lazy(() => import('@/features/dashboard/StaffDashboard'));
const Workspace = lazy(() => import('@/features/dashboard/Workspace'));
const ReportsAdmin = lazy(() => import('@/features/dashboard/ReportsAdmin'));
const ContactsAdmin = lazy(() => import('@/features/crm/ContactsAdmin'));
const ChatConversationsAdmin = lazy(() => import('@/features/crm/ChatConversationsAdmin'));
const RenewalsAdmin = lazy(() => import('@/features/crm/RenewalsAdmin'));
const SupportTicketsAdmin = lazy(() => import('@/features/crm/SupportTicketsAdmin'));
const NewslettersAdmin = lazy(() => import('@/features/crm/NewslettersAdmin'));
const SurveysAdmin = lazy(() => import('@/features/crm/SurveysAdmin'));
const ProductInquiriesAdmin = lazy(() => import('@/features/crm/ProductInquiriesAdmin'));
const ClientProjectsManagement = lazy(() => import('@/features/projects/ClientProjectsManagement'));
const ProjectsAdmin = lazy(() => import('@/features/projects/ProjectsAdmin'));
const BookingsManagement = lazy(() => import('@/features/bookings/BookingsManagement'));
const BlogAdmin = lazy(() => import('@/features/cms/BlogAdmin'));
const ProductsAdmin = lazy(() => import('@/features/cms/ProductsAdmin'));
const ServicesAdmin = lazy(() => import('@/features/cms/ServicesAdmin'));
const ServiceCategoriesAdmin = lazy(() => import('@/features/cms/ServiceCategoriesAdmin'));
const HomeSectionsAdmin = lazy(() => import('@/features/cms/HomeSectionsAdmin'));
const SiteSettingsAdmin = lazy(() => import('@/features/cms/SiteSettingsAdmin'));
const FaqsAdmin = lazy(() => import('@/features/cms/FaqsAdmin'));
const CareersAdmin = lazy(() => import('@/features/cms/CareersAdmin'));
const TestimonialsAdmin = lazy(() => import('@/features/cms/TestimonialsAdmin'));
const IndustriesAdmin = lazy(() => import('@/features/cms/IndustriesAdmin'));
const SolutionsAdmin = lazy(() => import('@/features/cms/SolutionsAdmin'));
const PricingAdmin = lazy(() => import('@/features/cms/PricingAdmin'));
const PricingPackagesAdmin = lazy(() => import('@/features/cms/PricingPackagesAdmin'));
const OfficesAdmin = lazy(() => import('@/features/cms/OfficesAdmin'));
const AboutAdmin = lazy(() => import('@/features/cms/AboutAdmin'));
const AnnouncementsAdmin = lazy(() => import('@/features/cms/AnnouncementsAdmin').then((m) => ({ default: m.AnnouncementsAdmin })));
const CompanyStatsAdmin = lazy(() => import('@/features/cms/CompanyStatsAdmin').then((m) => ({ default: m.CompanyStatsAdmin })));
const PaymentsAdmin = lazy(() => import('@/features/finance/PaymentsAdmin'));
const ExpensesAdmin = lazy(() => import('@/features/finance/ExpensesAdmin'));
const OpportunitiesAdmin = lazy(() => import('@/features/sales/OpportunitiesAdmin'));
const QuotesAdmin = lazy(() => import('@/features/sales/QuotesAdmin'));
const InvoicesAdmin = lazy(() => import('@/features/sales/InvoicesAdmin'));
const StaffManagement = lazy(() => import('@/features/hr-staff/StaffManagement'));
const StaffAccess = lazy(() => import('@/features/hr-staff/StaffAccess'));
const LeaveRequestsAdmin = lazy(() => import('@/features/hr-staff/LeaveRequestsAdmin'));
const AttendanceAdmin = lazy(() => import('@/features/hr-staff/AttendanceAdmin'));
const PayrollAdmin = lazy(() => import('@/features/hr-staff/PayrollAdmin'));
const ApprovalsAdmin = lazy(() => import('@/features/approvals/ApprovalsAdmin'));
const PortfolioStudio = lazy(() => import('@/features/portfolio-studio/PortfolioStudio'));
const PortfolioApprovals = lazy(() => import('@/features/portfolio-studio/PortfolioApprovals'));
const AIConfigAdmin = lazy(() => import('@/features/ai-tools/AIConfigAdmin'));
const AiAssist = lazy(() => import('@/features/ai-tools/AiAssist'));
const AgentsAdmin = lazy(() => import('@/features/agents/AgentsAdmin').then((m) => ({ default: m.AgentsAdmin })));
const SystemPanel = lazy(() => import('@/features/settings/SystemPanel'));
const SecurityPanel = lazy(() => import('@/features/settings/SecurityPanel'));
const FileUploadManager = lazy(() => import('@/features/settings/FileUploadManager'));
const RolesAdmin = lazy(() => import('@/features/settings/RolesAdmin'));
const AuditLogViewer = lazy(() => import('@/features/settings/AuditLogViewer'));

function LegacyAdminRedirect() {
  const location = useLocation();
  const target = location.pathname.replace(/^\/admin(?:\/|$)/, '/') || '/';
  return <Navigate to={target} replace />;
}

const routeFallback = (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
    <div className="spinner" aria-label="Loading" />
  </div>
);

export default function App() {
  return (
    <Suspense fallback={routeFallback}>
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
        <Route path="workspace" element={<Workspace />} />
        <Route path="workspace/portfolio-studio" element={<PortfolioStudio />} />
        <Route path="portfolio-approvals" element={<PortfolioApprovals />} />
        <Route path="staff-dashboard" element={<StaffDashboard />} />
        <Route path="reports" element={<ReportsAdmin />} />
        <Route path="contacts" element={<ContactsAdmin />} />
        <Route path="renewals" element={<RenewalsAdmin />} />
        <Route path="support-tickets" element={<SupportTicketsAdmin />} />
        <Route path="newsletters" element={<NewslettersAdmin />} />
        <Route path="surveys" element={<SurveysAdmin />} />
        <Route path="product-inquiries" element={<ProductInquiriesAdmin />} />
        <Route path="chat" element={<ChatConversationsAdmin />} />
        <Route path="opportunities" element={<OpportunitiesAdmin />} />
        <Route path="quotes" element={<QuotesAdmin />} />
        <Route path="invoices" element={<InvoicesAdmin />} />
        <Route path="projects" element={<ProjectsAdmin />} />
        <Route path="client-projects" element={<ClientProjectsManagement />} />
        <Route path="bookings" element={<BookingsManagement />} />
        <Route path="blogs" element={<BlogAdmin />} />
        <Route path="products" element={<ProductsAdmin />} />
        <Route path="services" element={<ServicesAdmin />} />
        <Route path="service-categories" element={<ServiceCategoriesAdmin />} />
        <Route path="sections" element={<HomeSectionsAdmin />} />
        <Route path="settings" element={<SiteSettingsAdmin />} />
        <Route path="settings/roles" element={<RolesAdmin />} />
        <Route path="faqs" element={<FaqsAdmin />} />
        <Route path="careers" element={<CareersAdmin />} />
        <Route path="testimonials" element={<TestimonialsAdmin />} />
        <Route path="industries" element={<IndustriesAdmin />} />
        <Route path="solutions" element={<SolutionsAdmin />} />
        <Route path="pricing" element={<PricingAdmin />} />
        <Route path="pricing-packages" element={<PricingPackagesAdmin />} />
        <Route path="offices" element={<OfficesAdmin />} />
        <Route path="about" element={<AboutAdmin />} />
        <Route path="announcements" element={<AnnouncementsAdmin />} />
        <Route path="company-stats" element={<CompanyStatsAdmin />} />
        <Route path="payments" element={<PaymentsAdmin />} />
        <Route path="expenses" element={<ExpensesAdmin />} />
        <Route path="leave-requests" element={<LeaveRequestsAdmin />} />
        <Route path="attendance" element={<AttendanceAdmin />} />
        <Route path="payroll" element={<PayrollAdmin />} />
        <Route path="approvals" element={<ApprovalsAdmin />} />
        <Route path="staff" element={<StaffManagement />} />
        <Route path="staff-access" element={<StaffAccess />} />
        <Route path="ai" element={<AIConfigAdmin />} />
        <Route path="ai-assist" element={<AiAssist />} />
        <Route path="agents" element={<AgentsAdmin />} />
        <Route path="system" element={<SystemPanel />} />
        <Route path="security" element={<SecurityPanel />} />
        <Route path="audit-log" element={<AuditLogViewer />} />
        <Route path="uploads" element={<FileUploadManager />} />
      </Route>
      <Route path="/admin" element={<LegacyAdminRedirect />} />
      <Route path="/admin/*" element={<LegacyAdminRedirect />} />
      <Route path="*" element={<NotFoundAdmin />} />
    </Routes>
    </Suspense>
  );
}
