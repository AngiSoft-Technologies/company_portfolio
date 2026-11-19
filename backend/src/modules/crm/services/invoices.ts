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
import { INVOICE_STATUS_ORDER, isLegalInvoiceTransition } from './pipelineRules';
import { getQuote } from './quotes';

export type Invoice = Omit<
  Models.public_Invoice,
  'quote' | 'booking' | 'clientProject' | 'client' | 'createdBy' | 'lineItems'
>;
export type InvoiceLineItem = Omit<Models.public_InvoiceLineItem, 'invoice'>;
export type InvoiceWithLineItems = Invoice & { lineItems: InvoiceLineItem[] };

export { INVOICE_STATUS_ORDER, INVOICE_STAGE_FLOW } from './pipelineRules';
export const isLegalStageTransition = isLegalInvoiceTransition;

export interface InvoiceLineItemInput {
  description: string;
  quantity?: number;
  unitPrice: MoneyInput;
  sortOrder?: number;
}

export interface InvoiceTotalsInput {
  lineItems?: InvoiceLineItemInput[];
  subtotal?: MoneyInput;
  tax?: MoneyInput;
  taxRate?: number;
  total?: MoneyInput;
}

export interface CreateInvoiceInput extends InvoiceTotalsInput {
  quoteId?: string | null;
  bookingId?: string | null;
  clientProjectId?: string | null;
  clientId?: string | null;
  currency?: string;
  dueAt?: string | Date | null;
  dueDays?: number;
  notes?: string | null;
}

export interface UpdateInvoiceInput extends InvoiceTotalsInput {
  bookingId?: string | null;
  clientProjectId?: string | null;
  clientId?: string | null;
  currency?: string;
  status?: string;
  dueAt?: string | Date | null;
  notes?: string | null;
}

export interface InvoiceFilters {
  status?: string;
  clientId?: string;
  quoteId?: string;
}

interface NormalizedLineItem {
  description: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  sortOrder: number;
}

function toTs(value: string | Date | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  return ts(value instanceof Date ? value : new Date(value));
}

function referenceFor(id: string) {
  return {
    publicReference: `INV-${id.slice(0, 8).toUpperCase()}`,
    number: `I-${id.slice(0, 8).toUpperCase()}`,
  };
}

function normalizeLineItems(items: InvoiceLineItemInput[] | undefined): {
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

function computeTotals(input: InvoiceTotalsInput, fallback?: {
  subtotal?: MoneyInput;
  tax?: MoneyInput;
  total?: MoneyInput;
}): { subtotal: Money; tax: Money; total: Money } {
  const normalized = input.lineItems !== undefined ? normalizeLineItems(input.lineItems) : null;
  const subtotal = normalized ? normalized.subtotal : toMoney(input.subtotal ?? fallback?.subtotal ?? 0);
  const tax = input.tax !== undefined
    ? toMoney(input.tax)
    : input.taxRate !== undefined
      ? taxFromRate(subtotal, input.taxRate)
      : toMoney(fallback?.tax ?? 0);
  const total = normalized || input.subtotal !== undefined || input.tax !== undefined || input.taxRate !== undefined
    ? addMoney(subtotal, tax)
    : input.total !== undefined
      ? toMoney(input.total)
      : toMoney(fallback?.total ?? addMoney(subtotal, tax));
  return { subtotal, tax, total };
}

async function insertInvoiceLineItems(tx: Tx, invoiceId: string, rows: NormalizedLineItem[]) {
  for (const row of rows) {
    await tx.orm.public.InvoiceLineItem.create({
      id: newId(),
      invoiceId,
      description: row.description,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      lineTotal: row.lineTotal,
      sortOrder: row.sortOrder,
    });
  }
}

async function replaceInvoiceLineItems(tx: Tx, invoiceId: string, rows: NormalizedLineItem[]) {
  const existing = await tx.orm.public.InvoiceLineItem.where({ invoiceId }).all();
  for (const item of existing) {
    await tx.orm.public.InvoiceLineItem.where({ id: item.id }).delete();
  }
  await insertInvoiceLineItems(tx, invoiceId, rows);
}

export async function listInvoices(prisma: Db, filters: InvoiceFilters = {}): Promise<InvoiceWithLineItems[]> {
  const where: InvoiceFilters = {};
  if (filters.status) where.status = filters.status;
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.quoteId) where.quoteId = filters.quoteId;

  let query = prisma.orm.public.Invoice;
  if (Object.keys(where).length > 0) query = query.where(where);
  const rows = await query.orderBy((i) => i.createdAt.desc()).all();
  if (rows.length === 0) return [];
  const withItems = await Promise.all(rows.map((row) => getInvoice(prisma, row.id)));
  return withItems.filter((row): row is InvoiceWithLineItems => row !== null);
}

