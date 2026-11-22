import { Router } from 'express';
import type { Db } from '../../../db';
import { requireAuth, type AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { financeReportToCsv, generateFinanceReport } from '../services/reports';
import { actor, route } from './helpers';

const VIEW_ROLES = ['ADMIN', 'MANAGER', 'SUPER_ADMIN'];

export default function financeReportsRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get(['/', '/reports'], requireAccess('finance.reports.view', VIEW_ROLES), route(async (req: AuthRequest, res) => {
    const report = await generateFinanceReport(prisma, {
      provider: req.query.provider ? String(req.query.provider) : undefined,
      financeAccountId: req.query.financeAccountId ? String(req.query.financeAccountId) : undefined,
      currency: req.query.currency ? String(req.query.currency) : undefined,
      country: req.query.country ? String(req.query.country) : undefined,
      channel: req.query.channel ? String(req.query.channel) : undefined,
      periodStart: req.query.periodStart ? String(req.query.periodStart) : undefined,
      periodEnd: req.query.periodEnd ? String(req.query.periodEnd) : undefined,
      actorId: actor(req).actorId,
    });
    await logAudit({
      ...actor(req), action: 'finance.report.view', entity: 'FinanceReport',
      meta: { filters: report.filters },
    });
    if (String(req.query.format || '').toLowerCase() === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="finance-report.csv"');
      return res.send(financeReportToCsv(report));
    }
    return res.json(report);
  }));

  return router;
}
