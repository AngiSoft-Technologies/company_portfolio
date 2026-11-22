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
import moneyMovementRouter from './modules/billing/routes/money-movement';
import mpesaCallbacksRouter from './modules/billing/routes/mpesa-callbacks';
import mpesaRouter from './modules/billing/routes/mpesa';
import authRouter from './modules/identity/routes/auth';
import mfaRouter from './modules/identity/routes/mfa';
import uploadsRouter from './modules/files/routes/uploads';
import servicesRouter from './modules/cms/routes/services';
import pricingPackagesRouter from './modules/cms/routes/pricing-packages';
import catalogFeedRouter from './modules/cms/routes/catalog-feed';
import officesRouter from './modules/cms/routes/offices';
import projectsRouter from './modules/projects/routes/projects';
import blogsRouter from './modules/cms/routes/blogs';
import testimonialsRouter from './modules/cms/routes/testimonials';
import serviceCategoriesRouter from './modules/cms/routes/service-categories';
import settingsRouter from './modules/cms/routes/settings';
import staffRouter from './modules/identity/routes/staff';
import adminRouter from './shared/routes/admin';
import runtimeConfigRouter from './shared/routes/runtime-config';
import approvalsRouter from './shared/routes/approvals';
import webhookInboxRouter from './shared/routes/webhookInbox';
import staffDashboardRouter from './modules/identity/routes/staff-dashboard';
import clientProjectsRouter from './modules/projects/routes/client-projects';
import clientPortalRouter from './modules/crm/routes/client-portal';
import healthRouter from './shared/routes/health';
import consentRouter from './shared/routes/consent';
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
import { csrfInit, csrfProtect } from './shared/middleware/csrf';
import { errorHandler, notFoundHandler, asyncHandler } from './shared/middleware/errorHandler';
import { initSentry } from './shared/services/monitoring/sentry';
import { loadRuntimeConfig } from './shared/services/runtimeConfig';
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
import opportunitiesRouter from './modules/crm/routes/opportunities';
import quotesRouter from './modules/crm/routes/quotes';
import invoicesRouter from './modules/crm/routes/invoices';
import expensesRouter from './modules/billing/routes/expenses';
import leaveRequestsRouter from './modules/identity/routes/leave-requests';
import attendanceRouter from './modules/identity/routes/attendance';
import payrollRouter from './modules/identity/routes/payroll';
import staffAccessRouter from './modules/identity/routes/staff-access';
import productFaqsRouter from './modules/cms/routes/product-faqs';
import contactEnquiriesRouter from './modules/crm/routes/contact-enquiries';
import industriesRouter from './modules/cms/routes/industries';
import solutionsRouter from './modules/cms/routes/solutions';
import rolesRouter from './modules/identity/routes/roles';
import employeeProfilesRouter from './modules/identity/routes/employee-profiles';
import aiConfigRouter from './modules/ai/routes/ai-config';
import aiAssistRouter from './modules/ai/routes/ai-assist';
import renewalsRouter from './modules/crm/routes/renewals';
import agentsRouter from './modules/agents/routes/agents';
import boardroomRouter from './modules/boardroom/routes/boardroom';
import communicationsAccountsRouter from './modules/communications/routes/accounts';
import communicationsAuditRouter from './modules/communications/routes/audit';
import communicationsCapabilitiesRouter from './modules/communications/routes/capabilities';
import communicationsConnectionsRouter from './modules/communications/routes/connections';
import communicationsContactsRouter from './modules/communications/routes/contacts';
import communicationsEmailRouter from './modules/communications/routes/email';
import communicationsGrantsRouter from './modules/communications/routes/grants';
import communicationsInboxRouter from './modules/communications/routes/inbox';
import communicationsOverviewRouter from './modules/communications/routes/overview';
import communicationsRulesRouter from './modules/communications/routes/rules';
import communicationsTemplatesRouter from './modules/communications/routes/templates';
import communicationsWebhooksRouter from './modules/communications/routes/webhooks';
import communicationsWorkflowRouter from './modules/communications/routes/messages';
import {
  financeAccountsRouter,
  financeAuditRouter,
  financeBeneficiariesRouter,
  financeCapabilitiesRouter,
  financeConnectionsRouter,
  financeDisputesRouter,
  financeOverviewRouter,
  financePayoutsRouter,
  financeReconciliationRouter,
  financeRefundsRouter,
  financeReportsRouter,
  financeSettlementsRouter,
  financeTransactionsRouter,
  financeWebhooksRouter,
} from './modules/finance';
import employeeEmailsRouter from './modules/identity/routes/employee-emails';

