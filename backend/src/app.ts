import express from 'express';
import path from 'path';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import inviteRouter from './modules/identity/routes/invite';
import bookingsRouter from './modules/bookings/routes/bookings';
import chatbotRouter from './modules/ai/routes/chatbot';
import paymentsRouter from './modules/billing/routes/payments';
import paymentConsoleRouter from './modules/billing/routes/payment-console';
import authRouter from './modules/identity/routes/auth';
import uploadsRouter from './modules/files/routes/uploads';
import servicesRouter from './modules/cms/routes/services';
import projectsRouter from './modules/projects/routes/projects';
import blogsRouter from './modules/cms/routes/blogs';
import testimonialsRouter from './modules/cms/routes/testimonials';
import serviceCategoriesRouter from './modules/cms/routes/service-categories';
import settingsRouter from './modules/cms/routes/settings';
import staffRouter from './modules/identity/routes/staff';
import adminRouter from './shared/routes/admin';
import staffDashboardRouter from './modules/identity/routes/staff-dashboard';
import clientProjectsRouter from './modules/projects/routes/client-projects';
import clientPortalRouter from './modules/crm/routes/client-portal';
import healthRouter from './shared/routes/health';
import siteRouter from './modules/cms/routes/site';
import newsletterRouter from './modules/crm/routes/newsletter';
import faqRouter from './modules/cms/routes/faq';
import notificationsRouter from './modules/notifications/routes/notifications';
import announcementsRouter from './modules/cms/routes/announcements';
import newslettersRouter from './modules/crm/routes/newsletters';
import surveysRouter from './modules/crm/routes/surveys';
import leadsRouter from './modules/crm/routes/leads';
import supportTicketsRouter from './modules/crm/routes/support-tickets';
import productsRouter from './modules/cms/routes/products';
import { trackPageView } from './modules/analytics/services/analytics';
import { getAllowedOrigins } from './shared/config/origins';
import { authRateLimiter } from './shared/middleware/rateLimiter';
import { requireAuth } from './shared/middleware/auth';
import { sanitizeMiddleware } from './shared/middleware/validation';
import { publicJsonCache } from './shared/middleware/cache';
import { errorHandler, notFoundHandler, asyncHandler } from './shared/middleware/errorHandler';
import { initSentry } from './shared/services/monitoring/sentry';
import { toPublicUrl } from './modules/files/services/storage/s3';
import prisma from './db';

// New route imports
import careersRouter from './modules/projects/routes/careers';
import companyStatsRouter from './modules/cms/routes/company-stats';
import homeSectionsRouter from './modules/cms/routes/home-sections';
import aboutSectionsRouter from './modules/cms/routes/about-sections';
import staffBlogsRouter from './modules/cms/routes/staff-blogs';
import certificationsRouter from './modules/identity/routes/certifications';
import productInquiriesRouter from './modules/crm/routes/product-inquiries';
import staffAccessRouter from './modules/identity/routes/staff-access';
import productFaqsRouter from './modules/cms/routes/product-faqs';
import contactEnquiriesRouter from './modules/crm/routes/contact-enquiries';
import industriesRouter from './modules/cms/routes/industries';
import solutionsRouter from './modules/cms/routes/solutions';
import rolesRouter from './modules/identity/routes/roles';
import employeeProfilesRouter from './modules/identity/routes/employee-profiles';
import aiConfigRouter from './modules/ai/routes/ai-config';

