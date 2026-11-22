/**
 * Append-only finance ledger service.
 *
 * Every money movement is mirrored into three normalized rows:
 *   ProviderEvent    — deterministic dedupe/audit anchor (immutable inbox)
 *   LedgerEntry      — immutable double-entry-style record
 *   FinanceTransaction — query/export view used by the Finance Hub UI
 *
 * Writes are idempotent by a deterministic key (provider + external reference
 * + type + direction + money + source). Ledger failures are never swallowed:
 * they raise a structured LedgerPostError after recording a ReconciliationItem
 * so the exception is visible in reconciliation reports.
 */

import { createHash } from 'crypto';
import type { Db, Tx } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { getConfig } from '../../../shared/services/runtimeConfig';
import { recordProviderEvent } from '../../../shared/services/providerEvents';
import { toMoney, subMoney, addMoney, type MoneyInput } from '../../billing/utils/money';
import { normalizeProvider } from './capabilityMatrix';

export type LedgerEntryType = 'PAYMENT' | 'PAYOUT' | 'REFUND' | 'REVERSAL' | 'FEE' | 'SETTLEMENT';
export type LedgerDirection = 'IN' | 'OUT' | 'CREDIT' | 'DEBIT';

export interface PostLedgerEntryInput {
  provider: string;
  externalRef?: string | null;
  entryType: LedgerEntryType;
  direction: LedgerDirection;
  amount: MoneyInput;
  fee?: MoneyInput;
  currency?: string;
  status?: string;
  financeAccountId?: string | null;
  connectionId?: string | null;
  accountRef?: string | null;
  customerRef?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  /** Reuse an already-recorded ProviderEvent instead of creating another. */
  providerEventId?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt?: Date | string | number | null;
  /** Explicit idempotency key override for callers that already have one. */
  dedupeKey?: string | null;
}

export interface LedgerPostResult {
  event: any;
  ledgerEntry: any;
  financeTransaction: any | null;
  deduped: boolean;
  dedupeKey: string;
}

export class LedgerPostError extends Error {
  constructor(
    message: string,
    public readonly cause: unknown,
    public readonly dedupeKey: string,
    public readonly exceptionRecorded: boolean,
  ) {
    super(message);
    this.name = 'LedgerPostError';
  }
}

