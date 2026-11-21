import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LoadingIndicator } from '@angisoft/ui';
import { MarketingLayout } from '@/features/marketing/layouts/MarketingLayout';
import { PortalLayout } from '@/features/client-portal/layouts/PortalLayout';
import { ClientProtectedRoute } from '@angisoft/auth';
import Home from '@/features/marketing/pages/Home';

// Route-level code splitting (Phase 5 perf): every page except the landing
// Home is lazy-loaded so the entry chunk stays lean. Import paths mirror
// `features/marketing/pages/index.ts` — do not go through the barrel or the
// whole feature folder lands back in the entry chunk.
const About = lazy(() => import('@/features/marketing/pages/About'));
const Services = lazy(() => import('@/features/marketing/pages/services/ServicesList'));
const ServiceDetail = lazy(() => import('@/features/marketing/pages/services/ServiceDetail'));
const Products = lazy(() => import('@/features/marketing/pages/Products'));
const ProductDetail = lazy(() => import('@/features/marketing/pages/ProductDetail'));
const Pricing = lazy(() => import('@/features/marketing/pages/Pricing'));
const Contact = lazy(() => import('@/features/marketing/pages/Contact'));
const Careers = lazy(() => import('@/features/marketing/pages/Careers'));
const Blog = lazy(() => import('@/features/marketing/pages/blog/BlogList'));
const BlogDetail = lazy(() => import('@/features/marketing/pages/blog/BlogDetail'));
const Staff = lazy(() => import('@/features/marketing/pages/StaffList'));
const StaffDetail = lazy(() => import('@/features/marketing/pages/StaffDetail'));
const Testimonials = lazy(() => import('@/features/marketing/pages/TestimonialsList'));
const Projects = lazy(() => import('@/features/marketing/pages/ProjectLists'));
const ProjectDetail = lazy(() => import('@/features/marketing/pages/ProjectDetails'));
const Industries = lazy(() => import('@/features/marketing/pages/industries/IndustriesList'));
const IndustryDetail = lazy(() => import('@/features/marketing/pages/industries/IndustryDetail'));
const Solutions = lazy(() => import('@/features/marketing/pages/solutions/SolutionsList'));
const SolutionDetail = lazy(() => import('@/features/marketing/pages/solutions/SolutionDetail'));
const CategoryDetail = lazy(() => import('@/features/marketing/pages/CategoryDetail'));
const NewsletterConfirm = lazy(() => import('@/features/marketing/pages/NewsletterConfirm'));
const NewsletterUnsubscribe = lazy(() => import('@/features/marketing/pages/NewsletterUnsubscribe'));
const Privacy = lazy(() => import('@/features/marketing/pages/Privacy'));
const Terms = lazy(() => import('@/features/marketing/pages/Terms'));
const NotFound = lazy(() => import('@/features/marketing/pages/NotFound'));

const Booking = lazy(() => import('@/features/bookings/pages/Booking'));
const BookingStatus = lazy(() => import('@/features/bookings/pages/BookingStatus'));
const BookingHistory = lazy(() => import('@/features/bookings/pages/bookings/BookingHistory'));
const BookingLookup = lazy(() => import('@/features/bookings/pages/bookings/BookingLookup'));
const BookingProgress = lazy(() => import('@/features/bookings/pages/bookings/BookingProgress'));

const ClientDashboard = lazy(() => import('@/features/client-portal/pages/ClientDashboard'));
const ClientProjectTracking = lazy(() => import('@/features/client-portal/pages/ClientProjectTracking'));
const ClientPortalRequest = lazy(() => import('@/features/auth/pages/ClientPortalRequest'));
const ClientPortalAccess = lazy(() => import('@/features/auth/pages/ClientPortalAccess'));

const routeFallback = (
  <div className="flex min-h-[40vh] items-center justify-center">
    <LoadingIndicator />
  </div>
);

export function AppRoutes() {
  return (
    <Suspense fallback={routeFallback}>
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
    </Suspense>
  );
}

export default AppRoutes;