dotenv.config();
initSentry();
const app = express();
// gzip/deflate compression for all responses
app.use(compression());
// security middlewares
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginResourcePolicy: {
        policy: "cross-origin"
    },
}));
// Production CORS: allow frontend domains (set CORS_ORIGIN in env or use defaults)
const allowed = getAllowedOrigins();
app.use(cors({ origin: allowed, credentials: true } as any));
// Signed webhooks need the pristine raw body (Stripe signature / Paystack HMAC),
// so capture it BEFORE the global JSON parser runs for those paths only.
app.use(['/api/payments/webhook', '/api/payments/paystack/webhook'], express.raw({ type: '*/*' }) as any);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(
    "/uploads/public",
    (req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        next();
    },
    express.static(path.resolve(process.cwd(), "uploads/public"), {
        immutable: true,
        maxAge: "30d",
        setHeaders: (res) => {
            res.setHeader(
                "Cache-Control",
                "public, max-age=2592000, immutable"
            );
        },
    })
);
// Legacy public uploads were migrated to object storage (Tigris, served via
// the public CDN — see scripts/migrate-uploads-to-tigris.mjs). Any
// /uploads/public/* asset missing from local disk falls through to a CDN
// redirect so existing DB-referenced URLs keep resolving.
app.get("/uploads/public/*", (req, res) => {
    const key = req.path
        .replace(/^\/uploads\//, "")
        .split("/")
        .filter((segment) => segment && segment !== "." && segment !== "..")
        .join("/");
    res.redirect(302, toPublicUrl(key));
});
app.use(sanitizeMiddleware);

// Public JSON caching for unauthenticated GET content endpoints (Redis when
// REDIS_URL is set, in-memory otherwise). Must sit before the API routers so
// it can intercept them; the raw webhook + auth routers are unaffected.
app.use(publicJsonCache());

if (process.env.MCP_HTTP_ENABLED === 'true') {
    // Optional read-only MCP-over-HTTP endpoint (Streamable HTTP). Disabled by
    // default; keep it off unless an MCP client is wired up.
    app.post('/mcp', (req, res, next) => {
        import('./mcp/index.js')
            .then(({ handleMcpHttpRequest }) => handleMcpHttpRequest(req, res))
            .catch(next);
    });
}

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>AngiSoft Technologies API</title>
        <style>
            :root { color-scheme: light dark; }
            body {
                margin: 0;
                font-family: "Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
                background: radial-gradient(1200px 600px at 10% 10%, #0f172a 0%, #0b1220 40%, #050814 100%);
                color: #e2e8f0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 32px;
            }
            .card {
                width: min(920px, 100%);
                background: rgba(15, 23, 42, 0.8);
                border: 1px solid rgba(148, 163, 184, 0.2);
                border-radius: 20px;
                padding: 36px;
                box-shadow: 0 20px 80px rgba(0, 0, 0, 0.5);
            }
            .badge {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: #94a3b8;
                background: rgba(148, 163, 184, 0.12);
                padding: 6px 10px;
                border-radius: 999px;
            }
            h1 {
                font-size: clamp(28px, 4vw, 42px);
                margin: 16px 0 8px;
                color: #f8fafc;
            }
            p { color: #cbd5f5; line-height: 1.6; }
            .grid {
                display: grid;
                gap: 16px;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                margin-top: 24px;
            }
            .tile {
                background: rgba(30, 41, 59, 0.6);
                border: 1px solid rgba(148, 163, 184, 0.15);
                border-radius: 14px;
                padding: 16px;
            }
            .tile strong { color: #e2e8f0; }
            .actions {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                margin-top: 24px;
            }
            .btn {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                padding: 12px 16px;
                border-radius: 12px;
                border: 1px solid rgba(148, 163, 184, 0.2);
                background: linear-gradient(135deg, #0ea5e9, #38bdf8);
                color: #0b1220;
                text-decoration: none;
                font-weight: 700;
            }
            .btn.secondary {
                background: transparent;
                color: #e2e8f0;
            }
            code {
                background: rgba(148, 163, 184, 0.12);
                padding: 2px 6px;
                border-radius: 6px;
            }
            .muted { color: #94a3b8; font-size: 14px; }
        </style>
    </head>
    <body>
        <main class="card">
            <span class="badge">AngiSoft Technologies · API</span>
            <h1>AngiSoft Technologies API (Postgres)</h1>
            <p>Welcome. The backend is live and connected to Neon Postgres. Use the endpoints below for status and data access.</p>

            <div class="grid">
                <div class="tile">
                    <strong>Health Check</strong>
                    <p class="muted">GET <code>/health</code> or <code>/api/health</code></p>
                </div>
                <div class="tile">
                    <strong>Services</strong>
                    <p class="muted">GET <code>/api/services</code></p>
                </div>
                <div class="tile">
                    <strong>Projects</strong>
                    <p class="muted">GET <code>/api/projects</code></p>
                </div>
                <div class="tile">
                    <strong>Blog</strong>
                    <p class="muted">GET <code>/api/blogs</code></p>
                </div>
            </div>

            <div class="actions">
                <a class="btn" href="/health">View Health</a>
                <a class="btn secondary" href="/api/services">Browse Services</a>
                <a class="btn secondary" href="/api/projects">Browse Projects</a>
            </div>

            <p class="muted" style="margin-top: 16px;">Need access? Contact support@angisoft.co.ke or WhatsApp +254710398690.</p>
        </main>
    </body>
</html>
        `);
});

app.use('/api/auth', authRateLimiter, authRouter);
app.use('/api/invite', inviteRouter(prisma));
app.use('/api/bookings', bookingsRouter(prisma));
app.use('/api/payments', paymentsRouter(prisma));
app.use('/api/admin/payments', paymentConsoleRouter(prisma));
app.use('/api/uploads', uploadsRouter());
app.use('/api/services', servicesRouter());
app.use('/api/projects', projectsRouter());
app.use('/api/blogs', blogsRouter());
app.use('/api/testimonials', testimonialsRouter());
app.use('/api/service-categories', serviceCategoriesRouter());
app.use('/api/settings', requireAuth, settingsRouter());
app.use('/api/staff', staffRouter(prisma));
app.use('/api/admin', adminRouter(prisma));
app.use('/api/admin', aiConfigRouter(prisma));
app.use('/api/staff-dashboard', staffDashboardRouter(prisma));
app.use('/api/client-projects', clientProjectsRouter(prisma));
app.use('/api/client-portal', clientPortalRouter(prisma));
app.use('/api/site', siteRouter(prisma));
app.use('/api/newsletter', newsletterRouter(prisma));
app.use('/api/faqs', faqRouter(prisma));
app.use('/api/chatbot', chatbotRouter(prisma));
app.use('/api/notifications', notificationsRouter());
app.use('/api/announcements', announcementsRouter());
app.use('/api/newsletters', newslettersRouter());
app.use('/api/surveys', surveysRouter());
app.use('/api/leads', leadsRouter());
app.use('/api/support-tickets', supportTicketsRouter());
app.use('/api/products', productsRouter());
app.use('/api/roles', rolesRouter());
app.use('/api/admin/staff', staffAccessRouter());
app.use('/api/employee-profiles', employeeProfilesRouter());
app.use('/api/careers', careersRouter());
app.use('/api/company-stats', companyStatsRouter());
app.use('/api/home-sections', homeSectionsRouter());
app.use('/api/about-sections', aboutSectionsRouter());
app.use('/api/staff-blogs', staffBlogsRouter());
app.use('/api/certifications', certificationsRouter());
app.use('/api/product-inquiries', productInquiriesRouter());
app.use('/api/product-faqs', productFaqsRouter());
app.use('/api/contact-enquiries', contactEnquiriesRouter());
app.use('/api/industries', industriesRouter());
app.use('/api/solutions', solutionsRouter());
app.use('/health', healthRouter(prisma));

// Analytics middleware
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/health')) {
        trackPageView(req.path, req).catch(() => { });
    }
    next();
});

// Legacy admin route (kept for compatibility)
app.post('/api/admin/revoke/:employeeId', requireAuth, asyncHandler(async (req, res) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Not allowed' });
    const employeeId = (req.params as any).employeeId;
    await prisma.orm.public.RefreshToken.where((r) => r.employeeId.eq(employeeId)).delete();
    res.json({ ok: true });
}));




// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
