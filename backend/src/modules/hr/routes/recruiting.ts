import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import db from '../../../db';
import { ts } from '../../../prisma/db';
import { toMoney } from '../../billing/utils/money';
import { createResourceRouter } from '../services/resourceRouter';
import {
  CANDIDATE_MACHINE,
  OFFER_MACHINE,
  REQUISITION_MACHINE,
} from '../services/stageMachines';
import { publicReference } from '../services/reference';

/**
 * Recruiting workflow: requisition → candidate → offer.
 *
 * Dedicated `recruiting.*` keys are not in the canonical permission registry
 * yet, so these routes deliberately reuse existing Staff keys (the HR
 * umbrella) with ADMIN/SUPER_ADMIN fallback. No registry edits are needed.
 */

const STAFF_VIEW = 'staff.view';
const STAFF_INVITE = 'staff.invite';
const STAFF_UPDATE = 'staff.update';
const STAFF_SUSPEND = 'staff.suspend';
const STAFF_ASSIGN = 'staff.assign_permissions';

const money = (value: unknown) => (value === undefined || value === null ? null : toMoney(value as any));
const currency = (value: unknown) => (value === undefined ? undefined : String(value).toUpperCase());

const moneyish = z.union([z.number(), z.string()]);

const requisitionCreate = z.object({
  title: z.string().min(2).max(200),
  department: z.string().max(120).nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  employmentType: z.string().max(40).default('full-time'),
  openings: z.number().int().positive().default(1),
  hiringManagerId: z.string().nullable().optional(),
  jobPostingId: z.string().nullable().optional(),
  budgetAmount: moneyish.nullable().optional(),
  currency: z.string().length(3).default('KES'),
  description: z.string().max(8000).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});

const candidateCreate = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(60).nullable().optional(),
  source: z.string().max(80).nullable().optional(),
  requisitionId: z.string().nullable().optional(),
  jobPostingId: z.string().nullable().optional(),
  rating: z.number().int().min(0).max(5).nullable().optional(),
  assignedToId: z.string().nullable().optional(),
  expectedSalary: moneyish.nullable().optional(),
  currency: z.string().length(3).default('KES'),
  notes: z.string().max(4000).nullable().optional(),
  appliedAt: z.string().optional(),
});

const offerCreate = z.object({
  candidateId: z.string().min(1),
  title: z.string().min(2).max(200),
  requisitionId: z.string().nullable().optional(),
  salaryAmount: moneyish.nullable().optional(),
  currency: z.string().length(3).default('KES'),
  startDate: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});

const mapMoneyAndCurrency = (data: any, fields: string[]) => {
  const out: Record<string, unknown> = { ...data };
  for (const field of fields) {
    if (field in out) out[field] = money(out[field]);
  }
  if ('currency' in out) out.currency = currency(out.currency);
  return out;
};

