import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import inviteRouter from './routes/invite';
import bookingsRouter from './routes/bookings';
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

app.get('/', (req, res) => res.send('AngiSoft Technologies API (Postgres)'));

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
