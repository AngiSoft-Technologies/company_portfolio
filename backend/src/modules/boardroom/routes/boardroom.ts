import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { AuthRequest, requireAuth } from '../../../shared/middleware/auth';
import { boardroomLimiter } from '../../../shared/middleware/rateLimiter';
import { requireAccess } from '../../../shared/middleware/roles';
import { AGENT_REGISTRY } from '../../agents/services/agentRegistry';
import {
    createSession,
    finalizeSession,
    getSession,
    listSessions,
    postMessage,
    recentReports,
} from '../services/boardroom';

/**
 * AI Boardroom admin API — mounted at /api/admin/boardroom.
 *
 * SUPER_ADMIN only. Every mutation is CSRF-protected, rate-limited and
 * audit-logged. Agent output is untrusted context, never a command source.
 */

const AGENT_KEYS = (AGENT_REGISTRY as any[]).map((a) => String(a.key)) as [string, ...string[]];

const messageSchema = z.object({
    content: z.string().min(1).max(2000),
    agentKey: z.enum(AGENT_KEYS).optional(),
    askAll: z.boolean().optional(),
}).strict();

const finalizeSchema = z.object({
    decision: z.string().max(2000).optional(),
    actionItems: z.array(z.string().min(1).max(300)).max(5).optional(),
}).strict();

export default function boardroomRouter(prisma: Db) {
    const router = Router();
    router.use(requireAuth);
    // Boardroom minutes can contain sensitive company and personnel context.
    // Keep this room strictly owner-only; permission grants alone are not enough.
    router.use((req: AuthRequest, res, next) => {
        if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Not authorized' });
        return next();
    });
    router.use(requireAccess('agents.manage', []));

    const owner = (req: AuthRequest) => String(req.user?.sub ?? 'unknown');

    router.get('/', async (_req: AuthRequest, res) => {
        try {
            res.json({ sessions: await listSessions(prisma) });
        } catch {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.get('/sessions', async (_req: AuthRequest, res) => {
        try {
            res.json({ sessions: await listSessions(prisma) });
        } catch {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.get('/reports', async (_req: AuthRequest, res) => {
        try {
            res.json({ reports: await recentReports(prisma) });
        } catch {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.post('/sessions', boardroomLimiter, async (req: AuthRequest, res) => {
        try {
            const session = await createSession(prisma, owner(req));
            res.status(201).json({ session });
        } catch {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.get('/sessions/:id', async (req: AuthRequest, res) => {
        try {
            const session = await getSession(prisma, req.params.id);
            if (!session) return res.status(404).json({ error: 'Session not found' });
            res.json({ session });
        } catch {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.post('/sessions/:id/messages', boardroomLimiter, async (req: AuthRequest, res) => {
        try {
            const parsed = messageSchema.safeParse(req.body ?? {});
            if (!parsed.success) return res.status(400).json({ error: 'Invalid message' });
            const session = await postMessage(prisma, req.params.id, owner(req), parsed.data);
            if (!session) return res.status(404).json({ error: 'Session not found' });
            res.json({ session });
        } catch (err: any) {
            const status = Number(err?.status) || 500;
            res.status(status).json({ error: status === 429 ? err.message : 'Server error' });
        }
    });

    router.post('/sessions/:id/finalize', boardroomLimiter, async (req: AuthRequest, res) => {
        try {
            const parsed = finalizeSchema.safeParse(req.body ?? {});
            if (!parsed.success) return res.status(400).json({ error: 'Invalid meeting notes' });
            const session = await finalizeSession(prisma, req.params.id, owner(req), parsed.data);
            if (!session) return res.status(404).json({ error: 'Session not found' });
            res.json({ session });
        } catch {
            res.status(500).json({ error: 'Server error' });
        }
    });

    return router;
}
