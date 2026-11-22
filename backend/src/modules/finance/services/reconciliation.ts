/**
 * Finance reconciliation service.
 *
 * Builds a real report from persisted provider data: Payments, Payouts,
 * LedgerEntries and ProviderEvents. Rows are matched by provider + external
 * reference; every unmatched row, duplicate posting or amount discrepancy is
 * written as a ReconciliationItem against a ReconciliationRun.
 */

import type { Db } from '../../../db';
import { newId, ts, tsMs } from '../../../prisma/db';
import { toMoney, fromMoney, sumMoney, type MoneyInput } from '../../billing/utils/money';
import { normalizeProvider } from './capabilityMatrix';

export type ReconciliationExceptionType =
  | 'UNMATCHED_PAYMENT'
  | 'UNMATCHED_PAYOUT'
  | 'UNMATCHED_LEDGER_ENTRY'
  | 'DUPLICATE_LEDGER_ENTRY'
  | 'AMOUNT_MISMATCH'
  | 'MISSING_PROVIDER_EVENT';

export interface GenerateReconciliationInput {
  provider: string;
  financeAccountId?: string | null;
  periodStart?: string | Date | number | null;
  periodEnd?: string | Date | number | null;
  actorId?: string | null;
}

export interface ReconciliationException {
  type: ReconciliationExceptionType;
  sourceType: string;
  sourceId: string | null;
  externalRef: string | null;
  amount: MoneyInput;
  currency: string;
  note: string;
  metadata: Record<string, unknown>;
}

export interface ReconciliationReport {
  run: any;
  summary: {
    provider: string;
    financeAccountId: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    payments: number;
    payouts: number;
    ledgerEntries: number;
    providerEvents: number;
    matchedPayments: number;
    matchedPayouts: number;
    exceptions: number;
    exceptionsByType: Record<string, number>;
    amountPayments: string;
    amountPayouts: string;
    amountLedger: string;
    generatedAt: string;
  };
  exceptions: ReconciliationException[];
}

function allRows(query: unknown): Promise<any[]> {
  return Promise.resolve(query as unknown as Promise<any[]>);
}

function asIso(value: string | Date | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const ms = tsMs(value);
  return ms ? ts(ms) : null;
}

function inPeriod(value: unknown, startMs: number | null, endMs: number | null): boolean {
  if (!startMs && !endMs) return true;
  const ms = tsMs(value);
  if (!ms) return false;
  if (startMs && ms < startMs) return false;
  if (endMs && ms > endMs) return false;
  return true;
}

