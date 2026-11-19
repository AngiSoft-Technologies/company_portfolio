import { Router, type Response } from 'express';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requirePermission } from '../../../shared/middleware/roles';
import db, { type Db } from '../../../db';
import { CrmError } from '../services/errors';
import {
  createInvoice,
  deleteInvoice,
  getInvoice,
  listInvoices,
  recordInvoicePayment,
  updateInvoice,
  type CreateInvoiceInput,
  type UpdateInvoiceInput,
} from '../services/invoices';

export {
  INVOICE_STAGE_FLOW,
  INVOICE_STATUS_ORDER,
  isLegalStageTransition,
} from '../services/invoices';

function fail(res: Response, err: unknown) {
  const status = err instanceof CrmError ? err.statusCode : 500;
  const message = err instanceof CrmError ? err.message : 'CRM error';
  res.status(status).json({ error: message });
}

export default function invoicesRouter(prisma: Db = db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', requirePermission('invoices.view'), async (req: AuthRequest, res) => {
    try {
      const { status, clientId, quoteId } = req.query;
      const invoices = await listInvoices(prisma, {
        status: status ? String(status) : undefined,
        clientId: clientId ? String(clientId) : undefined,
        quoteId: quoteId ? String(quoteId) : undefined,
      });
      res.json(invoices);
    } catch (err) {
      fail(res, err);
    }
  });

  router.post('/', requirePermission('invoices.create'), async (req: AuthRequest, res) => {
    try {
      const invoice = await createInvoice(prisma, req.body as CreateInvoiceInput, req.user?.sub ?? null);
      res.status(201).json(invoice);
    } catch (err) {
      fail(res, err);
    }
  });

  router.get('/:id', requirePermission('invoices.view'), async (req: AuthRequest, res) => {
    try {
      const invoice = await getInvoice(prisma, req.params.id);
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
      res.json(invoice);
    } catch (err) {
      fail(res, err);
    }
  });

  router.patch('/:id', requirePermission('invoices.update'), async (req: AuthRequest, res) => {
    try {
      const invoice = await updateInvoice(prisma, req.params.id, req.body as UpdateInvoiceInput);
      res.json(invoice);
    } catch (err) {
      fail(res, err);
    }
  });

  router.post('/:id/mark-paid', requirePermission('invoices.update'), async (req: AuthRequest, res) => {
    try {
      const body = req.body as { amount?: unknown; amountPaid?: unknown; payment?: unknown };
      const invoice = await recordInvoicePayment(
        prisma,
        req.params.id,
        (body.amount ?? body.amountPaid ?? body.payment) as Parameters<typeof recordInvoicePayment>[2],
      );
      res.json(invoice);
    } catch (err) {
      fail(res, err);
    }
  });

  router.delete('/:id', requirePermission('invoices.delete'), async (req: AuthRequest, res) => {
    try {
      await deleteInvoice(prisma, req.params.id);
      res.status(204).send();
    } catch (err) {
      fail(res, err);
    }
  });

  return router;
}