export async function getInvoice(prisma: Db, id: string): Promise<InvoiceWithLineItems | null> {
  const row = await prisma.orm.public.Invoice
    .where({ id })
    .include('lineItems', (li) => li.orderBy((x) => x.sortOrder.asc()))
    .first();
  return (row as InvoiceWithLineItems | null) ?? null;
}

export async function createInvoice(
  prisma: Db,
  input: CreateInvoiceInput,
  actorId?: string | null,
): Promise<InvoiceWithLineItems> {
  let quote: Awaited<ReturnType<typeof getQuote>> = null;
  if (input.quoteId) {
    quote = await getQuote(prisma, input.quoteId);
    if (!quote) throw crmError(404, 'Quote not found');
  }

  const useQuoteSnapshot = Boolean(
    quote &&
    input.lineItems === undefined &&
    input.subtotal === undefined &&
    input.tax === undefined &&
    input.taxRate === undefined &&
    input.total === undefined,
  );

  const lineItemInput: InvoiceLineItemInput[] | undefined = input.lineItems !== undefined
    ? input.lineItems
    : useQuoteSnapshot
      ? quote!.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sortOrder: item.sortOrder,
        }))
      : undefined;

  const totalsInput: InvoiceTotalsInput = useQuoteSnapshot
    ? { lineItems: lineItemInput }
    : { ...input, lineItems: lineItemInput };

  const totals = useQuoteSnapshot
    ? { subtotal: quote!.subtotal, tax: quote!.tax, total: quote!.total }
    : computeTotals(totalsInput);

  const normalized = lineItemInput !== undefined ? normalizeLineItems(lineItemInput) : { rows: [], subtotal: totals.subtotal };
  const id = newId();
  const refs = referenceFor(id);
  const dueAt = toTs(input.dueAt) ?? ts(Date.now() + Math.max(0, Number(input.dueDays) || 30) * 24 * 60 * 60 * 1000);

  await prisma.transaction(async (tx) => {
    await tx.orm.public.Invoice.create({
      id,
      publicReference: refs.publicReference,
      number: refs.number,
      quoteId: input.quoteId ?? null,
      bookingId: input.bookingId ?? quote?.bookingId ?? null,
      clientProjectId: input.clientProjectId ?? null,
      clientId: input.clientId ?? quote?.clientId ?? null,
      createdById: actorId ?? null,
      status: 'draft',
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      amountPaid: toMoney(0),
      balanceDue: totals.total,
      currency: input.currency ?? quote?.currency ?? 'KES',
      issuedAt: null,
      dueAt,
      paidAt: null,
      notes: input.notes ?? null,
      updatedAt: ts(),
    });
    await insertInvoiceLineItems(tx, id, normalized.rows);
  });

  const created = await getInvoice(prisma, id);
  if (!created) throw crmError(500, 'Invoice creation failed');
  return created;
}

