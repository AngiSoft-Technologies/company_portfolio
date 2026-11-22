/**
 * READ-ONLY Daraja result-code reference for finance reviewers.
 *
 * The operator hints live in exactly one place — `darajaPayouts.ts`, derived
 * from the vendored community guide's documented codes. This module surfaces
 * them for diagnostics and annotates failed M-Pesa/Daraja provider events so a
 * reviewer sees "customer cancelled" instead of a bare `1032`.
 *
 * Hard rules:
 *  - Advisory only. Never auto-retry, move money, settle or reject anything.
 *  - No credentials, tokenised URLs or raw callback bodies are read or echoed.
 *  - Unknown codes get no hint rather than an invented explanation.
 *  - The community pack is not authoritative Safaricom documentation; the UI
 *    carries that disclaimer alongside every hint.
 */

import {
  DARAJA_DOCUMENTED_HTTP_HINTS,
  DARAJA_DOCUMENTED_RESULT_CODES,
  darajaResultHint,
} from '../../billing/services/payments/darajaResultHints';

export const DARAJA_REFERENCE_PROVENANCE =
  'Derived from the vendored community Daraja guide (docs/daraja-guide). Non-authoritative — confirm against official Safaricom documentation before acting.';

export interface DarajaResultReference {
  code: string;
  hint: string;
}

export interface DarajaHttpHintReference {
  status: number;
  hint: string;
}

/** Static, fully read-only reference payload for the admin UI. */
export function listDarajaResultReference(): {
  provenance: string;
  resultCodes: readonly DarajaResultReference[];
  httpHints: readonly DarajaHttpHintReference[];
  advisoryOnly: true;
} {
  return {
    provenance: DARAJA_REFERENCE_PROVENANCE,
    resultCodes: DARAJA_DOCUMENTED_RESULT_CODES,
    httpHints: DARAJA_DOCUMENTED_HTTP_HINTS,
    advisoryOnly: true,
  };
}

type Row = Record<string, any>;

function objectOf(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Row
    : {};
}

/**
 * Pull a result/response code out of the callback shapes the finance processor
 * actually records: STK (`Body.stkCallback.ResultCode`), Daraja result
 * (`Result.ResultCode`), and already-normalised/flat rows. Returns null when no
 * code is present — never guesses one.
 */
export function resultCodeFromPayload(payload: unknown): string | null {
  const root = objectOf(payload);
  const stk = objectOf(root.Body).stkCallback;
  const result = objectOf(root.Result);
  const candidates = [
    objectOf(stk).ResultCode,
    result.ResultCode,
    root.ResultCode,
    root.resultCode,
    root.ResponseCode,
    root.responseCode,
  ];
  for (const value of candidates) {
    if (value === undefined || value === null || value === '') continue;
    const code = String(value).trim();
    if (code) return code;
  }
  return null;
}

/** Safe, whitelisted ProviderEvent fields for the finance overview table. */
export interface SafeProviderEventRow {
  id: unknown;
  externalEventId: unknown;
  eventType: unknown;
  provider: unknown;
  status: unknown;
  createdAt: unknown;
  processedAt: unknown;
  operatorHint?: string;
}

/**
 * Build an admin-display row from a finance ProviderEvent.
 *
 * Only the scalar fields the overview table renders are copied. Raw
 * `payload`, `headers`, `error` and similar columns are deliberately dropped:
 * Daraja callbacks can carry tokenised callback URLs and payer PII, and the
 * webhook inbox is the one place allowed to show deeply-redacted payloads.
 * A read-only advisory hint is added for documented M-Pesa result codes.
 * Source rows are never mutated.
 */
export function annotateDarajaEvents(events: readonly Row[]): SafeProviderEventRow[] {
  return events.map((event) => {
    const row: SafeProviderEventRow = {
      id: event.id,
      externalEventId: event.externalEventId,
      eventType: event.eventType,
      provider: event.provider,
      status: event.status,
      createdAt: event.createdAt,
      processedAt: event.processedAt,
    };
    if (String(event.provider ?? '').toUpperCase() !== 'MPESA') return row;
    const code = resultCodeFromPayload(event.payload);
    if (!code || code === '0') return row;
    const hint = darajaResultHint(code);
    if (hint) row.operatorHint = hint;
    return row;
  });
}
