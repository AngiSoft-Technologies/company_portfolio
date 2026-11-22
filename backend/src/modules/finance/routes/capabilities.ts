import { Router } from 'express';
import type { Db } from '../../../db';
import { requireAuth } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { listCapabilityMatrix, listPayHeroChannels } from '../services/capabilityMatrix';
import { route } from './helpers';

const VIEW_ROLES = ['ADMIN', 'MANAGER', 'SUPER_ADMIN'];

export default function financeCapabilitiesRouter(_prisma?: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get(['/', '/capabilities'], requireAccess('finance.connections.view', VIEW_ROLES), route(async (_req, res) => {
    return res.json({
      providers: listCapabilityMatrix(),
      payheroChannels: listPayHeroChannels(),
      policy: {
        international: 'PayPal is the default rail; settles in PAYPAL_CURRENCY and preserves original invoice currency/amount in metadata',
        eastAfrica: 'PayHero and Safaricom Daraja are the default rails for M-Pesa, Airtel, telcos, banks and wallets',
        legacy: 'Stripe and Paystack are legacy-only and never routed by the Finance Hub',
      },
    });
  }));

  return router;
}
