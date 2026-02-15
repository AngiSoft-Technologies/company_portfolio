import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import inviteRouter from './routes/invite';
import bookingsRouter from './routes/bookings';
import chatbotRouter from './routes/chatbot';
import paymentsRouter from './routes/payments';
import authRouter from './routes/auth';
import uploadsRouter from './routes/uploads';
import servicesRouter from './routes/services';
import projectsRouter from './routes/projects';
import blogsRouter from './routes/blogs';
import testimonialsRouter from './routes/testimonials';
import serviceCategoriesRouter from './routes/service-categories';
import settingsRouter from './routes/settings';
import staffRouter from './routes/staff';
import adminRouter from './routes/admin';
import staffDashboardRouter from './routes/staff-dashboard';
import healthRouter from './routes/health';
import siteRouter from './routes/site';
import newsletterRouter from './routes/newsletter';
import faqRouter from './routes/faq';
import { authRateLimiter } from './middleware/rateLimiter';
import { requireAuth } from './middleware/auth';
import { sanitizeMiddleware } from './middleware/validation';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { initSentry } from './services/monitoring/sentry';
import prisma from './db';

dotenv.config();
initSentry();
const app = express();
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
}));
// Production CORS: allow frontend domains (set CORS_ORIGIN in env or use defaults)
const defaultOrigins = ['https://angisoft.co.ke', 'https://www.angisoft.co.ke'];
const allowed = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : defaultOrigins;
app.use(cors({ origin: allowed, credentials: true } as any));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(sanitizeMiddleware);

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
app.use('/api/uploads', uploadsRouter());
app.use('/api/services', servicesRouter());
app.use('/api/projects', projectsRouter());
app.use('/api/blogs', blogsRouter());
app.use('/api/testimonials', testimonialsRouter());
app.use('/api/service-categories', serviceCategoriesRouter());
app.use('/api/settings', requireAuth, settingsRouter());
app.use('/api/staff', staffRouter(prisma));
app.use('/api/admin', adminRouter(prisma));
app.use('/api/staff-dashboard', staffDashboardRouter(prisma));
app.use('/api/site', siteRouter(prisma));
app.use('/api/newsletter', newsletterRouter(prisma));
app.use('/api/faqs', faqRouter(prisma));
app.use('/api/chatbot', chatbotRouter(prisma));
app.use('/health', healthRouter(prisma));

// Legacy admin route (kept for compatibility)
app.post('/api/admin/revoke/:employeeId', requireAuth, async (req, res) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Not allowed' });
    const employeeId = (req.params as any).employeeId;
    await prisma.refreshToken.deleteMany({ where: { employeeId } });
    res.json({ ok: true });
});




// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
