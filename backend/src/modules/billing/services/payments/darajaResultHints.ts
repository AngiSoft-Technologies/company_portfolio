/**
 * Pure, side-effect-free Daraja result/HTTP code hints.
 *
 * These strings are derived only from the codes the vendored community guide
 * (`docs/daraja-guide/guides/common-errors.md`) actually documents. They are
 * operator diagnostics, never instructions to auto-retry, settle or move
 * money, and unknown codes deliberately get no hint rather than an invented
 * explanation.
 *
 * Kept free of runtimeConfig/db imports so read-only diagnostics can consume
 * them without requiring a database connection.
 */

const RESULT_HINTS: Record<string, string> = {
  '1': 'Insufficient funds or generic rejection — check payer balance and initiator permissions.',
  '1001': 'System lock or another active transaction on the MSISDN; operator review only.',
  '1032': 'Customer cancelled the prompt; require a new user action before retrying.',
  '1037': 'Timeout — payer out of coverage or too slow entering PIN; do not auto-retry settlement.',
  '2001': 'Invalid M-Pesa PIN entered by the customer; require a new user action.',
  '400.002.02': 'Invalid callback URL — use a public HTTPS URL.',
  '400.002.05': 'Invalid shortcode — check BusinessShortCode and PartyB against the credentials.',
  '403.002.01': 'Forbidden — access token is missing, invalid or expired.',
};

/** Documented result codes, shared by the payout adapter and read-only reference. */
export const DARAJA_DOCUMENTED_RESULT_CODES: readonly { code: string; hint: string }[] =
  Object.entries(RESULT_HINTS).map(([code, hint]) => ({ code, hint }));

/** Documented HTTP-level hints; no upstream response body is ever echoed. */
export const DARAJA_DOCUMENTED_HTTP_HINTS: readonly { status: number; hint: string }[] = [
  { status: 401, hint: 'OAuth token missing or invalid — check consumer credentials and Basic auth.' },
  { status: 400, hint: 'Bad request — check mandatory fields and numeric amount types (integers, not strings).' },
];

export function darajaResultHint(code: unknown): string | null {
  return RESULT_HINTS[String(code ?? '').trim()] ?? null;
}

export function darajaHttpHint(status: unknown): string | null {
  return DARAJA_DOCUMENTED_HTTP_HINTS.find((entry) => entry.status === status)?.hint ?? null;
}