export default function recruitingRouter(prisma: Db = db) {
  const router = Router();

  router.use(
    '/requisitions',
    createResourceRouter(
      {
        model: 'JobRequisition',
        entity: 'JobRequisition',
        permissions: {
          view: STAFF_VIEW,
          create: STAFF_INVITE,
          update: STAFF_UPDATE,
          remove: STAFF_SUSPEND,
        },
        createSchema: requisitionCreate,
        buildCreate: (data, _req, now) => ({
          publicReference: publicReference('JR'),
          title: data.title,
          department: data.department ?? null,
          location: data.location ?? null,
          employmentType: data.employmentType,
          openings: data.openings,
          status: REQUISITION_MACHINE.initial,
          hiringManagerId: data.hiringManagerId ?? null,
          jobPostingId: data.jobPostingId ?? null,
          budgetAmount: money(data.budgetAmount),
          currency: currency(data.currency),
          description: data.description ?? null,
          notes: data.notes ?? null,
          approvedById: null,
          approvedAt: null,
          closedAt: null,
          createdAt: now,
          updatedAt: now,
        }),
        buildUpdate: (data) => mapMoneyAndCurrency(data, ['budgetAmount']),
        queryFields: ['status', 'department', 'hiringManagerId', 'jobPostingId'],
        transition: {
          machineName: 'JobRequisition',
          machine: REQUISITION_MACHINE,
          permissionFor: (target) => (['closed', 'cancelled'].includes(target) ? STAFF_SUSPEND : STAFF_UPDATE),
          patchFor: (target, _existing, _req, now) =>
            target === 'closed' ? { closedAt: now } : {},
        },
      },
      prisma,
    ),
  );

  router.use(
    '/candidates',
    createResourceRouter(
      {
        model: 'Candidate',
        entity: 'Candidate',
        permissions: {
          view: STAFF_VIEW,
          create: STAFF_INVITE,
          update: STAFF_UPDATE,
          remove: STAFF_SUSPEND,
        },
        createSchema: candidateCreate,
        buildCreate: (data, _req, now) => ({
          publicReference: publicReference('CAND'),
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone ?? null,
          source: data.source ?? null,
          requisitionId: data.requisitionId ?? null,
          jobPostingId: data.jobPostingId ?? null,
          stage: CANDIDATE_MACHINE.initial,
          rating: data.rating ?? null,
          assignedToId: data.assignedToId ?? null,
          expectedSalary: money(data.expectedSalary),
          currency: currency(data.currency),
          notes: data.notes ?? null,
          rejectionReason: null,
          appliedAt: ts(data.appliedAt ?? now),
          hiredAt: null,
          createdAt: now,
          updatedAt: now,
        }),
        buildUpdate: (data) => {
          const out = mapMoneyAndCurrency(data, ['expectedSalary']);
          if ('appliedAt' in out && out.appliedAt) out.appliedAt = ts(String(out.appliedAt));
          return out;
        },
        queryFields: ['stage', 'requisitionId', 'assignedToId', 'source'],
        transition: {
          machineName: 'Candidate',
          machine: CANDIDATE_MACHINE,
          permissionFor: (target) => (target === 'rejected' ? STAFF_SUSPEND : STAFF_UPDATE),
          patchFor: (target, existing, _req, now, note) => ({
            ...(target === 'hired' ? { hiredAt: now } : {}),
            ...(target === 'rejected'
              ? { rejectionReason: note ?? existing.rejectionReason ?? 'Rejected' }
              : {}),
          }),
        },
      },
      prisma,
    ),
  );

  router.use(
    '/offers',
    createResourceRouter(
      {
        model: 'Offer',
        entity: 'Offer',
        permissions: {
          view: STAFF_VIEW,
          create: STAFF_INVITE,
          update: STAFF_UPDATE,
          remove: STAFF_SUSPEND,
        },
        createSchema: offerCreate,
        buildCreate: (data, _req, now) => ({
          publicReference: publicReference('OFF'),
          candidateId: data.candidateId,
          requisitionId: data.requisitionId ?? null,
          contractId: null,
          title: data.title,
          status: OFFER_MACHINE.initial,
          salaryAmount: money(data.salaryAmount),
          currency: currency(data.currency),
          startDate: data.startDate ? ts(data.startDate) : null,
          expiresAt: data.expiresAt ? ts(data.expiresAt) : null,
          sentAt: null,
          acceptedAt: null,
          decisionNote: null,
          approvedById: null,
          approvedAt: null,
          notes: data.notes ?? null,
          createdAt: now,
          updatedAt: now,
        }),
        buildUpdate: (data) => {
          const out = mapMoneyAndCurrency(data, ['salaryAmount']);
          for (const field of ['startDate', 'expiresAt']) {
            if (field in out) out[field] = out[field] ? ts(String(out[field])) : null;
          }
          return out;
        },
        queryFields: ['status', 'candidateId', 'requisitionId'],
        transition: {
          machineName: 'Offer',
          machine: OFFER_MACHINE,
          permissionFor: (target) => {
            if (target === 'accepted' || target === 'contracted') return STAFF_ASSIGN;
            if (['rejected', 'expired', 'withdrawn'].includes(target)) return STAFF_SUSPEND;
            return STAFF_UPDATE;
          },
          patchFor: (target, existing, req, now, note) => ({
            ...(target === 'sent' ? { sentAt: now } : {}),
            ...(target === 'accepted'
              ? { acceptedAt: now, approvedById: req.user!.sub, approvedAt: now }
              : {}),
            ...(['accepted', 'rejected', 'expired', 'withdrawn'].includes(target)
              ? { decisionNote: note ?? existing.decisionNote ?? null }
              : {}),
          }),
        },
      },
      prisma,
    ),
  );

  return router;
}

export { requisitionCreate, candidateCreate, offerCreate };
