import { Router, type Response } from 'express';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requirePermission } from '../../../shared/middleware/roles';
import db, { type Db } from '../../../db';
import { CrmError } from '../services/errors';
import {
  createOpportunity,
  deleteOpportunity,
  getOpportunity,
  listOpportunities,
  updateOpportunity,
  type CreateOpportunityInput,
  type UpdateOpportunityInput,
} from '../services/opportunities';

export {
  OPPORTUNITY_STAGE_FLOW,
  OPPORTUNITY_STAGE_ORDER,
  isLegalStageTransition,
} from '../services/opportunities';

function fail(res: Response, err: unknown) {
  const status = err instanceof CrmError ? err.statusCode : 500;
  const message = err instanceof CrmError ? err.message : 'CRM error';
  res.status(status).json({ error: message });
}

export default function opportunitiesRouter(prisma: Db = db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', requirePermission('opportunities.view'), async (req: AuthRequest, res) => {
    try {
      const { stage, clientId, leadId, assignedToId } = req.query;
      const opportunities = await listOpportunities(prisma, {
        stage: stage ? String(stage) : undefined,
        clientId: clientId ? String(clientId) : undefined,
        leadId: leadId ? String(leadId) : undefined,
        assignedToId: assignedToId ? String(assignedToId) : undefined,
      });
      res.json(opportunities);
    } catch (err) {
      fail(res, err);
    }
  });

  router.post('/', requirePermission('opportunities.create'), async (req: AuthRequest, res) => {
    try {
      const opportunity = await createOpportunity(
        prisma,
        req.body as CreateOpportunityInput,
        req.user?.sub ?? null,
      );
      res.status(201).json(opportunity);
    } catch (err) {
      fail(res, err);
    }
  });

  router.get('/:id', requirePermission('opportunities.view'), async (req: AuthRequest, res) => {
    try {
      const opportunity = await getOpportunity(prisma, req.params.id);
      if (!opportunity) return res.status(404).json({ error: 'Opportunity not found' });
      res.json(opportunity);
    } catch (err) {
      fail(res, err);
    }
  });

  router.patch('/:id', requirePermission('opportunities.update'), async (req: AuthRequest, res) => {
    try {
      const opportunity = await updateOpportunity(
        prisma,
        req.params.id,
        req.body as UpdateOpportunityInput,
      );
      res.json(opportunity);
    } catch (err) {
      fail(res, err);
    }
  });

  router.delete('/:id', requirePermission('opportunities.delete'), async (req: AuthRequest, res) => {
    try {
      await deleteOpportunity(prisma, req.params.id);
      res.status(204).send();
    } catch (err) {
      fail(res, err);
    }
  });

  return router;
}
