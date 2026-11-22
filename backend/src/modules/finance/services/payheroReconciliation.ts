/**
 * READ-ONLY PayHero reconciliation diagnostic.
 *
 * PayHero callbacks are recorded as immutable ProviderEvents (`provider:
 * 'PAYHERO'`) and applied to the normalized ledger by `applyPaymentOutcome`,
 * which upserts a `Payment` by providerId (the PayHero CheckoutRequestID).
 * This module cross-checks those two persisted records and produces
 * *suggestions only*.
 *
 * It never calls PayHero, never writes, never posts to the ledger, never
 * settles an invoice or booking, and never mutates a ProviderEvent. Amount
 * comparisons are advisory; a mismatch is a signal for a human reviewer, not
 * an automatic rejection or settlement. Reference matching is deliberately
 * strict (trim + case-fold only) to avoid false positives on money data.
 */

type Row = Record<string, any>;

function objectOf(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Row
    : {};
}

function normRef(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

function numOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(value: unknown): string | null {
  const s = String(value ?? '').trim();
  return s || null;
}

export interface PayHeroEventInput {
  id?: unknown;
  externalEventId?: unknown;
  eventType?: unknown;
  createdAt?: unknown;
  payload?: unknown;
}

export interface PayHeroPaymentInput {
  id?: unknown;
  providerId?: unknown;
  reference?: unknown;
  amount?: unknown;
  currency?: unknown;
  status?: unknown;
  createdAt?: unknown;
}

export type PayHeroReviewStatus =
  | 'MATCHED'
  | 'AMOUNT_MISMATCH'
  | 'CURRENCY_MISMATCH'
  | 'STATUS_MISMATCH'
  | 'MISSING_PAYMENT'
  | 'FAILED_EVENT'
  | 'NO_MATCH_KEY'
  | 'ORPHAN_PAYMENT';

export interface PayHeroReview {
  eventId: string | null;
  externalEventId: string | null;
  eventType: string | null;
  checkoutRequestId: string | null;
  externalReference: string | null;
  receipt: string | null;
  amount: number | null;
  currency: string | null;
  receivedAt: string | null;
  status: PayHeroReviewStatus;
  successful: boolean | null;
  payment: {
    id: string | null;
    providerId: string | null;
    reference: string | null;
    amount: number | null;
    currency: string | null;
    status: string | null;
    createdAt: string | null;
  } | null;
  matchedOn: 'providerId' | 'reference' | null;
  reasons: string[];
}

interface ParsedCallback {
  checkoutRequestId: string | null;
  externalReference: string | null;
  receipt: string | null;
  amount: number | null;
  resultCode: number | null;
  successful: boolean | null;
}

/**
 * Read the raw Safaricom/PayHero callback shape and the already-normalised
 * fields defensively. ProviderEvent.payload is the raw webhook body (`response`
 * or `data` wrapper), but legacy/imported rows may carry a decoded shape, so
 * both are accepted. No credentials or tokenised URLs are ever read here.
 */
function parseCallback(payload: unknown): ParsedCallback {
  const root = objectOf(payload);
  const inner = objectOf(root.response ?? root.data ?? root.responseBody ?? {});
  const pick = (...values: unknown[]) => values.find((v) => v !== undefined && v !== null && String(v).trim() !== '');

  const checkoutRequestId = strOrNull(pick(
    inner.CheckoutRequestID, inner.checkoutRequestId,
    root.CheckoutRequestID, root.checkoutRequestId,
  ));
  const externalReference = strOrNull(pick(
    inner.ExternalReference, inner.externalReference, inner.external_reference,
    root.ExternalReference, root.externalReference, root.external_reference,
  ));
  const receipt = strOrNull(pick(
    inner.MpesaReceiptNumber, root.MpesaReceiptNumber, root.receipt,
  ));

  const resultCode = numOrNull(pick(inner.ResultCode, root.resultCode, root.ResultCode));
  const statusText = String(pick(inner.Status, root.status, root.Status) ?? '').toLowerCase();
  const explicitSuccess = root.success ?? inner.success;

  let successful: boolean | null = null;
  if (typeof explicitSuccess === 'boolean') successful = explicitSuccess;
  else if (resultCode !== null) successful = resultCode === 0;
  else if (statusText) successful = ['success', 'completed', 'complete', 'paid', 'succeeded'].includes(statusText);
  else if (checkoutRequestId || externalReference) successful = null;

  return {
    checkoutRequestId,
    externalReference,
    receipt,
    amount: numOrNull(pick(inner.Amount, inner.amount, root.Amount, root.amount)),
    resultCode,
    successful,
  };
}

function paymentView(row: PayHeroPaymentInput) {
  return {
    id: strOrNull(row.id),
    providerId: strOrNull(row.providerId),
    reference: strOrNull(row.reference),
    amount: numOrNull(row.amount),
    currency: strOrNull(row.currency),
    status: strOrNull(row.status),
    createdAt: strOrNull(row.createdAt),
  };
}

/**
 * Suggest a reconciliation outcome for each reviewed PayHero event.
 *
 * A successful event with no Payment is reported as MISSING_PAYMENT; a failed
 * event with no Payment is informational (FAILED_EVENT). Payments present in
 * the reviewed window but absent from every event are reported as
 * ORPHAN_PAYMENT when `includeOrphans` is true. Nothing is mutated.
 */
export function reviewPayHeroEvents(
  events: readonly PayHeroEventInput[],
  payments: readonly PayHeroPaymentInput[],
  includeOrphans = true,
): PayHeroReview[] {
  const byProviderId = new Map<string, PayHeroPaymentInput[]>();
  const byReference = new Map<string, PayHeroPaymentInput[]>();
  const index = (map: Map<string, PayHeroPaymentInput[]>, key: string, row: PayHeroPaymentInput) => {
    if (!key) return;
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  };
  for (const payment of payments) {
    index(byProviderId, normRef(payment.providerId), payment);
    index(byReference, normRef(payment.reference), payment);
  }

  const matchedPaymentIds = new Set<unknown>();
  const suggestions: PayHeroReview[] = [];

  for (const event of events) {
    const parsed = parseCallback(event.payload);
    const base: PayHeroReview = {
      eventId: strOrNull(event.id),
      externalEventId: strOrNull(event.externalEventId),
      eventType: strOrNull(event.eventType),
      checkoutRequestId: parsed.checkoutRequestId,
      externalReference: parsed.externalReference,
      receipt: parsed.receipt,
      amount: parsed.amount,
      currency: 'KES',
      receivedAt: strOrNull(event.createdAt),
      status: 'NO_MATCH_KEY',
      successful: parsed.successful,
      payment: null,
      matchedOn: null,
      reasons: [],
    };

    const candidates: { row: PayHeroPaymentInput; matchedOn: 'providerId' | 'reference' }[] = [];
    const seen = new Set<unknown>();
    if (parsed.checkoutRequestId) {
      for (const row of byProviderId.get(normRef(parsed.checkoutRequestId)) ?? []) {
        candidates.push({ row, matchedOn: 'providerId' });
        if (row.id !== undefined) seen.add(row.id);
      }
    }
    if (parsed.externalReference) {
      for (const row of byReference.get(normRef(parsed.externalReference)) ?? []) {
        if (row.id !== undefined && seen.has(row.id)) continue;
        candidates.push({ row, matchedOn: 'reference' });
        if (row.id !== undefined) seen.add(row.id);
      }
    }

    if (!candidates.length) {
      if (!parsed.checkoutRequestId && !parsed.externalReference) {
        base.reasons.push('Event has no CheckoutRequestID or ExternalReference to match on.');
      } else if (parsed.successful === true) {
        base.status = 'MISSING_PAYMENT';
        base.reasons.push('Successful event has no matching Payment row; review the ledger before any settlement.');
      } else {
        base.status = 'FAILED_EVENT';
        base.reasons.push(
          parsed.successful === false
            ? 'Provider reported a failed result; no successful Payment is expected. No action taken.'
            : 'Event outcome is unknown; no matching Payment row found. No action taken.',
        );
      }
      suggestions.push(base);
      continue;
    }

    for (const { row, matchedOn } of candidates) {
      const reasons: string[] = [];
      const payment = paymentView(row);
      let status: PayHeroReviewStatus = 'MATCHED';

      const paymentAmount = numOrNull(row.amount);
      if (parsed.amount !== null && paymentAmount !== null && Math.abs(parsed.amount - paymentAmount) > 0.01) {
        status = 'AMOUNT_MISMATCH';
        reasons.push(`Callback amount (${parsed.amount}) differs from the Payment amount (${paymentAmount}).`);
      }
      const paymentCurrency = strOrNull(row.currency);
      if (paymentCurrency && paymentCurrency.toUpperCase() !== 'KES') {
        if (status === 'MATCHED') status = 'CURRENCY_MISMATCH';
        reasons.push(`PayHero settles in KES but the Payment currency is ${paymentCurrency}.`);
      }
      const paymentStatus = strOrNull(row.status);
      if (parsed.successful === true && paymentStatus && paymentStatus.toUpperCase() !== 'SUCCEEDED') {
        if (status === 'MATCHED') status = 'STATUS_MISMATCH';
        reasons.push(`Successful callback but the Payment status is ${paymentStatus}.`);
      } else if (parsed.successful === false && paymentStatus?.toUpperCase() === 'SUCCEEDED') {
        if (status === 'MATCHED') status = 'STATUS_MISMATCH';
        reasons.push('Failed callback but the Payment is marked SUCCEEDED.');
      }
      reasons.push(`Matched by ${matchedOn}. Review manually before any settlement.`);

      if (row.id !== undefined) matchedPaymentIds.add(row.id);
      suggestions.push({
        ...base,
        status,
        payment,
        matchedOn,
        reasons,
        currency: paymentCurrency ?? base.currency,
      });
    }
  }

  if (includeOrphans) {
    for (const row of payments) {
      if (row.id !== undefined && matchedPaymentIds.has(row.id)) continue;
      suggestions.push({
        eventId: null,
        externalEventId: null,
        eventType: null,
        checkoutRequestId: strOrNull(row.providerId),
        externalReference: strOrNull(row.reference),
        receipt: null,
        amount: numOrNull(row.amount),
        currency: strOrNull(row.currency),
        receivedAt: strOrNull(row.createdAt),
        status: 'ORPHAN_PAYMENT',
        successful: null,
        payment: paymentView(row),
        matchedOn: null,
        reasons: ['No PayHero ProviderEvent in the reviewed window references this Payment. No action taken.'],
      });
    }
  }

  return suggestions;
}

/** Count suggestions by status for the API summary and audit trail. */
export function summarizePayHeroReview(suggestions: readonly PayHeroReview[]): Record<string, number> {
  return suggestions.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}
