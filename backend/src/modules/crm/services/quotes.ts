import type { Db, Tx } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import type { Models } from '../../../prisma/contract';
import {
  addMoney,
  fromMoney,
  mulMoney,
  subMoney,
  sumMoney,
  toMoney,
  type Money,
  type MoneyInput,
} from '../../billing/utils/money';
import { crmError } from './errors';
import { QUOTE_STATUS_ORDER, isLegalQuoteTransition } from './pipelineRules';

export type Quote = Omit<
  Models.public_Quote,
  'opportunity' | 'booking' | 'client' | 'createdBy' | 'invoices' | 'lineItems'
>;
export type QuoteLineItem = Omit<Models.public_QuoteLineItem, 'quote' | 'service' | 'product'>;
export type QuoteWithLineItems = Quote & { lineItems: QuoteLineItem[] };

export { QUOTE_STATUS_ORDER, QUOTE_STAGE_FLOW } from './pipelineRules';
export const isLegalStageTransition = isLegalQuoteTransition;

export interface QuoteLineItemInput {
  description: string;
  quantity?: number;
  unitPrice: MoneyInput;
  serviceId?: string | null;
  productId?: string | null;
  sortOrder?: number;
}

export interface QuoteTotalsInput {
  lineItems?: QuoteLineItemInput[];
  subtotal?: MoneyInput;
  discount?: MoneyInput;
  tax?: MoneyInput;
  taxRate?: number;
}

export interface CreateQuoteInput extends QuoteTotalsInput {
  opportunityId?: string | null;
  bookingId?: string | null;
  clientId?: string | null;
  currency?: string;
  validUntil?: string | Date | null;
  notes?: string | null;
}

export interface UpdateQuoteInput extends QuoteTotalsInput {
  opportunityId?: string | null;
  bookingId?: string | null;
  clientId?: string | null;
  currency?: string;
  status?: string;
  validUntil?: string | Date | null;
  notes?: string | null;
}

export interface QuoteFilters {
  status?: string;
  opportunityId?: string;
  clientId?: string;
}

interface NormalizedLineItem {
  description: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  serviceId: string | null;
  productId: string | null;
  sortOrder: number;
}

function toTs(value: string | Date | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  return ts(value instanceof Date ? value : new Date(value));
}

function referenceFor(id: string) {
  return {
    publicReference: `QTE-${id.slice(0, 8).toUpperCase()}`,
    number: `Q-${id.slice(0, 8).toUpperCase()}`,
  };
}

function normalizeLineItems(items: QuoteLineItemInput[] | undefined): {
  rows: NormalizedLineItem[];
  subtotal: Money;
} {
  const rows = (items ?? []).map((item, index) => {
    const description = item.description?.trim();
    if (!description) throw crmError(400, 'line item description is required');
    const quantity = Math.max(1, Math.floor(Number(item.quantity ?? 1) || 1));
    try {
      return {
        description,
        quantity,
        unitPrice: toMoney(item.unitPrice ?? 0),
        lineTotal: mulMoney(item.unitPrice ?? 0, quantity),
        serviceId: item.serviceId ?? null,
        productId: item.productId ?? null,
        sortOrder: item.sortOrder ?? index,
      } satisfies NormalizedLineItem;
    } catch {
      throw crmError(400, `Invalid amount on line item "${description}"`);
    }
  });
  return { rows, subtotal: sumMoney(rows.map((row) => row.lineTotal)) };
}

function taxFromRate(subtotal: Money, taxRate: number): Money {
  return toMoney(fromMoney(subtotal) * Number(taxRate));
}

function computeTotals(input: QuoteTotalsInput, fallback?: {
  subtotal?: MoneyInput;
  discount?: MoneyInput;
  tax?: MoneyInput;
}): { subtotal: Money; discount: Money; tax: Money; total: Money } {
  const normalized = input.lineItems !== undefined
    ? normalizeLineItems(input.lineItems)
    : null;
  const subtotal = normalized
    ? normalized.subtotal
    : toMoney(input.subtotal ?? fallback?.subtotal ?? 0);
  const discount = input.discount !== undefined
    ? toMoney(input.discount)
    : toMoney(fallback?.discount ?? 0);
  const tax = input.tax !== undefined
    ? toMoney(input.tax)
    : input.taxRate !== undefined
      ? taxFromRate(subtotal, input.taxRate)
      : toMoney(fallback?.tax ?? 0);

  if (fromMoney(discount) > fromMoney(subtotal)) {
    throw crmError(400, 'discount cannot exceed subtotal');
  }
  const total = addMoney(subMoney(subtotal, discount), tax);
  return { subtotal, discount, tax, total };
}

