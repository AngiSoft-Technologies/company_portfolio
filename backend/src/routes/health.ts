import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export default function healthRouter(prisma: PrismaClient) {
    const router = Router();

    router.get('/', async (req, res) => {
        try {
            // Check database connection
            await prisma.$queryRaw`SELECT 1`;
            
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development',
                database: 'connected'
            });
        } catch (err: any) {
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: err.message,
                database: 'disconnected'
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
