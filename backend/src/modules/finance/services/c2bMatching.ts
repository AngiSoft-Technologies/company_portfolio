/**
 * READ-ONLY C2B reconciliation diagnostic.
 *
 * Daraja C2B confirmations are recorded by the billing callbacks as immutable,
 * already-PROCESSED ProviderEvents carrying `matchKey: 'BillRefNumber'` and a
 * `matchValue`. That hook currently has no consumer — the resource plan marks
 * C2B reconciliation as "NOT IMPLEMENTED — MANUAL REVIEW ONLY".
 *
 * This module produces *suggestions only*. It never writes, posts to the
 * ledger, settles a payment, or mutates an invoice. A human finance reviewer
 * decides what (if anything) to do. Reference matching is deliberately strict
 * (trim + case-fold only) and amount cross-checks are advisory — a mismatch is
 * a signal for review, never an automatic rejection or settlement.
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

export interface C2bEventInput {
  id?: unknown;
  externalEventId?: unknown;
  createdAt?: unknown;
  payload?: unknown;
}

export interface InvoiceInput {
  id?: unknown;
  number?: unknown;
  publicReference?: unknown;
  status?: unknown;
  currency?: unknown;
  total?: unknown;
  balanceDue?: unknown;
}

export type C2bSuggestionStatus = 'MATCHED' | 'AMOUNT_MISMATCH' | 'UNMATCHED';

export interface C2bSuggestion {
  eventId: string | null;
  externalEventId: string | null;
  transId: string;
  billRefNumber: string;
  amount: number | null;
  receivedAt: string | null;
  status: C2bSuggestionStatus;
  invoice: {
    id: string | null;
    number: string | null;
    publicReference: string | null;
    status: string | null;
    currency: string | null;
    total: number | null;
    balanceDue: number | null;
  } | null;
  matchedOn: 'number' | 'publicReference' | null;
  reasons: string[];
}

/** Read either the stored parsed payload or a raw callback body defensively. */
function readConfirmation(payload: unknown): {
  transId: string;
  billRefNumber: string;
  amount: number | null;
} {
  const p = objectOf(payload);
  const transId = String(p.transId ?? p.TransID ?? '').trim();
  const billRefNumber = String(p.matchValue ?? p.billRefNumber ?? p.BillRefNumber ?? '').trim();
  const raw = p.amount ?? p.Amount;
  const amount = raw === undefined || raw === null || raw === '' ? null : Number(raw);
  return {
    transId,
    billRefNumber,
    amount: amount !== null && Number.isFinite(amount) ? amount : null,
  };
}

function numOrNull(value: unknown): number | null {
  const n = Number(value);
  return value === undefined || value === null || value === '' || !Number.isFinite(n) ? null : n;
}

function strOrNull(value: unknown): string | null {
  const s = String(value ?? '').trim();
  return s || null;
}

/**
 * Suggest candidate invoices for each parsed C2B confirmation.
 *
 * A confirmation with no BillRefNumber is still returned as UNMATCHED so a
 * reviewer can see it; it is never silently dropped. Multiple invoices sharing
 * a reference each get their own suggestion (the reference is not unique in
 * free-form C2B data), so ambiguity is surfaced rather than resolved for them.
 */
export function matchC2bConfirmations(
  events: readonly C2bEventInput[],
  invoices: readonly InvoiceInput[],
): C2bSuggestion[] {
  const byNumber = new Map<string, InvoiceInput[]>();
  const byPublic = new Map<string, InvoiceInput[]>();
  const index = (map: Map<string, InvoiceInput[]>, key: string, row: InvoiceInput) => {
    if (!key) return;
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  };
  for (const inv of invoices) {
    index(byNumber, normRef(inv.number), inv);
    index(byPublic, normRef(inv.publicReference), inv);
  }

  const suggestions: C2bSuggestion[] = [];
  for (const event of events) {
    const parsed = readConfirmation(event.payload);
    const ref = normRef(parsed.billRefNumber);
    const numberMatches = ref ? byNumber.get(ref) ?? [] : [];
    const publicMatches = ref ? byPublic.get(ref) ?? [] : [];
    // Avoid double-listing an invoice whose number and publicReference collide.
    const candidates: { row: InvoiceInput; matchedOn: 'number' | 'publicReference' }[] = [];
    const seen = new Set<unknown>();
    for (const row of numberMatches) {
      candidates.push({ row, matchedOn: 'number' });
      if (row.id !== undefined) seen.add(row.id);
    }
    for (const row of publicMatches) {
      if (row.id !== undefined && seen.has(row.id)) continue;
      candidates.push({ row, matchedOn: 'publicReference' });
      if (row.id !== undefined) seen.add(row.id);
    }

    const base: C2bSuggestion = {
      eventId: strOrNull(event.id),
      externalEventId: strOrNull(event.externalEventId),
      transId: parsed.transId,
      billRefNumber: parsed.billRefNumber,
      amount: parsed.amount,
      receivedAt: strOrNull(event.createdAt),
      status: 'UNMATCHED',
      invoice: null,
      matchedOn: null,
      reasons: [],
    };

    if (!ref) {
      base.reasons.push('Confirmation has no BillRefNumber/matchValue to compare.');
      suggestions.push(base);
      continue;
    }
    if (!candidates.length) {
      base.reasons.push('No invoice number or publicReference matches the BillRefNumber.');
      suggestions.push(base);
      continue;
    }

    for (const { row, matchedOn } of candidates) {
      const reasons: string[] = [];
      const expected = numOrNull(row.total) ?? numOrNull(row.balanceDue);
      let status: C2bSuggestionStatus = 'MATCHED';
      if (parsed.amount === null) {
        reasons.push('Confirmation carried no amount; cross-check not possible.');
      } else if (expected === null) {
        reasons.push('Invoice has no numeric total/balanceDue; cross-check not possible.');
      } else if (Math.abs(expected - parsed.amount) > 0.01) {
        status = 'AMOUNT_MISMATCH';
        reasons.push('Confirmation amount differs from the invoice total/balanceDue.');
      }
      reasons.push(`Matched by ${matchedOn}. Review manually before any settlement.`);

      suggestions.push({
        ...base,
        status,
        matchedOn,
        reasons,
        invoice: {
          id: strOrNull(row.id),
          number: strOrNull(row.number),
          publicReference: strOrNull(row.publicReference),
          status: strOrNull(row.status),
          currency: strOrNull(row.currency),
          total: numOrNull(row.total),
          balanceDue: numOrNull(row.balanceDue),
        },
      });
    }
  }
  return suggestions;
}