async function insertQuoteLineItems(tx: Tx, quoteId: string, rows: NormalizedLineItem[]) {
  for (const row of rows) {
    await tx.orm.public.QuoteLineItem.create({
      id: newId(),
      quoteId,
      description: row.description,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      lineTotal: row.lineTotal,
      serviceId: row.serviceId,
      productId: row.productId,
      sortOrder: row.sortOrder,
    });
  }
}

async function replaceQuoteLineItems(tx: Tx, quoteId: string, rows: NormalizedLineItem[]) {
  const existing = await tx.orm.public.QuoteLineItem.where({ quoteId }).all();
  for (const item of existing) {
    await tx.orm.public.QuoteLineItem.where({ id: item.id }).delete();
  }
  await insertQuoteLineItems(tx, quoteId, rows);
}

export async function listQuotes(prisma: Db, filters: QuoteFilters = {}): Promise<QuoteWithLineItems[]> {
  const where: QuoteFilters = {};
  if (filters.status) where.status = filters.status;
  if (filters.opportunityId) where.opportunityId = filters.opportunityId;
  if (filters.clientId) where.clientId = filters.clientId;

  let query = prisma.orm.public.Quote;
  if (Object.keys(where).length > 0) query = query.where(where);
  const rows = await query
    .orderBy((q) => q.createdAt.desc())
    .all();
  if (rows.length === 0) return [];
  const withItems = await Promise.all(rows.map((row) => getQuote(prisma, row.id)));
  return withItems.filter((row): row is QuoteWithLineItems => row !== null);
}

export async function getQuote(prisma: Db, id: string): Promise<QuoteWithLineItems | null> {
  const row = await prisma.orm.public.Quote
    .where({ id })
    .include('lineItems', (li) => li.orderBy((x) => x.sortOrder.asc()))
    .first();
  return (row as QuoteWithLineItems | null) ?? null;
}

export async function createQuote(
  prisma: Db,
  input: CreateQuoteInput,
  actorId?: string | null,
): Promise<QuoteWithLineItems> {
  let opportunity: { clientId: string | null; bookingId: string | null; currency: string } | null = null;
  if (input.opportunityId) {
    opportunity = await prisma.orm.public.Opportunity
      .where({ id: input.opportunityId })
      .select('clientId', 'bookingId', 'currency')
      .first();
    if (!opportunity) throw crmError(404, 'Opportunity not found');
  }

  const totals = computeTotals(input);
  const normalized = input.lineItems !== undefined ? normalizeLineItems(input.lineItems) : { rows: [], subtotal: totals.subtotal };
  const id = newId();
  const refs = referenceFor(id);

  await prisma.transaction(async (tx) => {
    await tx.orm.public.Quote.create({
      id,
      publicReference: refs.publicReference,
      number: refs.number,
      opportunityId: input.opportunityId ?? null,
      bookingId: input.bookingId ?? opportunity?.bookingId ?? null,
      clientId: input.clientId ?? opportunity?.clientId ?? null,
      createdById: actorId ?? null,
      status: 'draft',
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total: totals.total,
      currency: input.currency ?? opportunity?.currency ?? 'KES',
      validUntil: toTs(input.validUntil),
      issuedAt: null,
      acceptedAt: null,
      notes: input.notes ?? null,
      updatedAt: ts(),
    });
    await insertQuoteLineItems(tx, id, normalized.rows);
  });

  const created = await getQuote(prisma, id);
  if (!created) throw crmError(500, 'Quote creation failed');
  return created;
}

