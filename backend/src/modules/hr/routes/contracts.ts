import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import db from '../../../db';
import { ts } from '../../../prisma/db';
import { toMoney } from '../../billing/utils/money';
import { createResourceRouter } from '../services/resourceRouter';
import { CONTRACT_MACHINE } from '../services/stageMachines';
import { documentNumber, publicReference } from '../services/reference';

/**
 * Employment/client contract workflow: draft → approved → sent → signed →
 * active → expired|terminated, with cancellation from pre-active stages.
 */

const STAFF_VIEW = 'staff.view';
const STAFF_INVITE = 'staff.invite';
const STAFF_UPDATE = 'staff.update';
const STAFF_SUSPEND = 'staff.suspend';
const STAFF_ASSIGN = 'staff.assign_permissions';

const moneyish = z.union([z.number(), z.string()]);

const contractCreate = z.object({
  number: z.string().max(80).optional(),
  kind: z.string().max(40).default('employment'),
  title: z.string().min(2).max(200),
  partyName: z.string().max(200).nullable().optional(),
  partyEmail: z.string().email().nullable().optional(),
  employeeId: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
  candidateId: z.string().nullable().optional(),
  offerId: z.string().nullable().optional(),
  requisitionId: z.string().nullable().optional(),
  valueAmount: moneyish.nullable().optional(),
  currency: z.string().length(3).default('KES'),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  terms: z.record(z.string(), z.any()).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
});

const moneyOrNull = (value: unknown) =>
  value === undefined || value === null ? null : toMoney(value as any);

const mapContract = (data: any) => {
  const out: Record<string, unknown> = { ...data };
  if ('valueAmount' in out) out.valueAmount = moneyOrNull(out.valueAmount);
  if ('currency' in out) out.currency = String(out.currency).toUpperCase();
  for (const field of ['startDate', 'endDate']) {
    if (field in out) out[field] = out[field] ? ts(String(out[field])) : null;
  }
  return out;
};

export default function contractsRouter(prisma: Db = db) {
  return createResourceRouter(
    {
      model: 'Contract',
      entity: 'Contract',
      permissions: {
        view: STAFF_VIEW,
        create: STAFF_INVITE,
        update: STAFF_UPDATE,
        remove: STAFF_SUSPEND,
      },
      createSchema: contractCreate,
      buildCreate: (data, _req, now) => ({
        publicReference: publicReference('CTR'),
        number: data.number ?? documentNumber('CTR', new Date(now)),
        kind: data.kind,
        title: data.title,
        status: CONTRACT_MACHINE.initial,
        partyName: data.partyName ?? null,
        partyEmail: data.partyEmail ?? null,
        employeeId: data.employeeId ?? null,
        clientId: data.clientId ?? null,
        candidateId: data.candidateId ?? null,
        offerId: data.offerId ?? null,
        requisitionId: data.requisitionId ?? null,
        valueAmount: moneyOrNull(data.valueAmount),
        currency: String(data.currency).toUpperCase(),
        startDate: data.startDate ? ts(data.startDate) : null,
        endDate: data.endDate ? ts(data.endDate) : null,
        signedAt: null,
        approvedById: null,
        approvedAt: null,
        terms: data.terms ?? null,
        notes: data.notes ?? null,
        createdAt: now,
        updatedAt: now,
      }),
      buildUpdate: (data) => mapContract(data),
      queryFields: ['status', 'kind', 'employeeId', 'clientId', 'candidateId', 'offerId'],
      transition: {
        machineName: 'Contract',
        machine: CONTRACT_MACHINE,
        permissionFor: (target) => {
          if (target === 'approved') return STAFF_ASSIGN;
          if (['cancelled', 'terminated'].includes(target)) return STAFF_SUSPEND;
          return STAFF_UPDATE;
        },
        patchFor: (target, existing, req, now, note) => ({
          ...(target === 'approved' ? { approvedById: req.user!.sub, approvedAt: now } : {}),
          ...(target === 'signed' ? { signedAt: now } : {}),
          ...(note ? { notes: note ? `${existing.notes ? `${existing.notes}\n` : ''}${note}` : existing.notes } : {}),
        }),
      },
    },
    prisma,
  );
}

export { contractCreate };
