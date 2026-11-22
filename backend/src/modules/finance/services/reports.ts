/**
 * Aggregated finance reporting and CSV serialization.
 *
 * The report is intentionally provider-agnostic: normalized FinanceTransaction
 * rows are the source of truth, with ledger/payment/payout/refund/dispute/
 * settlement/reconciliation tables supplying the operational totals.
 */

import type { Db } from '../../../db';
import { tsMs } from '../../../prisma/db';
import { sumMoney, toMoney, type MoneyInput } from '../../billing/utils/money';
import { normalizeProvider } from './capabilityMatrix';
import { selectPaymentRail } from './providers';

export interface FinanceReportInput {
  provider?: string;
  financeAccountId?: string;
  currency?: string;
  country?: string;
  channel?: string;
  periodStart?: string | Date | number | null;
  periodEnd?: string | Date | number | null;
  actorId?: string | null;
}

export interface FinanceReport {
  generatedAt: string;
  filters: Record<string, unknown>;
  defaultRail: Record<string, unknown> | null;
  volumeByProvider: Record<string, { count: number; gross: string; fees: string; net: string }>;
  volumeByMethod: Record<string, { count: number; gross: string }>;
  volumeByCurrency: Record<string, { count: number; gross: string }>;
  totals: { gross: string; fees: string; net: string; payouts: string; payoutCount: number };
  payoutTotalsByProvider: Record<string, { count: number; total: string }>;
  openDisputes: { count: number; amount: string };
  openRefunds: { count: number; amount: string };
  reconciliationExceptions: Record<string, number>;
}

function allRows(query: unknown): Promise<any[]> {
  return Promise.resolve(query as unknown as Promise<any[]>);
}

function inPeriod(row: any, startMs: number | null, endMs: number | null): boolean {
  if (!startMs && !endMs) return true;
  const ms = tsMs(row?.occurredAt ?? row?.createdAt ?? row?.updatedAt);
  if (!ms) return false;
  if (startMs && ms < startMs) return false;
  if (endMs && ms > endMs) return false;
  return true;
}