export async function updateQuote(
  prisma: Db,
  id: string,
  input: UpdateQuoteInput,
): Promise<QuoteWithLineItems> {
  const existing = await getQuote(prisma, id);
  if (!existing) throw crmError(404, 'Quote not found');

  const patch: Partial<Quote> = { updatedAt: ts() };
  const wantsContentEdit = input.lineItems !== undefined || input.subtotal !== undefined || input.discount !== undefined || input.tax !== undefined || input.taxRate !== undefined;

  if (wantsContentEdit && existing.status !== 'draft') {
    throw crmError(409, 'Only draft quotes can be edited');
  }

  if (input.opportunityId !== undefined) patch.opportunityId = input.opportunityId;
  if (input.bookingId !== undefined) patch.bookingId = input.bookingId;
  if (input.clientId !== undefined) patch.clientId = input.clientId;
  if (input.currency !== undefined) patch.currency = input.currency;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.validUntil !== undefined) patch.validUntil = toTs(input.validUntil);

  if (wantsContentEdit) {
    const totals = computeTotals(input, {
      subtotal: existing.subtotal,
      discount: existing.discount,
      tax: existing.tax,
    });
    patch.subtotal = totals.subtotal;
    patch.discount = totals.discount;
    patch.tax = totals.tax;
    patch.total = totals.total;
  }

  if (input.status !== undefined && input.status !== existing.status) {
    if (!QUOTE_STATUS_ORDER.includes(input.status as (typeof QUOTE_STATUS_ORDER)[number])) {
      throw crmError(400, `Unknown quote status: ${input.status}`);
    }
    if (!isLegalStageTransition(existing.status, input.status)) {
      throw crmError(409, `Invalid status transition from ${existing.status} to ${input.status}`);
    }
    patch.status = input.status;
    if (input.status === 'sent') patch.issuedAt = existing.issuedAt ?? ts();
    if (input.status === 'accepted') patch.acceptedAt = existing.acceptedAt ?? ts();
  }

  await prisma.transaction(async (tx) => {
    if (input.lineItems !== undefined) {
      const normalized = normalizeLineItems(input.lineItems);
      await replaceQuoteLineItems(tx, id, normalized.rows);
    }
    await tx.orm.public.Quote.where({ id }).update(patch);
  });

  const updated = await getQuote(prisma, id);
  if (!updated) throw crmError(404, 'Quote not found');
  return updated;
}

export async function convertQuoteToInvoice(
  prisma: Db,
  quoteId: string,
  actorId?: string | null,
  dueDays = 30,
): Promise<Models.public_Invoice & { lineItems: Models.public_InvoiceLineItem[] }> {
  const quote = await getQuote(prisma, quoteId);
  if (!quote) throw crmError(404, 'Quote not found');
  if (quote.status !== 'accepted') {
    throw crmError(409, 'Only accepted quotes can be converted to invoices');
  }

  let opportunity: { clientId: string | null; bookingId: string | null } | null = null;
  if (quote.opportunityId) {
    opportunity = await prisma.orm.public.Opportunity
      .where({ id: quote.opportunityId })
      .select('clientId', 'bookingId')
      .first();
  }

  const id = newId();
  const refs = { publicReference: `INV-${id.slice(0, 8).toUpperCase()}`, number: `I-${id.slice(0, 8).toUpperCase()}` };
  const dueAt = ts(Date.now() + Math.max(0, Number(dueDays) || 30) * 24 * 60 * 60 * 1000);

  await prisma.transaction(async (tx) => {
    await tx.orm.public.Invoice.create({
      id,
      publicReference: refs.publicReference,
      number: refs.number,
      quoteId: quote.id,
      bookingId: quote.bookingId ?? opportunity?.bookingId ?? null,
      clientProjectId: null,
      clientId: quote.clientId ?? opportunity?.clientId ?? null,
      createdById: actorId ?? null,
      status: 'draft',
      subtotal: quote.subtotal,
      tax: quote.tax,
      total: quote.total,
      amountPaid: toMoney(0),
      balanceDue: quote.total,
      currency: quote.currency,
      issuedAt: null,
      dueAt,
      paidAt: null,
      notes: quote.notes,
      updatedAt: ts(),
    });

    for (const [index, item] of quote.lineItems.entries()) {
      await tx.orm.public.InvoiceLineItem.create({
        id: newId(),
        invoiceId: id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        sortOrder: item.sortOrder ?? index,
      });
    }
  });

  const invoice = await prisma.orm.public.Invoice
    .where({ id })
    .include('lineItems', (li) => li.orderBy((x) => x.sortOrder.asc()))
    .first();
  if (!invoice) throw crmError(500, 'Invoice creation failed');
  return invoice as Models.public_Invoice & { lineItems: Models.public_InvoiceLineItem[] };
}
