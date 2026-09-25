import { Routes, Route } from 'react-router-dom';
import { MarketingLayout } from '@/features/marketing/layouts/MarketingLayout';
import { PortalLayout } from '@/features/client-portal/layouts/PortalLayout';
import { ClientProtectedRoute } from '@angisoft/auth';
import {
  Home,
  About,
  Services,
  ProductDetail,
  Products,
  AngiTunes,
  DukaFlow,
  KejaLink,
  PetroFlow,
  Pricing,
  Contact,
  Careers,
  Blog,
  BlogDetail,
  Staff,
  Testimonials,
  Projects,
  Industries,
  Solutions,
  CategoryDetail,
  Privacy,
  Terms,
  NotFound,
} from '@/features/marketing/pages';
import {
  ClientDashboard,
  ClientProjectTracking,
  Booking,
  BookingStatus,
  BookingHistory,
  BookingLookup,
  BookingProgress,
} from '@/features/client-portal/pages';
import { ClientPortalRequest, ClientPortalAccess } from '@/features/auth/pages';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route index element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/products/angitunes" element={<AngiTunes />} />
        <Route path="/products/dukaflow" element={<DukaFlow />} />
        <Route path="/products/kejalink" element={<KejaLink />} />
        <Route path="/products/petroflow" element={<PetroFlow />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogDetail />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/testimonials" element={<Testimonials />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/industries" element={<Industries />} />
        <Route path="/industries/:slug" element={<CategoryDetail />} />
        <Route path="/solutions" element={<Solutions />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
      </Route>

      <Route path="/portal/request" element={<ClientPortalRequest />} />
      <Route path="/portal/access" element={<ClientPortalAccess />} />
      <Route
        element={
          <ClientProtectedRoute>
            <PortalLayout />
          </ClientProtectedRoute>
        }
      >
        <Route path="/portal" element={<ClientDashboard />} />
        <Route path="/portal/projects/:id" element={<ClientProjectTracking />} />
        <Route path="/portal/booking" element={<Booking />} />
        <Route path="/portal/booking/status" element={<BookingStatus />} />
        <Route path="/portal/booking/history" element={<BookingHistory />} />
        <Route path="/portal/booking/lookup" element={<BookingLookup />} />
        <Route path="/portal/booking/:ref" element={<BookingProgress />} />
      </Route>

      <Route path="/booking/lookup" element={<BookingLookup />} />
      <Route path="/booking/:ref" element={<BookingProgress />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;