function objectOf(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function paymentExternalRef(row: any): string {
  return String(row?.providerId || row?.reference || '');
}

function payoutExternalRef(row: any): string {
  return String(row?.providerReference || row?.reference || '');
}

function eventExternalRef(row: any): string {
  const payload = row?.payload || {};
  return String(
    row?.externalEventId
    || payload?.providerId
    || payload?.checkoutRequestId
    || payload?.transactionId
    || payload?.reference
    || payload?.data?.id
    || payload?.resource?.id
    || '',
  );
}

/**
 * Create a run and populate exception rows. Callers can safely retry: a new
 * run is created per invocation, but the underlying data reads are immutable.
 */
export async function generateReconciliationReport(
  prisma: Db,
  input: GenerateReconciliationInput,
): Promise<ReconciliationReport> {
  const provider = normalizeProvider(input.provider);
  const periodStart = asIso(input.periodStart);
  const periodEnd = asIso(input.periodEnd);
  const startMs = periodStart ? tsMs(periodStart) : null;
  const endMs = periodEnd ? tsMs(periodEnd) : null;

  const run = await prisma.orm.public.ReconciliationRun.create({
    id: newId(),
    provider,
    financeAccountId: input.financeAccountId ?? null,
    status: 'RUNNING',
    periodStart: periodStart ?? null,
    periodEnd: periodEnd ?? null,
    summary: null,
    error: null,
    createdById: input.actorId ?? null,
    createdAt: ts(),
    completedAt: null,
  } as any);

  try {
    const [payments, payouts, ledger, events] = await Promise.all([
      allRows(prisma.orm.public.Payment.where({ provider: provider as any } as any).all()),
      allRows(prisma.orm.public.Payout.where({ provider: provider as any } as any).all()),
      allRows(prisma.orm.public.LedgerEntry.where({ provider: provider as any } as any).all()),
      allRows(prisma.orm.public.ProviderEvent.where({ provider: provider as any, domain: 'FINANCE' } as any).all()),
    ]);

    const inScopePayments = payments.filter(
      (row) => inPeriod(row.createdAt, startMs, endMs),
    );
    const inScopePayouts = payouts.filter(
      (row) => inPeriod(row.createdAt, startMs, endMs),
    );
    const inScopeLedger = ledger.filter((row) => {
      if (input.financeAccountId && String(row.financeAccountId || '') !== input.financeAccountId) return false;
      if (input.financeAccountId) return true;
      return inPeriod(row.occurredAt, startMs, endMs);
    });
    const inScopeEvents = events.filter((row) => inPeriod(row.createdAt, startMs, endMs));

    const exceptions: ReconciliationException[] = [];
    const ledgerByRef = new Map<string, any[]>();
    for (const entry of inScopeLedger) {
      const ref = String(entry.externalRef || '');
      const type = String(entry.entryType || '').toUpperCase();
      const key = `${type}:${ref}`;
      const bucket = ledgerByRef.get(key) || [];
      bucket.push(entry);
      ledgerByRef.set(key, bucket);
    }

    const eventRefs = new Set(inScopeEvents.map((row) => eventExternalRef(row)).filter(Boolean));
    let matchedPayments = 0;
    for (const payment of inScopePayments) {
      const ref = paymentExternalRef(payment);
      const entries = ledgerByRef.get(`PAYMENT:${ref}`) || [];
      if (!entries.length) {
        exceptions.push({
          type: 'UNMATCHED_PAYMENT',
          sourceType: 'Payment',
          sourceId: payment.id,
          externalRef: ref || null,
          amount: payment.amount,
          currency: payment.currency,
          note: 'Payment has no matching PAYMENT ledger entry',
          metadata: { status: payment.status, createdAt: payment.createdAt },
        });
        continue;
      }
      matchedPayments++;
      if (entries.length > 1) {
        exceptions.push({
          type: 'DUPLICATE_LEDGER_ENTRY',
          sourceType: 'Payment',
          sourceId: payment.id,
          externalRef: ref || null,
          amount: payment.amount,
          currency: payment.currency,
          note: `${entries.length} PAYMENT ledger entries share this provider reference`,
          metadata: { ledgerEntryIds: entries.map((entry) => entry.id) },
        });
      }
      const amount = fromMoney(payment.amount as any);
      if (entries.some((entry) => Math.abs(fromMoney(entry.amount as any) - amount) > 0.001)) {
        exceptions.push({
          type: 'AMOUNT_MISMATCH',
          sourceType: 'Payment',
          sourceId: payment.id,
          externalRef: ref || null,
          amount: payment.amount,
          currency: payment.currency,
          note: 'Payment amount differs from its ledger entry',
          metadata: { ledgerAmounts: entries.map((entry) => entry.amount) },
        });
      }
      if (ref && !eventRefs.has(ref) && payment.status === 'SUCCEEDED') {
        exceptions.push({
          type: 'MISSING_PROVIDER_EVENT',
          sourceType: 'Payment',
          sourceId: payment.id,
          externalRef: ref,
          amount: payment.amount,
          currency: payment.currency,
          note: 'No finance ProviderEvent matches this payment reference',
          metadata: { status: payment.status },
        });
      }
    }

    let matchedPayouts = 0;
    for (const payout of inScopePayouts) {
      const ref = payoutExternalRef(payout);
      const entries = ledgerByRef.get(`PAYOUT:${ref}`) || [];
      if (!entries.length) {
        exceptions.push({
          type: 'UNMATCHED_PAYOUT',
          sourceType: 'Payout',
          sourceId: payout.id,
          externalRef: ref || null,
          amount: payout.amount,
          currency: payout.currency,
          note: 'Payout has no matching PAYOUT ledger entry',
          metadata: { status: payout.status, createdAt: payout.createdAt },
        });
        continue;
      }
      matchedPayouts++;
      if (entries.length > 1) {
        exceptions.push({
          type: 'DUPLICATE_LEDGER_ENTRY',
          sourceType: 'Payout',
          sourceId: payout.id,
          externalRef: ref || null,
          amount: payout.amount,
          currency: payout.currency,
          note: `${entries.length} PAYOUT ledger entries share this provider reference`,
          metadata: { ledgerEntryIds: entries.map((entry) => entry.id) },
        });
      }
      const amount = fromMoney(payout.amount as any);
      if (entries.some((entry) => Math.abs(fromMoney(entry.amount as any) - amount) > 0.001)) {
        exceptions.push({
          type: 'AMOUNT_MISMATCH',
          sourceType: 'Payout',
          sourceId: payout.id,
          externalRef: ref || null,
          amount: payout.amount,
          currency: payout.currency,
          note: 'Payout amount differs from its ledger entry',
          metadata: { ledgerAmounts: entries.map((entry) => entry.amount) },
        });
      }
    }

    const paymentRefs = new Set(inScopePayments.map(paymentExternalRef).filter(Boolean));
    const payoutRefs = new Set(inScopePayouts.map(payoutExternalRef).filter(Boolean));
    for (const entry of inScopeLedger) {
      const ref = String(entry.externalRef || '');
      const type = String(entry.entryType || '').toUpperCase();
      if (type === 'PAYMENT' && ref && !paymentRefs.has(ref)) {
        exceptions.push({
          type: 'UNMATCHED_LEDGER_ENTRY',
          sourceType: 'LedgerEntry',
          sourceId: entry.id,
          externalRef: ref,
          amount: entry.amount,
          currency: entry.currency,
          note: 'Ledger PAYMENT entry has no matching Payment row',
          metadata: { entryType: type, direction: entry.direction },
        });
      }
      if (type === 'PAYOUT' && ref && !payoutRefs.has(ref)) {
        exceptions.push({
          type: 'UNMATCHED_LEDGER_ENTRY',
          sourceType: 'LedgerEntry',
          sourceId: entry.id,
          externalRef: ref,
          amount: entry.amount,
          currency: entry.currency,
          note: 'Ledger PAYOUT entry has no matching Payout row',
          metadata: { entryType: type, direction: entry.direction },
        });
      }
    }

    for (const exception of exceptions) {
      await prisma.orm.public.ReconciliationItem.create({
        id: newId(),
        runId: run.id,
        type: exception.type,
        sourceType: exception.sourceType,
        sourceId: exception.sourceId ?? null,
        externalRef: exception.externalRef ?? null,
        amount: toMoney(exception.amount ?? 0),
        currency: String(exception.currency || 'KES').toUpperCase(),
        status: 'OPEN',
        note: exception.note,
        resolvedById: null,
        metadata: exception.metadata as any,
        createdAt: ts(),
        resolvedAt: null,
      } as any);
    }

    const exceptionsByType: Record<string, number> = {};
    for (const exception of exceptions) {
      exceptionsByType[exception.type] = (exceptionsByType[exception.type] || 0) + 1;
    }
    const summary: ReconciliationReport['summary'] = {
      provider,
      financeAccountId: input.financeAccountId ?? null,
      periodStart,
      periodEnd,
      payments: inScopePayments.length,
      payouts: inScopePayouts.length,
      ledgerEntries: inScopeLedger.length,
      providerEvents: inScopeEvents.length,
      matchedPayments,
      matchedPayouts,
      exceptions: exceptions.length,
      exceptionsByType,
      amountPayments: sumMoney(inScopePayments.map((row) => row.amount)),
      amountPayouts: sumMoney(inScopePayouts.map((row) => row.amount)),
      amountLedger: sumMoney(inScopeLedger.map((row) => row.amount)),
      generatedAt: ts(),
    };
    const completed = await prisma.orm.public.ReconciliationRun
      .where({ id: run.id })
      .update({ status: 'COMPLETED', summary: summary as any, completedAt: ts(), error: null } as any);

    return { run: completed ?? run, summary, exceptions };
  } catch (err: any) {
    await prisma.orm.public.ReconciliationRun
      .where({ id: run.id })
      .update({ status: 'FAILED', error: String(err?.message || err).slice(0, 1000), completedAt: ts() } as any)
      .catch(() => undefined);
    throw err;
  }
}

/** Resolve an exception with actor/time audit metadata. */
export async function resolveReconciliationItem(
  prisma: Db,
  itemId: string,
  input: { actorId?: string | null; note?: string | null; resolution?: string | null },
): Promise<any> {
  const existing = await prisma.orm.public.ReconciliationItem
    .where({ id: itemId } as any)
    .first();
  if (!existing) return null;
  const updated = await prisma.orm.public.ReconciliationItem
    .where({ id: itemId })
    .update({
      status: 'RESOLVED',
      resolvedById: input.actorId ?? null,
      resolvedAt: ts(),
      note: input.note ?? existing.note ?? null,
      metadata: {
        ...objectOf(existing.metadata),
        resolution: input.resolution || 'MANUAL',
        resolvedBy: input.actorId ?? null,
        resolvedAt: ts(),
      } as any,
    } as any);
  return updated;
}

export default { generateReconciliationReport, resolveReconciliationItem };
