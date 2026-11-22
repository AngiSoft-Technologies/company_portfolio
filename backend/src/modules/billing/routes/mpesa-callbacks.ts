import { getConfig } from '../../../shared/services/runtimeConfig';
import { Router, type Request } from 'express';
import crypto from 'crypto';
import type { Db } from '../../../db';
import { ts } from '../../../prisma/db';
import { recordProviderEvent } from '../../../shared/services/providerEvents';
import { logAudit } from '../../../shared/services/audit';
import { decodeCallback, parseAccountBalance } from '../services/payments/darajaPayouts';
import { fromMoney } from '../utils/money';

type JsonObject = Record<string, unknown>;

function asJsonObject(value: unknown): JsonObject {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

/**
 * Stable ProviderEvent dedupe id for Daraja callbacks.
 *
 * The pack recommends `CheckoutRequestID` for STK idempotency; result callbacks
 * carry our `OriginatorConversationID`, then `ConversationID` / `TransID` /
 * `TransactionID`. Phone numbers and customer names are never used as keys.
 * Callers still rely on `recordProviderEvent()` to enforce the dedupe at write
 * time; this helper only chooses the key from the callback envelope.
 */
export function callbackDedupeId(body: unknown): string | null {
  const payload = asJsonObject(body);
  const result = asJsonObject(payload.Result);
  const stk = asJsonObject(asJsonObject(payload.Body).stkCallback);
  const candidates = [
    stk.CheckoutRequestID ?? payload.CheckoutRequestID,
    result.OriginatorConversationID ?? payload.OriginatorConversationID,
    result.ConversationID ?? payload.ConversationID,
    payload.TransID,
    result.TransactionID ?? payload.TransactionID,
  ];
  for (const candidate of candidates) {
    const id = String(candidate ?? '').trim();
    if (id) return id;
  }
  return null;
}

/**
 * Settle a pending reversal ledger entry only after Daraja reports a terminal
 * result. The request handler deliberately posts `PENDING`; this callback is
 * the sole place that moves a reversal to COMPLETED/FAILED, and it refuses to
 * settle when the reported amount differs from the stored amount.
 */
async function settlePendingReversal(
  prisma: Db,
  decoded: Record<string, any>,
  successful: boolean,
  externalEventId: string,
): Promise<void> {
  const reference = String(decoded.originatorConversationId || '').trim();
  if (!reference) return;
  let entries: any[] = [];
  try {
    entries = (await prisma.orm.public.LedgerEntry
      .where({
        provider: 'MPESA' as any,
        externalRef: reference,
        entryType: 'REVERSAL' as any,
        status: 'PENDING' as any,
      } as any)
      .all()) as any[];
  } catch {
    entries = [];
  }
  if (!entries.length) return;

  if (decoded.amount !== undefined && Number.isFinite(Number(decoded.amount))) {
    const received = Number(decoded.amount);
    const mismatched = entries.find((entry: any) => {
      const expected = fromMoney(String(entry.amount ?? '0'));
      return Math.abs(expected - received) > 0.01;
    });
    if (mismatched) {
      await logAudit({
        action: 'DARAJA_REVERSAL_AMOUNT_MISMATCH',
        entity: 'LedgerEntry',
        entityId: String((mismatched as any).id || reference),
        meta: { reference, received, externalEventId },
      });
      await recordProviderEvent(prisma, {
        provider: 'MPESA', domain: 'FINANCE',
        externalEventId: `${externalEventId}:REVERSAL_AMOUNT_MISMATCH`,
        eventType: 'DARAJA_REVERSAL_AMOUNT_MISMATCH',
        signatureValid: false,
        payload: { ...asJsonObject(decoded.raw), authMethod: 'SHARED_CALLBACK_TOKEN' },
        status: 'FAILED',
      });
      return;
    }
  }

  const finalStatus = successful ? 'COMPLETED' : 'FAILED';
  for (const entry of entries as any[]) {
    const previous = asJsonObject(entry.metadata);
    await prisma.orm.public.LedgerEntry.where({ id: entry.id } as any).update({
      status: finalStatus as any,
      metadata: JSON.parse(JSON.stringify({
        ...previous,
        callback: { resultCode: decoded.resultCode, resultDesc: decoded.resultDesc, transactionId: decoded.transactionId },
        settledAt: ts(),
      })),
    } as any).catch(() => undefined);
    if (entry.providerEventId) {
      await prisma.orm.public.FinanceTransaction
        .where({ providerEventId: entry.providerEventId, transactionType: 'REVERSAL' } as any)
        .update({ status: finalStatus as any, updatedAt: ts() } as any)
        .catch(() => undefined);
    }
    await logAudit({
      action: successful ? 'DARAJA_REVERSAL_SETTLED' : 'DARAJA_REVERSAL_FAILED',
      entity: 'LedgerEntry', entityId: entry.id,
      meta: { reference, externalEventId, resultCode: decoded.resultCode, resultDesc: decoded.resultDesc },
    });
  }
}

/** Do not persist the shared callback token (or any auth header) in events. */
function safeHeaders(req: Request): JsonObject {
  const redacted = new Set([
    'authorization',
    'cookie',
    'set-cookie',
    'x-callback-token',
  ]);
  return Object.fromEntries(
    Object.entries(req.headers as JsonObject)
      .filter(([name]) => !redacted.has(name.toLowerCase())),
  );
}

/** Structured, read-only reconciliation view of a Daraja C2B confirmation. */
export interface C2bConfirmation {
  transId: string;
  billRefNumber: string;
  amount?: number;
  accountBalance?: string;
}

/**
 * Extract only the fields needed to review a C2B confirmation later.
 *
 * `TransID` is the dedupe key and `BillRefNumber` is the only account match
 * key — MSISDN is deliberately never used to match a payment. This is a pure
 * parser: it never queries, updates or posts to the ledger.
 */
export function extractC2bConfirmation(body: unknown): C2bConfirmation | null {
  const payload = asJsonObject(body);
  const transId = String(payload.TransID ?? '').trim();
  if (!transId) return null;

  const billRefNumber = String(payload.BillRefNumber ?? '').trim();
  const amountRaw = payload.Amount;
  const amount = Number(amountRaw);
  return {
    transId,
    billRefNumber,
    ...(amountRaw !== undefined && amountRaw !== null && Number.isFinite(amount) ? { amount } : {}),
    ...(payload.AccountBalance !== undefined && payload.AccountBalance !== null
      ? { accountBalance: String(payload.AccountBalance) } : {}),
  };
}

/** ProviderEvent dedupe id for a C2B confirmation — keyed on TransID alone. */
export function c2bConfirmationExternalId(transId: string): string {
  return `C2B_CONFIRMATION:TransID:${transId}`;
}

/**
 * Read-only review record for a parsed account balance from a Daraja result.
 * `reviewOnly` / `autoSettlement` make the no-money-movement contract explicit
 * for whoever reads the ProviderEvent later.
 */
export interface AccountBalanceReview {
  raw: string;
  parsed: NonNullable<ReturnType<typeof parseAccountBalance>>;
  reviewOnly: true;
  autoSettlement: false;
}

/** Parse a balance string into an auditable review payload. Never settles. */
export function buildAccountBalanceReview(value: unknown): AccountBalanceReview | null {
  const parsed = parseAccountBalance(value);
  if (!parsed) return null;
  return {
    raw: String(value),
    parsed,
    reviewOnly: true,
    autoSettlement: false,
  };
}

/**
 * Public Daraja result callback for B2C, B2B, status queries, reversals and the
 * extended products. Daraja callbacks are not cryptographically signed, so the
 * shared `MPESA_CALLBACK_TOKEN` constant-time gate is mandatory: fail closed
 * (503) when unconfigured, reject (403) when wrong. Events recorded here set
 * `signatureValid: false`: possession of a shared token is authentication, not
 * a verified cryptographic signature.
 *
 * Heavy work happens after an immediate 200 ack, with the callback retained as
 * an immutable ProviderEvent keyed by CheckoutRequestID / transaction id and
 * terminal payout states protected from replays. Auth headers are redacted
 * before persistence. Parsed account balances are mirrored into a separate
 * review-only event; no ledger entry or settlement is driven from that data.
 */
export default function mpesaCallbacksRouter(prisma: Db) {
  const router = Router();

  const tokenOk = (req: Request) => {
    const expected = getConfig('MPESA_CALLBACK_TOKEN').trim();
    if (!expected) return false;
    const supplied = String(req.query?.token || req.headers?.['x-callback-token'] || '');
    const a = Buffer.from(expected);
    const b = Buffer.from(supplied);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };

  router.post('/callback', async (req, res) => {
    if (!tokenOk(req)) {
      const missing = !getConfig('MPESA_CALLBACK_TOKEN').trim();
      return res.status(missing ? 503 : 403).send(missing ? 'Callback token not configured' : 'Invalid callback token');
    }

    // Ack immediately — Daraja retries on non-2xx and duplicates are safe.
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    try {
      const decoded = decodeCallback(req.body);
      if (!decoded) return;

      const isTimeout = decoded.resultType === 2 || /timeout|timed out/i.test(decoded.resultDesc);
      const successful = decoded.resultCode === '0' && !isTimeout;
      // Prefer the documented idempotency key (CheckoutRequestID for STK),
      // then our correlation/provider ids. The final hash keeps unsolicited
      // status callbacks dedupable without using phone numbers or names.
      const eventType = isTimeout ? 'DARAJA_TIMEOUT' : 'DARAJA_RESULT';
      const externalEventId = callbackDedupeId(req.body)
        || crypto.createHash('sha256').update(JSON.stringify(decoded.raw)).digest('hex');

      await recordProviderEvent(prisma, {
        provider: 'MPESA', domain: 'FINANCE',
        externalEventId,
        eventType,
        // Shared callback token, not a verified cryptographic signature.
        signatureValid: false,
        payload: { ...asJsonObject(decoded.raw), authMethod: 'SHARED_CALLBACK_TOKEN' },
        headers: safeHeaders(req),
        status: successful ? 'PROCESSED' : 'FAILED',
      });
      await logAudit({
        action: 'DARAJA_CALLBACK_RECEIVED',
        entity: 'ProviderEvent',
        entityId: externalEventId,
        meta: {
          eventType,
          resultCode: decoded.resultCode,
          authMethod: 'SHARED_CALLBACK_TOKEN',
        },
      });

      // Account-balance results used to be parsed in tests only. Mirror the
      // parsed value into a dedicated review event so finance can inspect it.
      // It is recorded as already handled (never enqueued) and explicitly
      // forbids settlement — this path must not move money.
      const balanceReview = decoded.accountBalance
        ? buildAccountBalanceReview(decoded.accountBalance) : null;
      if (balanceReview) {
        const reviewId = `${externalEventId}:BALANCE_REVIEW`;
        await recordProviderEvent(prisma, {
          provider: 'MPESA', domain: 'FINANCE',
          externalEventId: reviewId,
          eventType: 'DARAJA_ACCOUNT_BALANCE_REVIEW',
          signatureValid: false,
          payload: {
            ...balanceReview,
            sourceEventId: externalEventId,
            transactionId: decoded.transactionId,
            conversationId: decoded.conversationId,
            originatorConversationId: decoded.originatorConversationId,
            authMethod: 'SHARED_CALLBACK_TOKEN',
          },
          status: 'PROCESSED',
        });
        await logAudit({
          action: 'DARAJA_ACCOUNT_BALANCE_REVIEW_RECORDED',
          entity: 'ProviderEvent',
          entityId: reviewId,
          meta: {
            externalEventId,
            accountType: balanceReview.parsed.accountType,
            currency: balanceReview.parsed.currency,
            available: balanceReview.parsed.available,
          },
        });
      }

      // Reversals are mirrored as PENDING ledger entries at request time.
      // Only this terminal callback may settle them, and only after the amount
      // cross-check above. This runs even if no payout row needs updating.
      await settlePendingReversal(prisma, decoded as unknown as Record<string, any>, successful, externalEventId);

      const reference = decoded.originatorConversationId;
      if (!reference) return;
      const payout = await prisma.orm.public.Payout.where({ reference }).first();
      if (!payout) return;
      const stored = payout as unknown as JsonObject & { id: string; status?: string; amount?: unknown; providerReference?: string };

      // Ignore replays after a terminal state: only PENDING payouts transition.
      if (stored.status !== 'PENDING') return;

      if (decoded.amount !== undefined && Number.isFinite(Number(decoded.amount))) {
        const expected = fromMoney(String(stored.amount ?? '0'));
        if (Math.abs(expected - Number(decoded.amount)) > 0.01) {
          await logAudit({
            action: 'DARAJA_CALLBACK_AMOUNT_MISMATCH',
            entity: 'Payout',
            entityId: stored.id,
            meta: { expected, received: decoded.amount, externalEventId },
          });
          await recordProviderEvent(prisma, {
            provider: 'MPESA', domain: 'FINANCE',
            externalEventId: `${externalEventId}:AMOUNT_MISMATCH`,
            eventType: 'DARAJA_AMOUNT_MISMATCH',
            // Token-authenticated only; no cryptographic signature was checked.
            signatureValid: false,
            payload: { ...asJsonObject(decoded.raw), authMethod: 'SHARED_CALLBACK_TOKEN' },
            status: 'FAILED',
          });
          return;
        }
      }

      const previous = asJsonObject(stored.metadata);
      await prisma.orm.public.Payout.where({ id: stored.id, status: 'PENDING' }).update({
        providerReference: decoded.transactionId || stored.providerReference,
        status: successful ? 'COMPLETED' : 'FAILED',
        metadata: JSON.parse(JSON.stringify({
          ...previous,
          callback: decoded,
          updatedAt: ts(),
        })),
      } as never);

      await logAudit({
        action: successful ? 'DARAJA_PAYOUT_SETTLED' : 'DARAJA_PAYOUT_FAILED',
        entity: 'Payout',
        entityId: payout.id,
        meta: {
          reference,
          externalEventId,
          transactionId: decoded.transactionId,
          resultCode: decoded.resultCode,
          resultDesc: decoded.resultDesc,
        },
      });
    } catch (err) {
      console.error('Daraja callback handling failed', (err as Error)?.message);
    }
  });

  return router;
}
