import type { Db } from '../db';
import prisma from '../db';
import { ts } from '../prisma/db';
import { createWorker } from '../queue';
import { logAudit } from '../shared/services/audit';
import {
  decodeStkQueryResult,
  MPESA_STK_RECOVERY_QUEUE,
  queryStkStatus,
  type StkRecoveryJob,
} from '../modules/billing/services/payments/mpesaService';
import { applyPaymentOutcome } from '../modules/billing/services/payments';
import { fromMoney } from '../modules/billing/utils/money';

interface PaymentRow {
  id: string;
  status: string;
  amount: unknown;
  currency: string;
  reference?: string | null;
  channelId?: string | null;
  bookingId?: string | null;
  clientId?: string | null;
  metadata?: unknown;
}

/**
 * Recover exactly one lost/STK callback by querying Daraja once.
 *
 * There is deliberately no reschedule and no retry loop: a delayed query is
 * the entire recovery strategy. Only an explicit terminal result with a
 * matching amount can move a PENDING Payment; anything else is left alone for
 * the normal callback path (or manual reconciliation).
 */
export async function processStkRecoveryOnce(prismaClient: Db, job: StkRecoveryJob): Promise<'SKIPPED' | 'APPLIED'> {
  const checkoutRequestId = String(job.checkoutRequestId ?? '').trim();
  if (!/^[A-Za-z0-9_.:-]+$/.test(checkoutRequestId)) return 'SKIPPED';

  const payment = await prismaClient.orm.public.Payment
    .where({ providerId: checkoutRequestId, provider: 'MPESA' } as never)
    .first()
    .catch(() => null) as PaymentRow | null;
  // A real callback (or an operator action) may already have settled it.
  if (!payment || payment.status !== 'PENDING') return 'SKIPPED';

  const query = await queryStkStatus(checkoutRequestId);
  const decoded = decodeStkQueryResult(query);
  if (decoded.outcome === 'PENDING' || decoded.outcome === 'UNKNOWN') return 'SKIPPED';

  const previous = (payment.metadata && typeof payment.metadata === 'object' && !Array.isArray(payment.metadata))
    ? payment.metadata as Record<string, unknown>
    : {};
  const recovery = {
    source: 'stk_status_recovery',
    queriedAt: ts(),
    resultCode: decoded.resultCode,
    resultDescription: decoded.resultDescription,
    receipt: decoded.receipt ?? null,
    amount: decoded.amount ?? null,
  };

  if (decoded.outcome === 'SUCCESS') {
    const expected = fromMoney(String(payment.amount ?? '0'));
    if (decoded.amount === undefined || Math.abs(expected - decoded.amount) > 0.01) {
      await logAudit({
        action: 'MPESA_STK_RECOVERY_AMOUNT_MISMATCH',
        entity: 'Payment',
        entityId: payment.id,
        meta: { checkoutRequestId, expected, received: decoded.amount ?? null, resultCode: decoded.resultCode },
      });
      return 'SKIPPED';
    }
  }

  const status = decoded.outcome === 'SUCCESS' ? 'SUCCEEDED' : 'FAILED';
  const outcome = await applyPaymentOutcome(prismaClient, {
    provider: 'MPESA',
    providerId: checkoutRequestId,
    amount: String(payment.amount ?? '0') as never,
    currency: payment.currency || 'KES',
    reference: payment.reference ?? job.reference,
    channelId: payment.channelId ?? undefined,
    bookingId: payment.bookingId ?? undefined,
    clientId: payment.clientId ?? undefined,
    status,
    metadata: { ...previous, stkRecovery: recovery },
  });
  if (outcome) {
    await logAudit({
      action: status === 'SUCCEEDED' ? 'MPESA_STK_RECOVERY_SETTLED' : 'MPESA_STK_RECOVERY_FAILED',
      entity: 'Payment',
      entityId: payment.id,
      meta: { checkoutRequestId, resultCode: decoded.resultCode, receipt: decoded.receipt ?? null },
    });
  }
  return outcome ? 'APPLIED' : 'SKIPPED';
}

/** Start the delayed one-shot recovery consumer. */
export function startMpesaStkRecoveryWorker() {
  const worker = createWorker(MPESA_STK_RECOVERY_QUEUE, async (job) => {
    // Swallow errors so a failed query never becomes an immediate retry loop.
    try {
      await processStkRecoveryOnce(prisma, job.data as unknown as StkRecoveryJob);
    } catch (err) {
      console.warn('M-Pesa STK recovery skipped:', err instanceof Error ? err.message : String(err));
    }
  });
  return worker.isRunning;
}