dotenv.config();
initSentry();
const app = express();
// Refresh DB-backed runtime config at most every 30s so SUPER_ADMIN UI edits
// propagate to every instance without blocking the request path.
app.use((_req, _res, next) => {
    void loadRuntimeConfig().catch(() => undefined);
    next();
});
// gzip/deflate compression for all responses
app.use(compression());
// Slow-request observability (Phase 5.4): emit a structured JSON log line for
// any request exceeding SLOW_REQUEST_MS (default 1000ms) so latency regressions
// are greppable in Fly logs without a full APM.
const SLOW_REQUEST_MS = Math.max(100, Number(process.env.SLOW_REQUEST_MS ?? 1000));
app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        if (durationMs >= SLOW_REQUEST_MS) {
            console.warn(JSON.stringify({
                level: 'warn',
                type: 'slow_request',
                method: req.method,
                path: req.originalUrl?.split('?')[0],
                status: res.statusCode,
                durationMs: Math.round(durationMs),
            }));
        }
    });
    next();
});
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
app.use([
  '/v1/payments/webhook',
  '/v1/payments/paystack/webhook',
  '/v1/payments/paypal/webhook',
  '/v1/communications/webhooks/whatsapp',
  '/v1/communications/webhooks/telegram',
  '/v1/communications/webhooks/meta',
  '/v1/communications/webhooks/tiktok',
  '/v1/finance/webhooks',
], express.raw({ type: '*/*' }) as any);
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

// CSRF protection (double-submit). `csrfInit` guarantees every response
// carries a readable `csrfToken` cookie; `csrfProtect` enforces it on all
// state-changing requests except the explicitly carved-out public/anonymous
// paths (booking, contact, newsletter, invite, webhooks, chatbot).
app.use(csrfInit);
app.use(csrfProtect);

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
                    <p class="muted">GET <code>/health</code> or <code>/v1/health</code></p>
                </div>
                <div class="tile">
                    <strong>Services</strong>
                    <p class="muted">GET <code>/v1/services</code></p>
                </div>
                <div class="tile">
                    <strong>Projects</strong>
                    <p class="muted">GET <code>/v1/projects</code></p>
                </div>
                <div class="tile">
                    <strong>Blog</strong>
                    <p class="muted">GET <code>/v1/blogs</code></p>
                </div>
            </div>

            <div class="actions">
                <a class="btn" href="/health">View Health</a>
                <a class="btn secondary" href="/v1/services">Browse Services</a>
                <a class="btn secondary" href="/v1/projects">Browse Projects</a>
            </div>

            <p class="muted" style="margin-top: 16px;">Need access? Contact support@angisoft.co.ke or WhatsApp +254710398690.</p>
        </main>
    </body>
