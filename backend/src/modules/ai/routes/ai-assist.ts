import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requirePermission, requireAccess } from '../../../shared/middleware/roles';
import db, { type Db } from '../../../db';
import { scoreLead, triageTicket, suggestContent, reviewDiff } from '../services/aiAssist';

/**
 * AI assistance endpoints (Phase 4.5). Mounted at /v1/admin alongside
 * ai-config; each endpoint is gated by the permission of the domain it
 * assists so assist access mirrors the underlying data access.
 */
export default function aiAssistRouter(prisma: Db = db) {
  const router = Router();
  router.use(requireAuth);

  router.post('/ai-assist/lead-score', requirePermission('leads.view'), async (req: AuthRequest, res) => {
    const result = await scoreLead(prisma, req.body ?? {});
    res.status(result.ok ? 200 : 502).json(result);
  });

  router.post('/ai-assist/ticket-triage', requirePermission('support_tickets.view'), async (req: AuthRequest, res) => {
    const result = await triageTicket(prisma, req.body ?? {});
    res.status(result.ok ? 200 : 502).json(result);
  });

  router.post('/ai-assist/content-suggest', requirePermission('publications.create'), async (req: AuthRequest, res) => {
    const result = await suggestContent(prisma, req.body ?? {});
    res.status(result.ok ? 200 : 502).json(result);
  });

  router.post('/ai-assist/review-diff', requireAccess('ai_config.view', ['ADMIN', 'DEVELOPER']), async (req: AuthRequest, res) => {
    const result = await reviewDiff(prisma, req.body ?? {});
    res.status(result.ok ? 200 : 502).json(result);
  });

  return router;
}
