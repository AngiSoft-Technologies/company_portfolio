import { Router } from 'express';
import type { Db } from '../../../db';
import { requireAuth } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { allRows, route } from './helpers';

const VIEW_ROLES = ['ADMIN', 'MANAGER', 'SUPER_ADMIN'];

export default function financeAuditRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get(['/', '/audit'], requireAccess('finance.audit.view', VIEW_ROLES), route(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const rows = await allRows(prisma.orm.public.AuditLog.orderBy((a: any) => a.createdAt.desc()).limit(500).all());
    const prefix = String(req.query.action || 'finance.').toLowerCase();
    const actorId = req.query.actorId ? String(req.query.actorId) : null;
    const filtered = rows.filter((row) => {
      if (prefix && !String(row.action || '').toLowerCase().includes(prefix.replace(/\.$/, ''))) return false;
      if (actorId && String(row.actorId || '') !== actorId) return false;
      return true;
    });
    return res.json({ audit: filtered.slice(0, limit) });
  }));

  return router;
}