export async function updateInvoice(
  prisma: Db,
  id: string,
  input: UpdateInvoiceInput,
): Promise<InvoiceWithLineItems> {
  const existing = await getInvoice(prisma, id);
  if (!existing) throw crmError(404, 'Invoice not found');

  const patch: Partial<Invoice> = { updatedAt: ts() };
  const wantsContentEdit = input.lineItems !== undefined || input.subtotal !== undefined || input.tax !== undefined || input.taxRate !== undefined || input.total !== undefined;

  if (wantsContentEdit && existing.status !== 'draft') {
    throw crmError(409, 'Only draft invoices can be edited');
  }

  if (input.bookingId !== undefined) patch.bookingId = input.bookingId;
  if (input.clientProjectId !== undefined) patch.clientProjectId = input.clientProjectId;
  if (input.clientId !== undefined) patch.clientId = input.clientId;
  if (input.currency !== undefined) patch.currency = input.currency;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.dueAt !== undefined) patch.dueAt = toTs(input.dueAt);

  if (wantsContentEdit) {
    const totals = computeTotals(input, {
      subtotal: existing.subtotal,
      tax: existing.tax,
      total: existing.total,
    });
    patch.subtotal = totals.subtotal;
    patch.tax = totals.tax;
    patch.total = totals.total;
    patch.amountPaid = toMoney(0);
    patch.balanceDue = totals.total;
    patch.paidAt = null;
  }

  if (input.status !== undefined && input.status !== existing.status) {
    if (!INVOICE_STATUS_ORDER.includes(input.status as (typeof INVOICE_STATUS_ORDER)[number])) {
      throw crmError(400, `Unknown invoice status: ${input.status}`);
    }
    if (!isLegalStageTransition(existing.status, input.status)) {
      throw crmError(409, `Invalid status transition from ${existing.status} to ${input.status}`);
    }
    patch.status = input.status;
    if (input.status === 'sent') patch.issuedAt = existing.issuedAt ?? ts();
    if (input.status === 'paid') {
      patch.amountPaid = existing.total;
      patch.balanceDue = toMoney(0);
      patch.paidAt = existing.paidAt ?? ts();
    }
    if (input.status === 'void') patch.paidAt = existing.paidAt;
  }

  await prisma.transaction(async (tx) => {
    if (input.lineItems !== undefined) {
      const normalized = normalizeLineItems(input.lineItems);
      await replaceInvoiceLineItems(tx, id, normalized.rows);
    }
    await tx.orm.public.Invoice.where({ id }).update(patch);
  });

  const updated = await getInvoice(prisma, id);
  if (!updated) throw crmError(404, 'Invoice not found');
  return updated;
}

export async function recordInvoicePayment(
  prisma: Db,
  id: string,
  payment: MoneyInput,
): Promise<InvoiceWithLineItems> {
  const existing = await getInvoice(prisma, id);
  if (!existing) throw crmError(404, 'Invoice not found');
  if (existing.status === 'draft') throw crmError(409, 'Issue the invoice before recording payments');
  if (existing.status === 'void') throw crmError(409, 'Cannot record payments on a void invoice');
  if (existing.status === 'paid') throw crmError(409, 'Invoice is already paid');

  const amount = payment !== undefined && payment !== null && payment !== ''
    ? toMoney(payment)
    : subMoney(existing.total, existing.amountPaid);
  const nextAmountPaid = addMoney(existing.amountPaid, amount);
  let balanceDue = subMoney(existing.total, nextAmountPaid);
  let finalAmountPaid = nextAmountPaid;
  if (fromMoney(balanceDue) < 0) {
    finalAmountPaid = existing.total;
    balanceDue = toMoney(0);
  }
  const settled = fromMoney(balanceDue) === 0;

  await prisma.orm.public.Invoice.where({ id }).update({
    amountPaid: finalAmountPaid,
    balanceDue,
    status: settled ? 'paid' : 'partially_paid',
    paidAt: settled ? (existing.paidAt ?? ts()) : existing.paidAt,
    updatedAt: ts(),
  });

  const withItems = await getInvoice(prisma, id);
  if (!withItems) throw crmError(404, 'Invoice not found');
  return withItems;
}

export async function deleteInvoice(prisma: Db, id: string): Promise<void> {
  const existing = await prisma.orm.public.Invoice.where({ id }).first();
  if (!existing) throw crmError(404, 'Invoice not found');
  if (existing.status !== 'draft') throw crmError(409, 'Only draft invoices can be deleted');
  await prisma.orm.public.Invoice.where({ id }).delete();
}
