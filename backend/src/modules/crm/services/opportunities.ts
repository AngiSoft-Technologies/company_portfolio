import type { Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import type { Models } from '../../../prisma/contract';
import { toMoney, type MoneyInput } from '../../billing/utils/money';
import { crmError } from './errors';
import {
  OPPORTUNITY_STAGE_ORDER,
  isLegalOpportunityTransition,
  defaultOpportunityProbability,
} from './pipelineRules';

export type Opportunity = Omit<
  Models.public_Opportunity,
  'lead' | 'client' | 'booking' | 'assignedTo' | 'quotes'
>;

export { OPPORTUNITY_STAGE_ORDER, OPPORTUNITY_STAGE_FLOW } from './pipelineRules';
export const isLegalStageTransition = isLegalOpportunityTransition;
export const defaultProbabilityForStage = defaultOpportunityProbability;

export interface CreateOpportunityInput {
  title: string;
  leadId?: string | null;
  clientId?: string | null;
  bookingId?: string | null;
  assignedToId?: string | null;
  stage?: string;
  value?: MoneyInput;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string | Date | null;
  lostReason?: string | null;
  notes?: string | null;
  source?: string | null;
}

export interface UpdateOpportunityInput {
  title?: string;
  leadId?: string | null;
  clientId?: string | null;
  bookingId?: string | null;
  assignedToId?: string | null;
  stage?: string;
  value?: MoneyInput;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string | Date | null;
  lostReason?: string | null;
  notes?: string | null;
  source?: string | null;
}

export interface OpportunityFilters {
  stage?: string;
  clientId?: string;
  leadId?: string;
  assignedToId?: string;
}

function toTs(value: string | Date | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  return ts(value instanceof Date ? value : new Date(value));
}

function referenceFor(id: string): string {
  return `OPP-${id.slice(0, 8).toUpperCase()}`;
}

export async function listOpportunities(
  prisma: Db,
  filters: OpportunityFilters = {},
): Promise<Opportunity[]> {
  const where: OpportunityFilters = {};
  if (filters.stage) where.stage = filters.stage;
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.leadId) where.leadId = filters.leadId;
  if (filters.assignedToId) where.assignedToId = filters.assignedToId;

  let query = prisma.orm.public.Opportunity;
  if (Object.keys(where).length > 0) query = query.where(where);
  const rows = await query.orderBy((o) => o.createdAt.desc()).all();
  return rows as unknown as Opportunity[];
}

export async function getOpportunity(prisma: Db, id: string): Promise<Opportunity | null> {
  const row = await prisma.orm.public.Opportunity.where({ id }).first();
  return (row as Opportunity | null) ?? null;
}

export async function createOpportunity(
  prisma: Db,
  input: CreateOpportunityInput,
  actorId?: string | null,
): Promise<Opportunity> {
  const title = input.title?.trim();
  if (!title) throw crmError(400, 'title is required');

  const stage = input.stage || 'new';
  if (!OPPORTUNITY_STAGE_ORDER.includes(stage as (typeof OPPORTUNITY_STAGE_ORDER)[number])) {
    throw crmError(400, `Unknown opportunity stage: ${stage}`);
  }

  const id = newId();
  const created = await prisma.orm.public.Opportunity.create({
    id,
    publicReference: referenceFor(id),
    title,
    leadId: input.leadId ?? null,
    clientId: input.clientId ?? null,
    bookingId: input.bookingId ?? null,
    stage,
    value: input.value != null ? toMoney(input.value) : null,
    currency: input.currency || 'KES',
    probability: input.probability ?? defaultProbabilityForStage(stage),
    expectedCloseDate: toTs(input.expectedCloseDate),
    assignedToId: input.assignedToId ?? actorId ?? null,
    lostReason: input.lostReason ?? null,
    notes: input.notes ?? null,
    source: input.source ?? null,
    updatedAt: ts(),
  });

  return created as Opportunity;
}

export async function updateOpportunity(
  prisma: Db,
  id: string,
  input: UpdateOpportunityInput,
): Promise<Opportunity> {
  const existing = await prisma.orm.public.Opportunity.where({ id }).first();
  if (!existing) throw crmError(404, 'Opportunity not found');

  const patch: Partial<Opportunity> = { updatedAt: ts() };

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw crmError(400, 'title cannot be empty');
    patch.title = title;
  }
  if (input.leadId !== undefined) patch.leadId = input.leadId;
  if (input.clientId !== undefined) patch.clientId = input.clientId;
  if (input.bookingId !== undefined) patch.bookingId = input.bookingId;
  if (input.assignedToId !== undefined) patch.assignedToId = input.assignedToId;
  if (input.currency !== undefined) patch.currency = input.currency;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.source !== undefined) patch.source = input.source;
  if (input.lostReason !== undefined) patch.lostReason = input.lostReason;
  if (input.expectedCloseDate !== undefined) patch.expectedCloseDate = toTs(input.expectedCloseDate);

  if (input.value !== undefined) {
    patch.value = input.value === null ? null : toMoney(input.value);
  }

  if (input.stage !== undefined && input.stage !== existing.stage) {
    if (!isLegalStageTransition(existing.stage, input.stage)) {
      throw crmError(409, `Invalid stage transition from ${existing.stage} to ${input.stage}`);
    }
    if (input.stage === 'lost') {
      const lostReason = input.lostReason ?? existing.lostReason;
      if (!lostReason) throw crmError(400, 'lostReason is required when marking an opportunity lost');
      patch.lostReason = lostReason;
    }
    patch.stage = input.stage;
    patch.probability = input.probability ?? defaultProbabilityForStage(input.stage);
  } else if (input.probability !== undefined) {
    patch.probability = input.probability;
  }

  const updated = await prisma.orm.public.Opportunity.where({ id }).update(patch);
  return updated as Opportunity;
}

export async function deleteOpportunity(prisma: Db, id: string): Promise<void> {
  const existing = await prisma.orm.public.Opportunity.where({ id }).first();
  if (!existing) throw crmError(404, 'Opportunity not found');
  await prisma.orm.public.Opportunity.where({ id }).delete();
}
