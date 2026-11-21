import { Router } from 'express';
import { z } from 'zod';
import { publicFormLimiter } from '../middleware/rateLimiter';
import { logAudit } from '../services/audit';

const router = Router();

const consentSchema = z.object({
  privacy: z.literal(true),
  terms: z.literal(true),
  policyVersion: z.string().min(1).max(40).optional(),
  source: z.string().max(80).optional(),
});

/**
 * Anonymous but auditable acceptance of the client-facing Privacy Policy and
 * Terms. The frontend still stores the acceptance locally so repeat visitors
 * are not sent back here, while this record is the server-side proof.
 */
router.post('/', publicFormLimiter, async (req, res) => {
  const parsed = consentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Both privacy policy and terms acceptance are required' });
  }

  const acceptedAt = new Date().toISOString();
  await logAudit({
    action: 'client_consent_accepted',
    entity: 'ClientConsent',
    entityId: parsed.data.policyVersion || 'default',
    meta: {
      privacy: true,
      terms: true,
      policyVersion: parsed.data.policyVersion || 'default',
      source: parsed.data.source || 'web',
      acceptedAt,
      ip: req.ip || null,
      userAgent: req.get('user-agent') || null,
    },
  });

  res.json({ ok: true, acceptedAt });
});

export default router;
