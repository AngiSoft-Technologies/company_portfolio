import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export default function healthRouter(prisma: PrismaClient) {
    const router = Router();

    router.get('/', async (req, res) => {
        const start = Date.now();
        try {
            // Check database connection + get version
            const result: any[] = await prisma.$queryRaw`SELECT version()`;
            const dbLatency = Date.now() - start;
            const pgVersion = result[0]?.version ?? 'unknown';

            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development',
                database: {
                    status: 'connected',
                    latencyMs: dbLatency,
                    version: pgVersion,
                    provider: (process.env.DATABASE_URL || '').includes('.neon.tech')
                        ? 'neon-serverless'
                        : 'postgres-direct',
                },
            });
        } catch (err: any) {
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: err.message,
                database: {
                    status: 'disconnected',
                    latencyMs: Date.now() - start,
                },
            });
        }
    });

    router.get('/ready', async (req, res) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            res.json({ ready: true });
        } catch {
            res.status(503).json({ ready: false });
        }
    });

    return router;
}