function methodOf(row: any): string {
  const metadata = (row?.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<string, unknown>;
  return String(metadata.method || metadata.paymentMethod || row?.sourceType || 'UNKNOWN').toUpperCase();
}

function emptyVolume() {
  return { count: 0, gross: toMoney(0), fees: toMoney(0), net: toMoney(0) } as {
    count: number; gross: string; fees: string; net: string;
  };
}

/** Generate the full finance report with explicit rail-policy metadata. */
export async function generateFinanceReport(prisma: Db, input: FinanceReportInput = {}): Promise<FinanceReport> {
  const provider = input.provider ? normalizeProvider(input.provider) : null;
  const currency = String(input.currency || '').toUpperCase() || null;
  const startMs = input.periodStart ? tsMs(input.periodStart) : null;
  const endMs = input.periodEnd ? tsMs(input.periodEnd) : null;

  // Reports must never fail just because the preferred rail is not configured.
  let defaultRail: Record<string, unknown> | null = null;
  try {
    const selection = await selectPaymentRail(prisma, {
      currency: input.currency || 'KES',
      country: input.country,
      channel: input.channel,
      action: 'reconciliation',
    });
    defaultRail = {
      provider: selection.provider,
      region: selection.region,
      settlementCurrency: selection.settlementCurrency,
      reason: selection.reason,
    };
  } catch (err: any) {
    defaultRail = { provider: null, reason: String(err?.message || 'Rail unavailable') };
  }

  const [transactions, ledger, payouts, refunds, disputes, settlements, exceptions] = await Promise.all([
    allRows(prisma.orm.public.FinanceTransaction.all()),
    allRows(prisma.orm.public.LedgerEntry.all()),
    allRows(prisma.orm.public.Payout.all()),
    allRows(prisma.orm.public.Refund.all()),
    allRows(prisma.orm.public.Dispute.all()),
    allRows(prisma.orm.public.Settlement.all()),
    allRows(prisma.orm.public.ReconciliationItem.all()),
  ]);

  const matches = (row: any) => {
    if (provider && normalizeProvider(row.provider) !== provider) return false;
    if (currency && String(row.currency || '').toUpperCase() !== currency) return false;
    if (input.financeAccountId && String(row.financeAccountId || row.accountRef || '') !== input.financeAccountId) return false;
    return inPeriod(row, startMs, endMs);
  };

  const scopedTransactions = transactions.filter(matches);
  const scopedLedger = ledger.filter(matches);
  const scopedPayouts = payouts.filter(matches);
  const scopedRefunds = refunds.filter(matches);
  const scopedDisputes = disputes.filter(matches);
  const scopedSettlements = settlements.filter(matches);
  const scopedExceptions = exceptions.filter((row) => {
    if (provider || currency) return false; // exceptions are run-scoped, not transaction-scoped
    return inPeriod(row, startMs, endMs);
  });

  const volumeByProvider: FinanceReport['volumeByProvider'] = {};
  const volumeByMethod: FinanceReport['volumeByMethod'] = {};
  const volumeByCurrency: FinanceReport['volumeByCurrency'] = {};
  const feeAmounts: MoneyInput[] = [];
  const netAmounts: MoneyInput[] = [];
  const grossAmounts: MoneyInput[] = [];

  for (const row of scopedTransactions) {
    const key = normalizeProvider(row.provider);
    const volume = volumeByProvider[key] || emptyVolume();
    volume.count += 1;
    volume.gross = sumMoney([volume.gross, row.amount]);
    volume.fees = sumMoney([volume.fees, row.fee]);
    volume.net = sumMoney([volume.net, row.net]);
    volumeByProvider[key] = volume;

    const method = methodOf(row);
    const byMethod = volumeByMethod[method] || { count: 0, gross: toMoney(0) };
    byMethod.count += 1;
    byMethod.gross = sumMoney([byMethod.gross, row.amount]);
    volumeByMethod[method] = byMethod;

    const currencyKey = String(row.currency || 'KES').toUpperCase();
    const byCurrency = volumeByCurrency[currencyKey] || { count: 0, gross: toMoney(0) };
    byCurrency.count += 1;
    byCurrency.gross = sumMoney([byCurrency.gross, row.amount]);
    volumeByCurrency[currencyKey] = byCurrency;

    grossAmounts.push(row.amount);
    feeAmounts.push(row.fee);
    netAmounts.push(row.net);
  }

  const payoutTotalsByProvider: FinanceReport['payoutTotalsByProvider'] = {};
  for (const row of scopedPayouts) {
    const key = normalizeProvider(row.provider);
    const total = payoutTotalsByProvider[key] || { count: 0, total: toMoney(0) };
    total.count += 1;
    total.total = sumMoney([total.total, row.amount]);
    payoutTotalsByProvider[key] = total;
  }

  const openDisputes = scopedDisputes.filter((row) => !['RESOLVED', 'CLOSED', 'WON', 'LOST'].includes(String(row.status).toUpperCase()));
  const openRefunds = scopedRefunds.filter((row) => ['PENDING', 'PENDING_APPROVAL', 'PROCESSING', 'REVIEW'].includes(String(row.status).toUpperCase()));

  const exceptionsByType: Record<string, number> = {};
  for (const row of scopedExceptions) {
    const key = String(row.type || 'UNKNOWN');
    exceptionsByType[key] = (exceptionsByType[key] || 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    filters: {
      provider,
      financeAccountId: input.financeAccountId ?? null,
      currency,
      country: input.country ?? null,
      periodStart: input.periodStart ? new Date(tsMs(input.periodStart)).toISOString() : null,
      periodEnd: input.periodEnd ? new Date(tsMs(input.periodEnd)).toISOString() : null,
    },
    defaultRail,
    volumeByProvider,
    volumeByMethod,
    volumeByCurrency,
    totals: {
      gross: sumMoney(grossAmounts),
      fees: sumMoney(feeAmounts),
      net: sumMoney(netAmounts),
      payouts: sumMoney(scopedPayouts.map((row) => row.amount)),
      payoutCount: scopedPayouts.length,
    },
    payoutTotalsByProvider,
    openDisputes: { count: openDisputes.length, amount: sumMoney(openDisputes.map((row) => row.amount)) },
    openRefunds: { count: openRefunds.length, amount: sumMoney(openRefunds.map((row) => row.amount)) },
    reconciliationExceptions: exceptionsByType,
  };
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(',');
}

/** Stable CSV shape: one section per aggregation, easy to open in a sheet. */
export function financeReportToCsv(report: FinanceReport): string {
  const lines: string[] = [];
  lines.push(csvRow(['SECTION', 'KEY', 'COUNT', 'GROSS', 'FEES', 'NET', 'CURRENCY', 'NOTE']));
  lines.push(csvRow(['META', 'generatedAt', '', '', '', '', '', report.generatedAt]));
  lines.push(csvRow(['META', 'defaultRail', '', '', '', '', '', report.defaultRail?.provider || 'unavailable']));
  for (const [key, value] of Object.entries(report.volumeByProvider)) {
    lines.push(csvRow(['PROVIDER', key, value.count, value.gross, value.fees, value.net, '']));
  }
  for (const [key, value] of Object.entries(report.volumeByMethod)) {
    lines.push(csvRow(['METHOD', key, value.count, value.gross, '', '', '']));
  }
  for (const [key, value] of Object.entries(report.volumeByCurrency)) {
    lines.push(csvRow(['CURRENCY', key, value.count, value.gross, '', '', key]));
  }
  for (const [key, value] of Object.entries(report.payoutTotalsByProvider)) {
    lines.push(csvRow(['PAYOUT', key, value.count, value.total, '', '', '']));
  }
  lines.push(csvRow(['TOTAL', 'transactions', '', report.totals.gross, report.totals.fees, report.totals.net, '']));
  lines.push(csvRow(['TOTAL', 'payouts', report.totals.payoutCount, report.totals.payouts, '', '', '']));
  lines.push(csvRow(['OPEN', 'disputes', report.openDisputes.count, report.openDisputes.amount, '', '', '']));
  lines.push(csvRow(['OPEN', 'refunds', report.openRefunds.count, report.openRefunds.amount, '', '', '']));
  for (const [key, count] of Object.entries(report.reconciliationExceptions)) {
    lines.push(csvRow(['EXCEPTION', key, count, '', '', '', '']));
  }
  return `${lines.join('\r\n')}\r\n`;
}

/** CSV serializer for transaction exports. */
export function transactionsToCsv(rows: any[]): string {
  const lines = [csvRow(['id', 'provider', 'externalRef', 'type', 'direction', 'amount', 'fee', 'net', 'currency', 'status', 'accountRef', 'customerRef', 'sourceType', 'sourceId', 'occurredAt'])];
  for (const row of rows || []) {
    lines.push(csvRow([
      row.id, row.provider, row.externalRef, row.transactionType, row.direction,
      row.amount, row.fee, row.net, row.currency, row.status, row.accountRef,
      row.customerRef, row.sourceType, row.sourceId, row.occurredAt,
    ]));
  }
  return `${lines.join('\r\n')}\r\n`;
}

export default { generateFinanceReport, financeReportToCsv, transactionsToCsv };