</html>
        `);
});

app.use('/v1/auth/mfa', authRateLimiter, mfaRouter);
app.use('/v1/auth', authRateLimiter, authRouter);
app.use('/v1/invite', inviteRouter(prisma));
app.use('/v1/consent', consentRouter);
app.use('/v1/bookings', bookingsRouter(prisma));
app.use('/v1/payments', paymentsRouter(prisma));
app.use('/v1/admin/payments', paymentConsoleRouter(prisma));
app.use('/v1/admin/money', moneyMovementRouter(prisma));
app.use('/v1/payments/mpesa', mpesaCallbacksRouter(prisma));
app.use('/v1/payments/mpesa', mpesaRouter(prisma));
app.use('/v1/uploads', uploadsRouter());
app.use('/v1/services', servicesRouter());
app.use('/v1/pricing-packages', pricingPackagesRouter(prisma));
app.use('/v1/catalog', catalogFeedRouter(prisma));
app.use('/v1/offices', officesRouter(prisma));
app.use('/v1/projects', projectsRouter());
app.use('/v1/blogs', blogsRouter());
app.use('/v1/testimonials', testimonialsRouter());
app.use('/v1/service-categories', serviceCategoriesRouter());
app.use('/v1/settings', requireAuth, settingsRouter());
app.use('/v1/staff', staffRouter(prisma));
app.use('/v1/admin', adminRouter(prisma));
app.use('/v1/admin/webhook-inbox', webhookInboxRouter(prisma));
app.use('/v1/admin/config', runtimeConfigRouter());
app.use('/v1/admin', aiConfigRouter(prisma));
app.use('/v1/admin', aiAssistRouter(prisma));
app.use('/v1/admin', renewalsRouter(prisma));
app.use('/v1/admin/agents', agentsRouter(prisma));
app.use('/v1/admin/boardroom', boardroomRouter(prisma));
app.use('/v1/admin/communications', communicationsOverviewRouter(prisma));
app.use('/v1/admin/communications/accounts', communicationsAccountsRouter(prisma));
app.use('/v1/admin/communications/audit', communicationsAuditRouter(prisma));
app.use('/v1/admin/communications/capabilities', communicationsCapabilitiesRouter(prisma));
app.use('/v1/admin/communications/connections', communicationsConnectionsRouter(prisma));
app.use('/v1/admin/communications/contacts', communicationsContactsRouter(prisma));
app.use('/v1/admin/communications/email', communicationsEmailRouter(prisma));
app.use('/v1/admin/communications/grants', communicationsGrantsRouter(prisma));
app.use('/v1/admin/communications/inbox', communicationsInboxRouter(prisma));
app.use('/v1/admin/communications/rules', communicationsRulesRouter(prisma));
app.use('/v1/admin/communications/templates', communicationsTemplatesRouter(prisma));
app.use('/v1/admin/communications/workflow', communicationsWorkflowRouter(prisma));
app.use('/v1/communications/webhooks', communicationsWebhooksRouter(prisma));

app.use('/v1/admin/finance', financeOverviewRouter(prisma));
app.use('/v1/admin/finance', financeAccountsRouter(prisma));
app.use('/v1/admin/finance', financeAuditRouter(prisma));
app.use('/v1/admin/finance', financeBeneficiariesRouter(prisma));
app.use('/v1/admin/finance', financeCapabilitiesRouter(prisma));
app.use('/v1/admin/finance', financeConnectionsRouter(prisma));
app.use('/v1/admin/finance', financeDisputesRouter(prisma));
app.use('/v1/admin/finance', financePayoutsRouter(prisma));
app.use('/v1/admin/finance', financeReconciliationRouter(prisma));
app.use('/v1/admin/finance', financeRefundsRouter(prisma));
app.use('/v1/admin/finance', financeReportsRouter(prisma));
app.use('/v1/admin/finance', financeSettlementsRouter(prisma));
app.use('/v1/admin/finance', financeTransactionsRouter(prisma));
app.use('/v1/finance/webhooks', financeWebhooksRouter(prisma));
app.use('/v1/admin/staff', employeeEmailsRouter(prisma));
app.use('/v1/staff-dashboard', staffDashboardRouter(prisma));
app.use('/v1/client-projects', clientProjectsRouter(prisma));
app.use('/v1/client-portal', clientPortalRouter(prisma));
app.use('/v1/site', siteRouter(prisma));
app.use('/v1/newsletter', newsletterRouter(prisma));
app.use('/v1/faqs', faqRouter(prisma));
app.use('/v1/chatbot', chatbotRouter(prisma));
app.use('/v1/notifications', notificationsRouter());
app.use('/v1/announcements', announcementsRouter());
app.use('/v1/newsletters', newslettersRouter());
app.use('/v1/surveys', surveysRouter());
app.use('/v1/leads', leadsRouter());
app.use('/v1/support-tickets', supportTicketsRouter());
app.use('/v1/products', productsRouter());
app.use('/v1/roles', rolesRouter());
app.use('/v1/admin', staffAccessRouter());
app.use('/v1/employee-profiles', employeeProfilesRouter());
app.use('/v1/careers', careersRouter());
app.use('/v1/company-stats', companyStatsRouter());
app.use('/v1/home-sections', homeSectionsRouter());
app.use('/v1/about-sections', aboutSectionsRouter());
app.use('/v1/staff-blogs', staffBlogsRouter());
app.use('/v1/certifications', certificationsRouter());
app.use('/v1/product-inquiries', productInquiriesRouter());
app.use('/v1/opportunities', opportunitiesRouter());
app.use('/v1/quotes', quotesRouter());
app.use('/v1/invoices', invoicesRouter());
app.use('/v1/expenses', expensesRouter(prisma));
app.use('/v1/leave-requests', leaveRequestsRouter(prisma));
app.use('/v1/attendance', attendanceRouter(prisma));
app.use('/v1/payroll', payrollRouter(prisma));
app.use('/v1/approvals', approvalsRouter(prisma));
app.use('/v1/product-faqs', productFaqsRouter());
app.use('/v1/contact-enquiries', contactEnquiriesRouter());
app.use('/v1/industries', industriesRouter());
app.use('/v1/solutions', solutionsRouter());
app.use('/health', healthRouter(prisma));
// Compatibility alias: the health check was historically referenced as
// `/v1/health` (and Netlify's SPA fallback answered it with HTML, masking the
// 404). Keep both paths live so monitors using either URL keep working.
app.use('/v1/health', healthRouter(prisma));

// Analytics middleware
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/v1/') && !req.path.startsWith('/health')) {
        trackPageView(req.path, req).catch(() => { });
    }
    next();
});

// Legacy admin route (kept for compatibility)
app.post('/v1/admin/revoke/:employeeId', requireAuth, asyncHandler(async (req, res) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Not allowed' });
    const employeeId = (req.params as any).employeeId;
    await prisma.orm.public.RefreshToken.where((r) => r.employeeId.eq(employeeId)).delete();
    res.json({ ok: true });
}));




// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
