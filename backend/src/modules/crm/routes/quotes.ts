import { Router, type Response } from 'express';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requirePermission } from '../../../shared/middleware/roles';
import db, { type Db } from '../../../db';
import { CrmError } from '../services/errors';
import { has as hasPermission } from '../../identity/services/effectivePermissions';
import { approvalRuleFor, requiresApproval } from '../services/approvalRules';
import {
  convertQuoteToInvoice,
  createQuote,
  getQuote,
  listQuotes,
  updateQuote,
  type CreateQuoteInput,
  type UpdateQuoteInput,
} from '../services/quotes';

export {
  QUOTE_STAGE_FLOW,
  QUOTE_STATUS_ORDER,
  isLegalStageTransition,
} from '../services/quotes';

function fail(res: Response, err: unknown) {
  const status = err instanceof CrmError ? err.statusCode : 500;
  const message = err instanceof CrmError ? err.message : 'CRM error';
  res.status(status).json({ error: message });
}

export default function quotesRouter(prisma: Db = db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', requirePermission('quotes.view'), async (req: AuthRequest, res) => {
    try {
      const { status, opportunityId, clientId } = req.query;
      const quotes = await listQuotes(prisma, {
        status: status ? String(status) : undefined,
        opportunityId: opportunityId ? String(opportunityId) : undefined,
        clientId: clientId ? String(clientId) : undefined,
      });
      res.json(quotes);
    } catch (err) {
      fail(res, err);
    }
  });

  router.post('/', requirePermission('quotes.create'), async (req: AuthRequest, res) => {
    try {
      const quote = await createQuote(prisma, req.body as CreateQuoteInput, req.user?.sub ?? null);
      res.status(201).json(quote);
    } catch (err) {
      fail(res, err);
    }
  });

  router.get('/:id', requirePermission('quotes.view'), async (req: AuthRequest, res) => {
    try {
      const quote = await getQuote(prisma, req.params.id);
      if (!quote) return res.status(404).json({ error: 'Quote not found' });
      res.json(quote);
    } catch (err) {
      fail(res, err);
    }
  });

  router.patch('/:id', requirePermission('quotes.update'), async (req: AuthRequest, res) => {
    try {
      const body = req.body as UpdateQuoteInput;
      // Approval rules engine (Phase 4.2): sending a quote at or above the
      // configured threshold requires the elevated `quotes.approve` grant in
      // addition to `quotes.update`. Other transitions are unaffected.
      if (body.status === 'sent') {
        const existing = await getQuote(prisma, req.params.id);
        if (existing && requiresApproval('quote', existing.total)) {
          const rule = approvalRuleFor('quote');
          const allowed = await hasPermission(
            { employeeId: req.user?.sub ?? '', systemRole: req.user?.role },
            rule.requiredPermission,
          );
          if (!allowed) {
            return res.status(403).json({
              error: `Quotes at or above the approval threshold require the '${rule.requiredPermission}' permission`,
            });
          }
        }
      }
      const quote = await updateQuote(prisma, req.params.id, body);
      res.json(quote);
    } catch (err) {
      fail(res, err);
    }
  });

  router.post('/:id/convert-to-invoice', requirePermission('invoices.create'), async (req: AuthRequest, res) => {
    try {
      const body = req.body as { dueDays?: number };
      const invoice = await convertQuoteToInvoice(
        prisma,
        req.params.id,
        req.user?.sub ?? null,
        body.dueDays,
      );
      res.status(201).json(invoice);
    } catch (err) {
      fail(res, err);
    }
  });

  return router;
}
