import { Routes, Route } from 'react-router-dom';
import { MarketingLayout } from '@/features/marketing/layouts/MarketingLayout';
import { PortalLayout } from '@/features/client-portal/layouts/PortalLayout';
import { ClientProtectedRoute } from '@angisoft/auth';
import {
  Home,
  About,
  Services,
  ServiceDetail,
  Products,
  ProductDetail,
  Pricing,
  Contact,
  Careers,
  Blog,
  BlogDetail,
  Staff,
  StaffDetail,
  Testimonials,
  Projects,
  ProjectDetail,
  Industries,
  IndustryDetail,
  Solutions,
  SolutionDetail,
  CategoryDetail,
  NewsletterConfirm,
  NewsletterUnsubscribe,
  Privacy,
  Terms,
  NotFound,
} from '@/features/marketing/pages';
import { Booking, BookingStatus, BookingHistory, BookingLookup, BookingProgress } from '@/features/bookings/pages';
import { ClientDashboard, ClientProjectTracking } from '@/features/client-portal/pages';
import { ClientPortalRequest, ClientPortalAccess } from '@/features/auth/pages';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route index element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/services/:slug" element={<ServiceDetail />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogDetail />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/staff/:usernameOrId" element={<StaffDetail />} />
        <Route path="/testimonials" element={<Testimonials />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/project/:slug" element={<ProjectDetail />} />
        <Route path="/industries" element={<Industries />} />
        <Route path="/industries/:slug" element={<IndustryDetail />} />
        <Route path="/industry/:slug" element={<IndustryDetail />} />
        <Route path="/solutions" element={<Solutions />} />
        <Route path="/solutions/:slug" element={<SolutionDetail />} />
        <Route path="/solution/:slug" element={<CategoryDetail />} />
        <Route path="/technology/:slug" element={<CategoryDetail />} />
        <Route path="/newsletter/confirm" element={<NewsletterConfirm />} />
        <Route path="/newsletter/unsubscribe" element={<NewsletterUnsubscribe />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/book" element={<Booking />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/booking/:id" element={<BookingStatus />} />
        <Route path="/bookings" element={<BookingHistory />} />
        <Route path="/bookings/:reference" element={<BookingProgress />} />
        <Route path="/track-booking" element={<BookingLookup />} />
      </Route>

      <Route path="/portal/request" element={<ClientPortalRequest />} />
      <Route path="/portal/access" element={<ClientPortalAccess />} />
      <Route element={<ClientProtectedRoute><PortalLayout /></ClientProtectedRoute>}>
        <Route path="/portal" element={<ClientDashboard />} />
        <Route path="/portal/projects/:id" element={<ClientProjectTracking />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
