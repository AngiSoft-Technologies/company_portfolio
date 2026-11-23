import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import db from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { AuthRequest, requireAuth } from '../../../shared/middleware/auth';
import { addMoney, mulMoney, subMoney, sumMoney, toMoney } from '../../billing/utils/money';
import { createResourceRouter, DEFAULT_FALLBACK_ROLES, hasAccess } from '../services/resourceRouter';
import { ORDER_MACHINE } from '../services/stageMachines';
import { documentNumber, publicReference } from '../services/reference';
import { logAudit } from '../../../shared/services/audit';

/**
 * Sales-order workflow: draft → confirmed → processing → fulfilled →
 * invoiced → paid, with cancellation before fulfilment. Line items are kept
 * in their own additive table and roll their totals up into the order.
 */

const OPP_VIEW = 'opportunities.view';
const OPP_CREATE = 'opportunities.create';
const OPP_UPDATE = 'opportunities.update';
const OPP_DELETE = 'opportunities.delete';
const INVOICE_ISSUE = 'invoices.issue';
const INVOICE_UPDATE = 'invoices.update';

const moneyish = z.union([z.number(), z.string()]);
const moneyOrZero = (value: unknown) => toMoney(value as any);

const orderCreate = z.object({
  clientId: z.string().nullable().optional(),
  quoteId: z.string().nullable().optional(),
  bookingId: z.string().nullable().optional(),
  contractId: z.string().nullable().optional(),
  title: z.string().min(2).max(200),
  subtotal: moneyish.default('0'),
  discount: moneyish.default('0'),
  tax: moneyish.default('0'),
  total: moneyish.optional(),
  currency: z.string().length(3).default('KES'),
  orderedAt: z.string().nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
});

const itemCreate = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().int().positive().default(1),
  unitPrice: moneyish,
  lineTotal: moneyish.optional(),
  serviceId: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
});

async function recalculateTotals(prisma: Db, orderId: string) {
  const items = await prisma.orm.public.SalesOrderLineItem.where({ orderId }).all();
  const subtotal = sumMoney(items.map((item: any) => item.lineTotal));
  const order: any = await prisma.orm.public.SalesOrder.where({ id: orderId }).first();
  if (!order) return null;
  const total = addMoney(subMoney(subtotal, order.discount), order.tax);
  return prisma.orm.public.SalesOrder.where({ id: orderId }).update({
    subtotal,
    total,
    updatedAt: ts(),
  });
}

