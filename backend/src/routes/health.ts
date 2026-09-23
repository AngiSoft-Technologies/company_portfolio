import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { getWorkers } from '../queue';
import { getRedisUrl, redisConnectionOptions } from '../services/redis';

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

    // Deep readiness probe for orchestration (Railway): DB hard-gated; Redis —
    // if configured — must answer a ping; background workers must be up. All
    // checks reported individually so operators see exactly what is failing.
    router.get('/readyz', async (req, res) => {
        const checks: Record<string, unknown> = {};

        let dbOk = false;
        try {
            await prisma.$queryRaw`SELECT 1`;
            dbOk = true;
        } catch (err: any) {
            checks.databaseError = err.message;
        }
        checks.database = dbOk;

        let redisOk: boolean | 'not_configured' = 'not_configured';
        const redisUrl = getRedisUrl();
        if (redisUrl) {
            redisOk = false;
            try {
                const Redis = (await import('ioredis')).default;
                const client = new Redis(redisUrl, {
                    ...(redisConnectionOptions() as Record<string, unknown>),
                    lazyConnect: true,
                    maxRetriesPerRequest: 1,
                });
                // Never let a connection 'error' event escape as an unhandled
                // 'error' EventEmitter throw — it would crash the machine.
                client.on('error', () => { /* surfaced via ping failure below */ });
                try {
                    const pong = await Promise.race([client.ping(), new Promise<null>((r) => setTimeout(() => r(null), 1500))]);
                    redisOk = pong === 'PONG';
                } finally {
                    client.disconnect();
                }
            } catch (err: any) {
                checks.redisError = err.message;
            }
        }
        checks.redis = redisOk;

        const workers = getWorkers();
        checks.workers = workers;

        const ready = dbOk && redisOk !== false && workers.every((w) => w.running);
        res.status(ready ? 200 : 503).json({ ready, checks });
    });

    return router;
}
