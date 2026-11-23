import { Suspense, lazy, type ComponentType } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LoadingIndicator } from '@angisoft/ui';
import { MarketingLayout } from '@/features/marketing/layouts/MarketingLayout';
import { PortalLayout } from '@/features/client-portal/layouts/PortalLayout';
import { RequireConsent } from '@/components/RequireConsent';
import { PortalGuard } from '@/features/client-portal/layouts/PortalGuard';
import Home from '@/features/marketing/pages/Home';

// Route-level code splitting (Phase 5 perf): every page except the landing
// Home is lazy-loaded so the entry chunk stays lean. Import paths mirror
// `features/marketing/pages/index.ts` — do not go through the barrel or the
// whole feature folder lands back in the entry chunk.
let lazyStylesPromise: Promise<unknown> | null = null;
const loadLazyStyles = () => {
  lazyStylesPromise ??= import('@/styles/tailwind-lazy.css');
  return lazyStylesPromise;
};

/** Lazy route that loads the non-landing Tailwind utility chunk on demand. */
const lazyRoute = (load: () => Promise<{ default: ComponentType<Record<string, never>> }>) =>
  lazy(async () => {
    await loadLazyStyles();
    return load();
  });
const About = lazyRoute(() => import('@/features/marketing/pages/About'));
const Services = lazyRoute(() => import('@/features/marketing/pages/services/ServicesList'));
const ServiceDetail = lazyRoute(() => import('@/features/marketing/pages/services/ServiceDetail'));
const Products = lazyRoute(() => import('@/features/marketing/pages/Products'));
const ProductDetail = lazyRoute(() => import('@/features/marketing/pages/ProductDetail'));
const Pricing = lazyRoute(() => import('@/features/marketing/pages/Pricing'));
const Contact = lazyRoute(() => import('@/features/marketing/pages/Contact'));
const Careers = lazyRoute(() => import('@/features/marketing/pages/Careers'));
const Blog = lazyRoute(() => import('@/features/marketing/pages/blog/BlogList'));
const BlogDetail = lazyRoute(() => import('@/features/marketing/pages/blog/BlogDetail'));
const Staff = lazyRoute(() => import('@/features/marketing/pages/StaffList'));
const StaffDetail = lazyRoute(() => import('@/features/marketing/pages/StaffDetail'));
const Testimonials = lazyRoute(() => import('@/features/marketing/pages/TestimonialsList'));
const Projects = lazyRoute(() => import('@/features/marketing/pages/ProjectLists'));
const ProjectDetail = lazyRoute(() => import('@/features/marketing/pages/ProjectDetails'));
const Industries = lazyRoute(() => import('@/features/marketing/pages/industries/IndustriesList'));
const IndustryDetail = lazyRoute(() => import('@/features/marketing/pages/industries/IndustryDetail'));
const Solutions = lazyRoute(() => import('@/features/marketing/pages/solutions/SolutionsList'));
const SolutionDetail = lazyRoute(() => import('@/features/marketing/pages/solutions/SolutionDetail'));
const CategoryDetail = lazyRoute(() => import('@/features/marketing/pages/CategoryDetail'));
const NewsletterConfirm = lazyRoute(() => import('@/features/marketing/pages/NewsletterConfirm'));
const NewsletterUnsubscribe = lazyRoute(() => import('@/features/marketing/pages/NewsletterUnsubscribe'));
const Privacy = lazyRoute(() => import('@/features/marketing/pages/Privacy'));
const Terms = lazyRoute(() => import('@/features/marketing/pages/Terms'));
const ClientConsent = lazyRoute(() => import('@/features/auth/pages/ClientConsent'));
const NotFound = lazyRoute(() => import('@/features/marketing/pages/NotFound'));

const Booking = lazyRoute(() => import('@/features/bookings/pages/Booking'));
const BookingStatus = lazyRoute(() => import('@/features/bookings/pages/BookingStatus'));
const BookingHistory = lazyRoute(() => import('@/features/bookings/pages/bookings/BookingHistory'));
const BookingLookup = lazyRoute(() => import('@/features/bookings/pages/bookings/BookingLookup'));
const BookingProgress = lazyRoute(() => import('@/features/bookings/pages/bookings/BookingProgress'));

const ClientDashboard = lazyRoute(() => import('@/features/client-portal/pages/ClientDashboard'));
const ClientProjectTracking = lazyRoute(() => import('@/features/client-portal/pages/ClientProjectTracking'));
const ClientPortalLogin = lazyRoute(() => import('@/features/auth/pages/ClientPortalLogin'));
const ClientPortalRequest = lazyRoute(() => import('@/features/auth/pages/ClientPortalRequest'));
const ClientPortalAccess = lazyRoute(() => import('@/features/auth/pages/ClientPortalAccess'));

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
          <Route path="/privacy-policy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/terms-conditions" element={<Terms />} />
          <Route path="/consent" element={<ClientConsent />} />
          <Route path="/book" element={<RequireConsent><Booking /></RequireConsent>} />
          <Route path="/booking" element={<RequireConsent><Booking /></RequireConsent>} />
          <Route path="/booking/:id" element={<BookingStatus />} />
          <Route path="/bookings" element={<BookingHistory />} />
          <Route path="/bookings/:reference" element={<BookingProgress />} />
          <Route path="/track-booking" element={<BookingLookup />} />
        </Route>

        <Route path="/portal/login" element={<RequireConsent><ClientPortalLogin /></RequireConsent>} />
        <Route path="/portal/request" element={<RequireConsent><ClientPortalRequest /></RequireConsent>} />
        <Route path="/portal/access" element={<RequireConsent><ClientPortalAccess /></RequireConsent>} />
        <Route element={<RequireConsent><PortalGuard><PortalLayout /></PortalGuard></RequireConsent>}>
          <Route path="/portal" element={<ClientDashboard />} />
          <Route path="/portal/projects/:id" element={<ClientProjectTracking />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