export function ledgerDedupeKey(input: PostLedgerEntryInput): string {
  if (input.dedupeKey && input.dedupeKey.trim()) return input.dedupeKey.trim();
  const parts = [
    normalizeProvider(input.provider),
    String(input.externalRef || ''),
    String(input.entryType).toUpperCase(),
    normalizeDirection(input.direction),
    String(toMoney(input.amount ?? 0)),
    String(toMoney(input.fee ?? 0)),
    String(input.currency || 'KES').toUpperCase(),
    String(input.sourceType || ''),
    String(input.sourceId || ''),
  ];
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

function normalizeDirection(direction: LedgerDirection): 'IN' | 'OUT' {
  const value = String(direction).toUpperCase();
  if (value === 'CREDIT') return 'IN';
  if (value === 'DEBIT') return 'OUT';
  if (value === 'IN' || value === 'OUT') return value;
  throw new Error(`Invalid ledger direction: ${direction}`);
}

/** Resolve the account this provider movement belongs to, if one exists. */
export async function resolveFinanceAccount(
  prisma: Db,
  provider: string,
  externalRef?: string | null,
): Promise<any | null> {
  const key = normalizeProvider(provider);
  try {
    if (externalRef) {
      const byExternal = await prisma.orm.public.FinanceAccount
        .where({ provider: key as any, externalId: String(externalRef) } as any)
        .first()
        .catch(() => null);
      if (byExternal) return byExternal;
    }
    return await prisma.orm.public.FinanceAccount
      .where({ provider: key as any, status: 'ACTIVE' } as any)
      .orderBy((a: any) => a.createdAt.asc())
      .first()
      .catch(() => null);
  } catch {
    return null;
  }
}

async function withLedgerLock<T>(prisma: Db, scope: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const digest = createHash('sha256').update(`angfinance:${scope}`).digest();
  const key = BigInt.asIntN(64, digest.readBigInt64BE(0));
  return prisma.transaction(async (tx) => {
    const lock = prisma.raw.sql`SELECT pg_advisory_xact_lock(${key})`.affectedCount().build();
    await tx.execute(lock);
    return fn(tx);
  });
}

/**
 * Record a ledger exception as a real reconciliation row. Uses a dedicated
 * failed run so the item always has a valid FK, even outside a scheduled run.
 */
export async function recordLedgerFailure(prisma: Db, input: {
  message: string;
  error?: unknown;
  dedupeKey?: string;
  provider: string;
  externalRef?: string | null;
  amount?: MoneyInput;
  currency?: string;
  sourceType?: string | null;
  sourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<string | null> {
  const safeMessage = redact(String(input.error instanceof Error ? input.error.message : (input.error || input.message)).slice(0, 1000));
  try {
    const run = await prisma.orm.public.ReconciliationRun.create({
      id: newId(),
      provider: normalizeProvider(input.provider),
      financeAccountId: null,
      status: 'FAILED',
      periodStart: null,
      periodEnd: null,
      summary: { kind: 'LEDGER_POST_FAILURE', dedupeKey: input.dedupeKey || null, generatedAt: ts() } as any,
      error: safeMessage,
      createdById: null,
      createdAt: ts(),
      completedAt: ts(),
    } as any);
    const item = await prisma.orm.public.ReconciliationItem.create({
      id: newId(),
      runId: run.id,
      type: 'LEDGER_POST_FAILURE',
      sourceType: input.sourceType || null,
      sourceId: input.sourceId || null,
      externalRef: input.externalRef || null,
      amount: toMoney(input.amount ?? 0),
      currency: String(input.currency || 'KES').toUpperCase(),
      status: 'OPEN',
      note: safeMessage,
      resolvedById: null,
      metadata: {
        dedupeKey: input.dedupeKey || null,
        error: safeMessage,
        ...(input.metadata || {}),
      } as any,
      createdAt: ts(),
      resolvedAt: null,
    } as any);
    return item.id;
  } catch (err: any) {
    // Last resort: never swallow the original money-movement failure silently.
    console.error('Could not persist ledger failure reconciliation item', err?.message || err);
    return null;
  }
}

/** Strip URL credentials/query tokens from error text before persisting it. */
function redact(message: string): string {
  return message
    .replace(/\/\/[^/\s:@]+:[^/\s@]+@/g, '//***:***@')
    .replace(/(api[_-]?key|secret|token|password|signature)=([^\s&]+)/gi, '$1=***');
}

/**
 * Idempotently post one ledger entry plus its normalized transaction view.
 * Throws LedgerPostError (after recording the exception) on any failure.
 */
export async function postLedgerEntry(prisma: Db, input: PostLedgerEntryInput): Promise<LedgerPostResult> {
  const dedupeKey = ledgerDedupeKey(input);
  const provider = normalizeProvider(input.provider);
  const direction = normalizeDirection(input.direction);
  const amount = toMoney(input.amount ?? 0);
  const fee = toMoney(input.fee ?? 0);
  // IN: net is what lands after fees. OUT: net is total cash leaving us.
  const net = direction === 'IN' ? subMoney(amount, fee) : addMoney(amount, fee);
  const currency = String(input.currency || getConfig('PESAFLOW_CURRENCY', 'KES') || 'KES').toUpperCase();
  const occurredAt = ts(input.occurredAt ?? Date.now());

  try {
    const existingEvent = input.providerEventId
      ? await prisma.orm.public.ProviderEvent.where({ id: input.providerEventId } as any).first().catch(() => null)
      : null;
    const event = existingEvent || (await recordProviderEvent(prisma, {
      connectionId: input.connectionId ?? null,
      provider,
      domain: 'FINANCE',
      externalEventId: `ledger:${dedupeKey}`,
      eventType: `ledger.${String(input.entryType).toLowerCase()}`,
      signatureValid: true,
      payload: {
        entryType: input.entryType,
        direction,
        amount,
        fee,
        net,
        currency,
        externalRef: input.externalRef ?? null,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
      },
      status: 'PROCESSED',
    })).event;

    return await withLedgerLock(prisma, `ledger:${dedupeKey}`, async (tx) => {
      const existing = await tx.orm.public.LedgerEntry
        .where({ providerEventId: event.id } as any)
        .first()
        .catch(() => null);
      if (existing) {
        const existingTransaction = await tx.orm.public.FinanceTransaction
          .where({ providerEventId: event.id, transactionType: String(input.entryType).toUpperCase() } as any)
          .first()
          .catch(() => null);
        return {
          event,
          ledgerEntry: existing,
          financeTransaction: existingTransaction,
          deduped: true,
          dedupeKey,
        };
      }

      const account = input.financeAccountId
        ? await tx.orm.public.FinanceAccount.where({ id: input.financeAccountId } as any).first().catch(() => null)
        : null;

      const ledgerEntry = await tx.orm.public.LedgerEntry.create({
        id: newId(),
        financeAccountId: account?.id ?? input.financeAccountId ?? null,
        provider,
        externalRef: input.externalRef ?? null,
        entryType: String(input.entryType).toUpperCase(),
        direction,
        amount,
        fee,
        net,
        currency,
        status: String(input.status || 'SUCCEEDED').toUpperCase(),
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        providerEventId: event.id,
        metadata: (input.metadata ?? null) as any,
        occurredAt,
        createdAt: ts(),
      } as any);

      let financeTransaction: any = null;
      const existingTransaction = await tx.orm.public.FinanceTransaction
        .where({ providerEventId: event.id, transactionType: String(input.entryType).toUpperCase() } as any)
        .first()
        .catch(() => null);
      if (!existingTransaction) {
        financeTransaction = await tx.orm.public.FinanceTransaction.create({
          id: newId(),
          provider,
          externalRef: input.externalRef ?? null,
          transactionType: String(input.entryType).toUpperCase(),
          direction,
          amount,
          fee,
          net,
          currency,
          status: String(input.status || 'SUCCEEDED').toUpperCase(),
          accountRef: input.accountRef ?? account?.externalId ?? account?.id ?? null,
          customerRef: input.customerRef ?? null,
          sourceType: input.sourceType ?? null,
          sourceId: input.sourceId ?? null,
          providerEventId: event.id,
          metadata: (input.metadata ?? null) as any,
          occurredAt,
          createdAt: ts(),
          updatedAt: ts(),
        } as any);
      }

      return {
        event,
        ledgerEntry,
        financeTransaction: financeTransaction ?? existingTransaction,
        deduped: false,
        dedupeKey,
      };
    });
  } catch (err: any) {
    const exceptionId = await recordLedgerFailure(prisma, {
      message: err?.message || 'Ledger posting failed',
      error: err,
      dedupeKey,
      provider,
      externalRef: input.externalRef ?? null,
      amount: input.amount ?? 0,
      currency,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      metadata: { entryType: input.entryType, direction },
    });
    const error = new LedgerPostError(
      err?.message || 'Ledger posting failed',
      err,
      dedupeKey,
      Boolean(exceptionId),
    );
    console.error('Ledger posting failed', redact(error.message));
    throw error;
  }
}

export default {
  postLedgerEntry,
  resolveFinanceAccount,
  recordLedgerFailure,
  ledgerDedupeKey,
  LedgerPostError,
};