export default function ordersRouter(prisma: Db = db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/:id/items', async (req: AuthRequest, res) => {
    if (!(await hasAccess(req, OPP_VIEW, DEFAULT_FALLBACK_ROLES))) {
      return res.status(403).json({ error: `Not authorized — missing ${OPP_VIEW}` });
    }
    try {
      const order: any = await prisma.orm.public.SalesOrder.where({ id: req.params.id }).first();
      if (!order) return res.status(404).json({ error: 'SalesOrder not found' });
      const items = await prisma.orm.public.SalesOrderLineItem
        .where({ orderId: req.params.id })
        .orderBy((item: any) => item.sortOrder.asc())
        .all();
      res.json(items);
    } catch (err: any) {
      res.status(400).json({ error: err?.message ?? 'Could not list items' });
    }
  });

  router.post('/:id/items', async (req: AuthRequest, res) => {
    if (!(await hasAccess(req, OPP_UPDATE, DEFAULT_FALLBACK_ROLES))) {
      return res.status(403).json({ error: `Not authorized — missing ${OPP_UPDATE}` });
    }
    try {
      const order: any = await prisma.orm.public.SalesOrder.where({ id: req.params.id }).first();
      if (!order) return res.status(404).json({ error: 'SalesOrder not found' });
      const parsed = itemCreate.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
      const d = parsed.data;
      const item = await prisma.orm.public.SalesOrderLineItem.create({
        id: newId(),
        orderId: req.params.id,
        description: d.description,
        quantity: d.quantity,
        unitPrice: toMoney(d.unitPrice),
        lineTotal: d.lineTotal !== undefined ? toMoney(d.lineTotal) : mulMoney(d.unitPrice, d.quantity),
        serviceId: d.serviceId ?? null,
        productId: d.productId ?? null,
        sortOrder: d.sortOrder,
        createdAt: ts(),
      });
      await recalculateTotals(prisma, req.params.id);
      await logAudit({
        actorId: req.user!.sub,
        actorRole: req.user!.role ?? null,
        action: 'SalesOrder.item.create',
        entity: 'SalesOrderLineItem',
        entityId: item.id,
        meta: { orderId: req.params.id },
      });
      res.status(201).json(item);
    } catch (err: any) {
      res.status(400).json({ error: err?.message ?? 'Could not add item' });
    }
  });

  router.delete('/:id/items/:itemId', async (req: AuthRequest, res) => {
    if (!(await hasAccess(req, OPP_UPDATE, DEFAULT_FALLBACK_ROLES))) {
      return res.status(403).json({ error: `Not authorized — missing ${OPP_UPDATE}` });
    }
    try {
      const item: any = await prisma.orm.public.SalesOrderLineItem
        .where({ id: req.params.itemId, orderId: req.params.id })
        .first();
      if (!item) return res.status(404).json({ error: 'Line item not found' });
      await prisma.orm.public.SalesOrderLineItem
        .where({ id: item.id, orderId: req.params.id })
        .delete();
      await recalculateTotals(prisma, req.params.id);
      await logAudit({
        actorId: req.user!.sub,
        actorRole: req.user!.role ?? null,
        action: 'SalesOrder.item.delete',
        entity: 'SalesOrderLineItem',
        entityId: item.id,
        meta: { orderId: req.params.id },
      });
      res.status(204).send();
    } catch (err: any) {
      res.status(400).json({ error: err?.message ?? 'Could not delete item' });
    }
  });

  router.use(
    '/',
    createResourceRouter(
      {
        model: 'SalesOrder',
        entity: 'SalesOrder',
        permissions: {
          view: OPP_VIEW,
          create: OPP_CREATE,
          update: OPP_UPDATE,
          remove: OPP_DELETE,
        },
        createSchema: orderCreate,
        buildCreate: (data, _req, now) => {
          const subtotal = moneyOrZero(data.subtotal);
          const discount = moneyOrZero(data.discount);
          const tax = moneyOrZero(data.tax);
          return {
            publicReference: publicReference('SO'),
            number: documentNumber('SO', new Date(now)),
            clientId: data.clientId ?? null,
            quoteId: data.quoteId ?? null,
            bookingId: data.bookingId ?? null,
            contractId: data.contractId ?? null,
            title: data.title,
            status: ORDER_MACHINE.initial,
            subtotal,
            discount,
            tax,
            total: data.total !== undefined ? toMoney(data.total) : addMoney(subMoney(subtotal, discount), tax),
            currency: String(data.currency).toUpperCase(),
            orderedAt: data.orderedAt ? ts(data.orderedAt) : null,
            fulfilledAt: null,
            cancelledAt: null,
            notes: data.notes ?? null,
            createdAt: now,
            updatedAt: now,
          };
        },
        buildUpdate: (data) => {
          const out: Record<string, unknown> = { ...data };
          for (const field of ['subtotal', 'discount', 'tax', 'total']) {
            if (field in out) out[field] = toMoney(out[field] as any);
          }
          if ('currency' in out) out.currency = String(out.currency).toUpperCase();
          if ('orderedAt' in out) out.orderedAt = out.orderedAt ? ts(String(out.orderedAt)) : null;
          return out;
        },
        queryFields: ['status', 'clientId', 'quoteId', 'bookingId', 'contractId'],
        transition: {
          machineName: 'SalesOrder',
          machine: ORDER_MACHINE,
          permissionFor: (target) => {
            if (target === 'invoiced') return INVOICE_ISSUE;
            if (target === 'paid') return INVOICE_UPDATE;
            if (target === 'cancelled') return OPP_DELETE;
            return OPP_UPDATE;
          },
          patchFor: (target, _existing, _req, now) => ({
            ...(target === 'confirmed' ? { orderedAt: now } : {}),
            ...(target === 'fulfilled' ? { fulfilledAt: now } : {}),
            ...(target === 'cancelled' ? { cancelledAt: now } : {}),
          }),
        },
      },
      prisma,
    ),
  );

  return router;
}

export { orderCreate, itemCreate };
