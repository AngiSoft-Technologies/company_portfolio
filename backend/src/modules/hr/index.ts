import { Router } from 'express';
import type { Db } from '../../db';
import db from '../../db';
import { requireAuth } from '../../shared/middleware/auth';
import recruitingRouter from './routes/recruiting';
import contractsRouter from './routes/contracts';
import ordersRouter from './routes/orders';

/**
 * Full ERP/HR closeout API mounted at /v1/hr:
 *   /recruiting/requisitions|candidates|offers
 *   /contracts
 *   /orders (+ /:id/items)
 */
export default function hrRouter(prisma: Db = db) {
  const router = Router();
  router.use(requireAuth);
  router.use('/recruiting', recruitingRouter(prisma));
  router.use('/contracts', contractsRouter(prisma));
  router.use('/orders', ordersRouter(prisma));
  return router;
}

export { default as recruitingRouter } from './routes/recruiting';
export { default as contractsRouter } from './routes/contracts';
export { default as ordersRouter } from './routes/orders';
export * from './services/stageMachines';
