import { getConfig } from '../../../../shared/services/runtimeConfig';
/**
 * Safaricom Daraja API — OUTBOUND money movement.
 *
 * Inbound (customer paying us) lives in `mpesaService.ts` (STK Push). This
 * adapter covers the four initiator-authenticated endpoints that move or
 * inspect money: B2C payouts, B2B transfers, transaction status queries and
 * reversals. Like the other payment adapters in this folder it is plain
 * `fetch` + environment configuration — no upstream SDK, no new dependency.
 *
 * Security contracts:
 *  - Credentials come from the environment only and are never logged.
 *  - The initiator password is RSA-encrypted with the Safaricom public key
 *    (`SecurityCredential`, PKCS#1 v1.5, base64). Missing/invalid key fails
 *    closed; a plaintext password is never sent to Daraja.
 *  - Sandbox and live credentials share names but never share base URLs; the
 *    OAuth token cache is keyed by environment and consumer identity.
 *  - Callbacks are not cryptographically signed by Daraja. Callers must match
 *    `OriginatorConversationID` / `ConversationID` to a payout they initiated
 *    before acting on `decodeCallback` output.
 *
 * Docs: https://developer.safaricom.co.ke
 */

import crypto from 'crypto';

export type DarajaEnvironment = 'sandbox' | 'live';

const API_BASE: Record<DarajaEnvironment, string> = {
  sandbox: 'https://sandbox.safaricom.co.ke',
  live: 'https://api.safaricom.co.ke',
};

export type B2CCommandId = 'BusinessPayment' | 'SalaryPayment' | 'PromotionPayment';
export type B2BCommandId = 'BusinessToBusinessTransfer' | 'MerchantToMerchantTransfer'
  | 'BusinessPayBill' | 'BusinessBuyGoods' | 'DisburseFundsToBusiness';

export const B2C_COMMAND_IDS: readonly B2CCommandId[] = [
  'BusinessPayment',
  'SalaryPayment',
  'PromotionPayment',
];

export const B2B_COMMAND_IDS: readonly B2BCommandId[] = [
  'BusinessToBusinessTransfer',
  'MerchantToMerchantTransfer',
  'BusinessPayBill',
  'BusinessBuyGoods',
  'DisburseFundsToBusiness',
];

/** Typed failure for transport, configuration and Daraja-level rejections. */
export class DarajaError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
    public readonly details?: unknown,
    /** Operator hint from the local (community) guide; never contains secrets. */
    public readonly hint?: string,
  ) {
    super(message);
    this.name = 'DarajaError';
  }
}

/**
 * Operator hints for the few result codes the local pack actually documents
 * (`guides/common-errors.md`). The pack is community-maintained, so these are
 * diagnostics only — never a reason to auto-retry or move money. Unknown codes
 * deliberately get no hint rather than an invented explanation.
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

/** Shared-secret callback registration: the gate lives in the route layer. */
function tokenizedUrl(override: unknown, envName: string): string {
  const url = resolveUrl(override, envName);
  const token = env('MPESA_CALLBACK_TOKEN');
  if (!token) throw new DarajaError('MPESA_CALLBACK_TOKEN is not configured', 503);
  const parsed = new URL(url);
  parsed.searchParams.set('token', token);
  return parsed.toString();
}

export function darajaResultHint(code: unknown): string | null {
  return RESULT_HINTS[String(code ?? '').trim()] ?? null;
}

/** HTTP-level hints from `guides/common-errors.md`; no upstream body is echoed. */
export function darajaHttpHint(status: unknown): string | null {
  if (status === 401) return 'OAuth token missing or invalid — check consumer credentials and Basic auth.';
  if (status === 400) return 'Bad request — check mandatory fields and numeric amount types (integers, not strings).';
  return null;
}

function env(name: string): string {
  return getConfig(name).trim();
}

/** `production` is accepted as an alias for `live` (see mpesaService.ts). */
export function environment(): DarajaEnvironment {
  const raw = env('MPESA_ENV').toLowerCase();
  return raw === 'live' || raw === 'production' ? 'live' : 'sandbox';
}

/**
 * True when every credential needed for outbound calls is present. Callback
 * URLs are validated per call because they can be overridden by the caller.
 */
export function isConfigured(): boolean {
  return Boolean(
    env('MPESA_CONSUMER_KEY')
    && env('MPESA_CONSUMER_SECRET')
    && env('MPESA_SHORTCODE')
    && env('MPESA_INITIATOR_NAME')
    && env('MPESA_INITIATOR_PASSWORD')
    && env('MPESA_INITIATOR_PUBLIC_KEY'),
  );
}

// ─── OAuth token (cached, single-flight) ─────────────────────────────────────

let tokenCache: {
  env: DarajaEnvironment;
  identity: string;
  token: string;
  expiresAt: number;
} | null = null;
let tokenInFlight: Promise<string> | null = null;

export function resetTokenCacheForTests(): void {
  tokenCache = null;
  tokenInFlight = null;
}

export async function getAccessToken(): Promise<string> {
  const current = environment();
  const key = env('MPESA_CONSUMER_KEY');
  const secret = env('MPESA_CONSUMER_SECRET');
  // Identity is kept in memory only so a credential rotation cannot reuse an
  // old token; it is never included in an error message or log.
  const identity = `${key}:${secret}`;

  // The guide (`docs/getting-started/auth.md`) recommends refreshing within
  // five minutes of the one-hour expiry. Match the STK cache's 300s skew so a
  // token is never presented to Daraja in its final, race-prone minute.
  if (tokenCache && tokenCache.env === current && tokenCache.identity === identity
      && tokenCache.expiresAt > Date.now() + 300_000) {
    return tokenCache.token;
  }
  if (tokenInFlight) return tokenInFlight;

  tokenInFlight = (async () => {
    if (!key || !secret) {
      throw new DarajaError('M-Pesa Daraja is not configured (MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET)', 503);
    }
    const res = await fetch(`${API_BASE[current]}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(identity).toString('base64')}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new DarajaError(
        `M-Pesa OAuth failed (${res.status})`,
        res.status,
        undefined,
        darajaHttpHint(res.status) ?? undefined,
      );
    }
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = null; }
    if (!body?.access_token) throw new DarajaError('M-Pesa OAuth returned no access token', 502);

    const token = String(body.access_token);
    const lifetime = Math.max(60, Number(body.expires_in) || 3600);
    tokenCache = { env: current, identity, token, expiresAt: Date.now() + lifetime * 1000 };
    return token;
  })();

  try {
    return await tokenInFlight;
  } finally {
    tokenInFlight = null;
  }
}

// ─── Validation helpers ──────────────────────────────────────────────────────

/** `07xxxxxxxx` / `+2547xxxxxxxx` / `7xxxxxxxx` → `2547xxxxxxxx`. */
function normalizeMsisdn(value: unknown): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) throw new DarajaError('A recipient MSISDN is required', 400);
  let normalized = digits;
  if (digits.startsWith('254')) normalized = digits;
  else if (digits.startsWith('0')) normalized = `254${digits.slice(1)}`;
  else if (digits.startsWith('7')) normalized = `254${digits}`;
  if (!/^254[1-9]\d{8}$/.test(normalized)) {
    throw new DarajaError('Invalid recipient MSISDN (expected 07xxxxxxxx or 2547xxxxxxxx)', 400);
  }
  return normalized;
}

function shortcode(value: unknown, label: string): string {
  const code = String(value ?? '').trim();
  if (!/^\d+$/.test(code)) {
    throw new DarajaError(`${label} must be a non-empty numeric shortcode`, 400);
  }
  return code;
}

function positiveAmount(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new DarajaError('A positive payment amount is required', 400);
  }
  return Math.round(amount * 100) / 100;
}

function requiredId(value: unknown, label: string): string {
  const id = String(value ?? '').trim();
  if (!id) throw new DarajaError(`${label} is required`, 400);
  return id;
}

/**
 * Callback URLs are validated per call because callers may override them.
 * `docs/getting-started/intro.md` and `guides/sandbox-vs-production.md` require
 * HTTPS (and IP allowlisting) in production, so plain HTTP fails closed there.
 */
function resolveUrl(override: unknown, envName: string): string {
  const url = String(override ?? env(envName)).trim();
  if (!url) throw new DarajaError(`${envName} is not configured`, 503);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new DarajaError(`${envName} must be an absolute http(s) URL`, 500);
  }
  if (parsed.protocol === 'http:' && environment() === 'live') {
    throw new DarajaError(`${envName} must use HTTPS in production`, 500);
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new DarajaError(`${envName} must be an absolute http(s) URL`, 500);
  }
  return url;
}

function resolveCommandId<T extends string>(value: unknown, allowed: readonly T[], fallback: T, label: string): T {
  if (value === undefined || value === null || value === '') return fallback;
  const candidate = String(value);
  if (!allowed.includes(candidate as T)) {
    throw new DarajaError(`Invalid ${label} CommandID: ${candidate}`, 400);
  }
  return candidate as T;
}

/** Precise fail-closed gate so operators see which variable is missing. */
function assertConfigured(): void {
  if (!env('MPESA_CONSUMER_KEY') || !env('MPESA_CONSUMER_SECRET')) {
    throw new DarajaError('M-Pesa Daraja is not configured (MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET)', 503);
  }
  if (!env('MPESA_SHORTCODE')) throw new DarajaError('MPESA_SHORTCODE is not configured', 503);
  if (!env('MPESA_INITIATOR_NAME')) throw new DarajaError('MPESA_INITIATOR_NAME is not configured', 503);
  if (!env('MPESA_INITIATOR_PASSWORD')) throw new DarajaError('MPESA_INITIATOR_PASSWORD is not configured', 503);
  if (!env('MPESA_INITIATOR_PUBLIC_KEY')) throw new DarajaError('MPESA_INITIATOR_PUBLIC_KEY is not configured', 503);
}

function originatorId(override?: string): string {
  return String(override ?? '').trim() || crypto.randomUUID();
}

function initiator(): { name: string; credential: string } {
  const name = env('MPESA_INITIATOR_NAME');
  if (!name) throw new DarajaError('MPESA_INITIATOR_NAME is not configured', 503);
  return { name, credential: securityCredential() };
}

/** RSA PKCS#1 v1.5 encryption of the initiator password, base64 encoded. */
function securityCredential(): string {
  const password = env('MPESA_INITIATOR_PASSWORD');
  if (!password) throw new DarajaError('MPESA_INITIATOR_PASSWORD is not configured', 503);

  const configured = env('MPESA_INITIATOR_PUBLIC_KEY');
  if (!configured) throw new DarajaError('MPESA_INITIATOR_PUBLIC_KEY is not configured', 503);

  let pem = configured;
  if (!pem.includes('-----BEGIN')) {
    try { pem = Buffer.from(configured, 'base64').toString('utf8'); } catch { /* validated below */ }
  }
  if (!/-----BEGIN (?:RSA )?PUBLIC KEY-----/.test(pem) || !pem.includes('-----END')) {
    throw new DarajaError(
      'MPESA_INITIATOR_PUBLIC_KEY is invalid (expected a PEM or base64-encoded PEM public key)',
      500,
    );
  }

  try {
    return crypto.publicEncrypt(
      { key: pem, padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(password, 'utf8'),
    ).toString('base64');
  } catch (err) {
    // Only the crypto error text is surfaced — never the key or the password.
    throw new DarajaError(`Unable to build M-Pesa SecurityCredential: ${(err as Error)?.message}`, 500);
  }
}

// ─── Request/response plumbing ───────────────────────────────────────────────

export interface DarajaResponse {
  responseCode: string;
  responseDescription: string;
  conversationId: string;
  originatorConversationId: string;
  raw: any;
}

export async function darajaPost(path: string, payload: unknown): Promise<DarajaResponse> {
  return post(path, payload);
}

async function post(path: string, payload: unknown): Promise<DarajaResponse> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE[environment()]}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25_000),
  });

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }

  if (!res.ok) {
    throw new DarajaError(`M-Pesa ${path} failed (${res.status})`, res.status, data, darajaHttpHint(res.status) ?? undefined);
  }
  if (!data || String(data.ResponseCode) !== '0') {
    throw new DarajaError(
      String(data?.ResponseDescription || `M-Pesa ${path} was rejected`),
      String(data?.ResponseCode ?? '') === '0' ? 502 : 400,
      data,
      darajaResultHint(data?.ResponseCode ?? data?.ResultCode) ?? undefined,
    );
  }
  return {
    responseCode: String(data.ResponseCode),
    responseDescription: String(data.ResponseDescription ?? ''),
    conversationId: String(data.ConversationID ?? ''),
    originatorConversationId: String(data.OriginatorConversationID ?? ''),
    raw: data,
  };
}

// ─── B2C: pay a customer / staff MSISDN ──────────────────────────────────────

export interface B2CPaymentInput {
  /** Canonical recipient field; `msisdn`, `recipient` and `partyB` are aliases. */
  phone?: string;
  msisdn?: string;
  recipient?: string;
  partyB?: string;
  /** Major units (KES). */
  amount: number;
  commandId?: B2CCommandId;
  remarks?: string;
  occasion?: string;
  /** Sender shortcode override; defaults to MPESA_SHORTCODE. */
  partyA?: string;
  queueTimeoutUrl?: string;
  resultUrl?: string;
  /** Supply on retries to keep the payout idempotent at Daraja. */
  originatorConversationId?: string;
}

export async function b2cPayment(input: B2CPaymentInput): Promise<DarajaResponse> {
  assertConfigured();
  const auth = initiator();
  const partyB = normalizeMsisdn(input.phone ?? input.msisdn ?? input.recipient ?? input.partyB);
  const amount = positiveAmount(input.amount);
  const command = resolveCommandId(input.commandId, B2C_COMMAND_IDS, 'BusinessPayment', 'B2C');

  return post('/mpesa/b2c/v3/paymentrequest', {
    OriginatorConversationID: originatorId(input.originatorConversationId),
    InitiatorName: auth.name,
    SecurityCredential: auth.credential,
    CommandID: command,
    Amount: amount,
    PartyA: shortcode(input.partyA ?? env('MPESA_SHORTCODE'), 'MPESA_SHORTCODE'),
    PartyB: partyB,
    Remarks: String(input.remarks || 'AngiSoft payout').slice(0, 100),
    QueueTimeOutURL: resolveUrl(input.queueTimeoutUrl, 'MPESA_B2C_TIMEOUT_URL'),
    ResultURL: resolveUrl(input.resultUrl, 'MPESA_B2C_RESULT_URL'),
    ...(input.occasion ? { Occasion: String(input.occasion).slice(0, 100) } : {}),
  });
}

// ─── B2B: pay another business shortcode ─────────────────────────────────────

export interface B2BPaymentInput {
  /** Canonical recipient field; `recipientShortcode` and `recipient` are aliases. */
  partyB?: string;
  recipientShortcode?: string;
  recipient?: string;
  amount: number;
  commandId?: B2BCommandId;
  senderIdentifierType?: string;
  recipientIdentifierType?: string;
  accountReference?: string;
  remarks?: string;
  /** Sender shortcode override; defaults to MPESA_SHORTCODE. */
  partyA?: string;
  queueTimeoutUrl?: string;
  resultUrl?: string;
  originatorConversationId?: string;
}

export async function b2bPayment(input: B2BPaymentInput): Promise<DarajaResponse> {
  assertConfigured();
  const auth = initiator();
  const amount = positiveAmount(input.amount);
  const command = resolveCommandId(input.commandId, B2B_COMMAND_IDS, 'BusinessToBusinessTransfer', 'B2B');

  // Kept on the Safaricom-compatible v3 path already used by this production
  // adapter. The community resource pack's `/mpesa/b2b/v1/paymentrequest` is a
  // documented conflict, recorded in DARAJA_RESOURCE_UTILIZATION_PLAN.md.
  return post('/mpesa/b2b/v3/paymentrequest', {
    OriginatorConversationID: originatorId(input.originatorConversationId),
    InitiatorName: auth.name,
    SecurityCredential: auth.credential,
    CommandID: command,
    SenderIdentifierType: String(input.senderIdentifierType || '4'),
    // Daraja's field name is misspelled; keep it verbatim for the upstream API.
    RecieverIdentifierType: String(input.recipientIdentifierType || '4'),
    Amount: amount,
    PartyA: shortcode(input.partyA ?? env('MPESA_SHORTCODE'), 'MPESA_SHORTCODE'),
    PartyB: shortcode(input.partyB ?? input.recipientShortcode ?? input.recipient, 'Recipient shortcode'),
    AccountReference: String(input.accountReference || 'ANGISOFT').slice(0, 32),
    Remarks: String(input.remarks || 'AngiSoft transfer').slice(0, 100),
    QueueTimeOutURL: resolveUrl(input.queueTimeoutUrl, 'MPESA_B2B_TIMEOUT_URL'),
    ResultURL: resolveUrl(input.resultUrl, 'MPESA_B2B_RESULT_URL'),
  });
}

// ─── Transaction status query ────────────────────────────────────────────────

export interface TransactionStatusInput {
  /** `transactionID` is accepted as an alias. */
  transactionId?: string;
  transactionID?: string;
  /** Shortcode whose transaction is being queried; defaults to MPESA_SHORTCODE. */
  partyA?: string;
  /** 1 = MSISDN, 2 = till, 4 = shortcode. */
  identifierType?: string;
  remarks?: string;
  occasion?: string;
  queueTimeoutUrl?: string;
  resultUrl?: string;
  originatorConversationId?: string;
}

export async function queryTransactionStatus(input: TransactionStatusInput): Promise<DarajaResponse> {
  assertConfigured();
  const auth = initiator();
  const transactionId = requiredId(input.transactionId ?? input.transactionID, 'TransactionID');
  const queueUrl = resolveUrl(input.queueTimeoutUrl, 'MPESA_STATUS_QUEUE_URL');
  // Daraja requires two distinct callbacks: the timeout goes to the queue URL
  // and the final result to the result URL. They must never be conflated.

  return post('/mpesa/transactionstatus/v1/query', {
    OriginatorConversationID: originatorId(input.originatorConversationId),
    Initiator: auth.name,
    SecurityCredential: auth.credential,
    CommandID: 'TransactionStatusQuery',
    TransactionID: transactionId,
    PartyA: shortcode(input.partyA ?? env('MPESA_SHORTCODE'), 'MPESA_SHORTCODE'),
    IdentifierType: String(input.identifierType || '4'),
    QueueTimeOutURL: queueUrl,
    ResultURL: resolveUrl(input.resultUrl, 'MPESA_STATUS_RESULT_URL'),
    Remarks: String(input.remarks || 'AngiSoft status query').slice(0, 100),
    ...(input.occasion ? { Occasion: String(input.occasion).slice(0, 100) } : {}),
  });
}

// ─── Reversal ────────────────────────────────────────────────────────────────

export interface ReverseTransactionInput {
  /** `transactionID` is accepted as an alias. */
  transactionId?: string;
  transactionID?: string;
  amount: number;
  receiverParty?: string;
  partyB?: string;
  /** 11 = shortcode (Daraja reversal identifier type); overridable. */
  receiverIdentifierType?: string;
  remarks?: string;
  occasion?: string;
  queueTimeoutUrl?: string;
  resultUrl?: string;
  originatorConversationId?: string;
}

export async function reverseTransaction(input: ReverseTransactionInput): Promise<DarajaResponse> {
  assertConfigured();
  const auth = initiator();
  const transactionId = requiredId(input.transactionId ?? input.transactionID, 'TransactionID');
  const amount = positiveAmount(input.amount);

  return post('/mpesa/reversal/v1/request', {
    OriginatorConversationID: originatorId(input.originatorConversationId),
    Initiator: auth.name,
    SecurityCredential: auth.credential,
    CommandID: 'TransactionReversal',
    TransactionID: transactionId,
    Amount: amount,
    ReceiverParty: shortcode(input.receiverParty ?? input.partyB ?? env('MPESA_SHORTCODE'), 'ReceiverParty'),
    // Daraja's field name is misspelled; keep it verbatim for the upstream API.
    RecieverIdentifierType: String(input.receiverIdentifierType || '11'),
    QueueTimeOutURL: resolveUrl(input.queueTimeoutUrl, 'MPESA_REVERSAL_QUEUE_URL'),
    ResultURL: resolveUrl(input.resultUrl, 'MPESA_REVERSAL_RESULT_URL'),
    Remarks: String(input.remarks || 'AngiSoft reversal').slice(0, 100),
    ...(input.occasion ? { Occasion: String(input.occasion).slice(0, 100) } : {}),
  });
}

// ─── Async result callbacks ──────────────────────────────────────────────────

export interface DarajaCallback {
  resultCode: string;
  resultDesc: string;
  transactionId: string;
  conversationId: string;
  originatorConversationId: string;
  amount?: number;
  partyB: string;
  resultType?: number | string;
  transactionStatus?: string;
  accountBalance?: string;
  phone?: string;
  transactionDate?: string;
  receiverPartyPublicName?: string;
  raw: any;
}

/**
 * Flatten Daraja's `Result` envelope (B2C/B2B/status/reversal all use it).
 * Handles both `{ Key, Value }` and `{ Name, Value }` parameter styles and a
 * JSON-string `Result` body. Returns null when no Result envelope is present.
 */
/** Shared request helpers for the extended Daraja adapter. */
export const darajaInitiator = initiator;
export const darajaShortcode = shortcode;
export const darajaResolveUrl = resolveUrl;
export const darajaPositiveAmount = positiveAmount;
export const darajaRequiredId = requiredId;
export const darajaOriginatorId = originatorId;
export const darajaAssertConfigured = assertConfigured;

export function decodeCallback(body: any): DarajaCallback | null {
  let result = body?.Result;
  if (typeof result === 'string') {
    try { result = JSON.parse(result); } catch { return null; }
  }
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null;

  const params = result.ResultParameters?.ResultParameter ?? result.ResultParameter ?? [];
  const list: any[] = Array.isArray(params) ? params : params ? [params] : [];
  const find = (...names: string[]): any => {
    for (const name of names) {
      const found = list.find((p) => String(p?.Key ?? p?.Name ?? '') === name);
      if (found && found.Value !== undefined && found.Value !== null) return found.Value;
    }
    return undefined;
  };

  // Keep the historical STK/shortcode aliases first; the canonical B2C result
  // parameter names are appended so amount/reference/date cross-checks work for
  // both payload shapes without changing existing callback handling.
  const amountRaw = find('Amount', 'TransAmount', 'TransactionAmount');
  const amount = Number(amountRaw);
  return {
    resultCode: String(result.ResultCode ?? ''),
    resultDesc: String(result.ResultDesc ?? ''),
    transactionId: String(
      result.TransactionID ?? find('TransactionID', 'MpesaReceiptNumber', 'TransactionReceipt', 'ReceiptNo') ?? '',
    ),
    conversationId: String(result.ConversationID ?? ''),
    originatorConversationId: String(result.OriginatorConversationID ?? ''),
    amount: amountRaw === undefined || !Number.isFinite(amount) ? undefined : amount,
    partyB: String(find('PartyB', 'ReceiverParty', 'ReceiverPartyPublicName') ?? ''),
    resultType: result.ResultType as number | string | undefined,
    transactionStatus: find('TransactionStatus', 'Status') as string | undefined,
    accountBalance: find('AccountBalance') as string | undefined,
    phone: find('PhoneNumber', 'PartyB', 'ReceiverPartyPublicName') as string | undefined,
    transactionDate: find('TransactionDate', 'TransTime', 'TransactionCompletedDateTime') as string | undefined,
    receiverPartyPublicName: find('ReceiverPartyPublicName') as string | undefined,
    raw: result,
  };
}

// ─── Extended Daraja product adapters (local Daraja guide) ──────────────────

/** Parse `AccountType|Currency|total|available|reserved|uncleared`. */
export function parseAccountBalance(value: unknown) {
  const parts = String(value ?? '').split('|').map((part) => part.trim());
  if (parts.length < 2 || !parts[0] || !parts[1]) return null;
  const numeric = (part?: string): number | undefined => {
    if (!part) return undefined;
    const parsed = Number(part);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  return {
    accountType: parts[0],
    currency: parts[1],
    total: numeric(parts[2]),
    available: numeric(parts[3]),
    reserved: numeric(parts[4]),
    uncleared: numeric(parts[5]),
  };
}

/** Bearer-only helper for endpoints that do not need an initiator credential. */
async function postPublic(path: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE[environment()]}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try { body = text ? JSON.parse(text) as Record<string, unknown> : {}; } catch { body = {}; }
  // Upstream errors are deliberately not attached to the exception: raw bodies
  // can echo tokens or customer data. Only status and a fixed message escape.
  if (!res.ok) {
    throw new DarajaError(`Daraja ${path} failed (${res.status})`, res.status, undefined, darajaHttpHint(res.status) ?? undefined);
  }
  const code = body.ResponseCode ?? body.responseCode;
  if (code === undefined || code === null) {
    throw new DarajaError(`Daraja ${path} returned no response code`, 502);
  }
  // Daraja sometimes rejects with HTTP 200 and a non-zero ResponseCode. Fail
  // closed instead of treating that "success" as a completed operation.
  if (String(code) !== '0') {
    throw new DarajaError(`Daraja ${path} was rejected`, 400, undefined, darajaResultHint(code) ?? undefined);
  }
  return body;
}

export async function queryAccountBalance(input: {
  partyA?: unknown;
  queueTimeoutUrl?: unknown;
  resultUrl?: unknown;
  remarks?: string;
} = {}) {
  assertConfigured();
  const auth = initiator();
  return post('/mpesa/accountbalance/v1/query', {
    Initiator: auth.name,
    SecurityCredential: auth.credential,
    CommandID: 'AccountBalanceQuery',
    PartyA: shortcode(input.partyA ?? env('MPESA_SHORTCODE'), 'MPESA_SHORTCODE'),
    IdentifierType: '4',
    Remarks: String(input.remarks || 'AngiSoft account balance').slice(0, 100),
    QueueTimeOutURL: resolveUrl(input.queueTimeoutUrl, 'MPESA_BALANCE_QUEUE_URL'),
    ResultURL: resolveUrl(input.resultUrl, 'MPESA_BALANCE_RESULT_URL'),
  });
}

export async function registerC2bUrls(input: {
  shortCode?: unknown;
  validationUrl?: unknown;
  confirmationUrl?: unknown;
  responseType?: string;
} = {}) {
  // Validate every local input before requesting an OAuth token. A missing
  // callback token must not trigger any Safaricom API call.
  const confirmationUrl = tokenizedUrl(input.confirmationUrl, 'MPESA_C2B_CONFIRMATION_URL');
  const validationUrl = tokenizedUrl(input.validationUrl, 'MPESA_C2B_VALIDATION_URL');
  const body = {
    ShortCode: shortcode(input.shortCode ?? (env('MPESA_C2B_SHORTCODE') || env('MPESA_SHORTCODE')), 'MPESA_C2B_SHORTCODE'),
    ResponseType: String(input.responseType || env('MPESA_C2B_RESPONSE_TYPE') || 'Completed'),
    ConfirmationURL: confirmationUrl,
    ValidationURL: validationUrl,
  };
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE[environment()]}/mpesa/c2b/v2/registerurl`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  // Never attach the raw upstream body: it can echo credentials or callback URLs.
  if (!res.ok) {
    throw new DarajaError(
      `Daraja C2B registration failed (${res.status})`,
      res.status,
      undefined,
      darajaHttpHint(res.status) ?? undefined,
    );
  }
  return text;
}

/** Sandbox-only simulate helper; never call this in production. */
export async function simulateC2b(input: {
  amount: unknown;
  msisdn: unknown;
  billRefNumber: string;
  commandId?: string;
}) {
  if (environment() === 'live') throw new DarajaError('C2B simulation is sandbox-only', 403);
  return postPublic('/mpesa/c2b/v1/simulate', {
    CommandID: String(input.commandId || 'CustomerPayBillOnline'),
    Amount: positiveAmount(input.amount),
    Msisdn: normalizeMsisdn(input.msisdn),
    BillRefNumber: requiredId(input.billRefNumber, 'BillRefNumber'),
  });
}

export async function generateMpesaQr(input: {
  reference: string;
  amount: unknown;
  transactionType?: string;
  merchantName?: string;
  cpi?: unknown;
  size?: string | number;
}) {
  const trxCode = String(input.transactionType || env('MPESA_QR_TRANSACTION_TYPE') || 'BG').trim().toUpperCase();
  if (!['BG', 'PB', 'WA', 'SM'].includes(trxCode)) {
    throw new DarajaError('QR TrxCode must be one of BG, PB, WA or SM', 400);
  }
  const payload: Record<string, unknown> = {
    MerchantName: String(input.merchantName || env('MPESA_QR_MERCHANT_NAME') || 'AngiSoft').slice(0, 50),
    RefNo: requiredId(input.reference, 'RefNo').slice(0, 50),
    Amount: positiveAmount(input.amount),
    TrxCode: trxCode,
    CPI: shortcode(input.cpi ?? env('MPESA_SHORTCODE'), 'MPESA_SHORTCODE'),
    Size: String(input.size || '300'),
  };
  if (env('MPESA_QR_CALLBACK_URL')) payload.CallbackURL = resolveUrl(undefined, 'MPESA_QR_CALLBACK_URL');
  return postPublic('/mpesa/qrcode/v1/generate', payload);
}

/** Pochi la Biashara micro-merchant disbursement (capability-gated by caller). */
export async function payToPochi(input: {
  amount: unknown;
  partyB: unknown;
  originatorConversationId?: string;
  remarks?: string;
  queueTimeoutUrl?: unknown;
  resultUrl?: unknown;
}) {
  assertConfigured();
  const auth = initiator();
  // Canonical Safaricom contract: `BusinessPayToPochi`, `InitiatorName` and
  // `Occassion` (Daraja's documented spelling). The community pack's
  // `BusinessPaymentToPochi` / `Initiator` / `Occasion` are reconciled in the
  // resource plan and are deliberately not sent upstream.
  return post('/mpesa/b2pochi/v1/paymentrequest', {
    InitiatorName: auth.name,
    SecurityCredential: auth.credential,
    CommandID: 'BusinessPayToPochi',
    Amount: positiveAmount(input.amount),
    PartyA: shortcode(env('MPESA_SHORTCODE'), 'MPESA_SHORTCODE'),
    PartyB: normalizeMsisdn(input.partyB),
    OriginatorConversationID: originatorId(input.originatorConversationId),
    Remarks: String(input.remarks || 'AngiSoft Pochi transfer').slice(0, 100),
    QueueTimeOutURL: resolveUrl(input.queueTimeoutUrl, 'MPESA_B2C_TIMEOUT_URL'),
    ResultURL: resolveUrl(input.resultUrl, 'MPESA_B2C_RESULT_URL'),
    Occassion: 'VendorPayment',
  });
}

/** Ratiba standing-order subscription (capability-gated by caller). */
export async function createStandingOrder(input: {
  name: string;
  amount: unknown;
  partyB: unknown;
  frequency: string;
  startDate: string;
  endDate?: string;
  queueTimeoutUrl?: unknown;
  resultUrl?: unknown;
}) {
  assertConfigured();
  const auth = initiator();
  // Canonical Safaricom standing-order path. The community pack's
  // `/mpesa/ratiba/v1/subscribe` is retained only as a historical alias in the
  // resource plan; it was never a live Safaricom production endpoint here.
  return post('/standingorder/v1/createStandingOrderExternal', {
    Initiator: auth.name,
    SecurityCredential: auth.credential,
    CommandID: 'CreateSubscription',
    SubscriptionName: requiredId(input.name, 'SubscriptionName').slice(0, 100),
    Frequency: requiredId(input.frequency, 'Frequency'),
    StartDate: requiredId(input.startDate, 'StartDate'),
    ...(input.endDate ? { EndDate: String(input.endDate) } : {}),
    Amount: positiveAmount(input.amount),
    PartyA: shortcode(env('MPESA_SHORTCODE'), 'MPESA_SHORTCODE'),
    PartyB: normalizeMsisdn(input.partyB),
    QueueTimeOutURL: resolveUrl(input.queueTimeoutUrl, 'MPESA_B2C_TIMEOUT_URL'),
    ResultURL: resolveUrl(input.resultUrl, 'MPESA_B2C_RESULT_URL'),
  });
}

/** KRA tax remittance (capability-gated by caller). */
export async function remitTax(input: {
  amount: unknown;
  accountReference: string;
  remarks?: string;
  queueTimeoutUrl?: unknown;
  resultUrl?: unknown;
}) {
  assertConfigured();
  const auth = initiator();
  // Canonical Safaricom remittance path (`/mpesa/b2b/v1/remittax`). The
  // community pack's `/mpesa/tax/v1/remit` is recorded as a conflict in the
  // resource plan rather than used against production.
  return post('/mpesa/b2b/v1/remittax', {
    Initiator: auth.name,
    SecurityCredential: auth.credential,
    CommandID: 'PayTaxToKRA',
    SenderIdentifierType: '4',
    ReceiverIdentifierType: '4',
    Amount: positiveAmount(input.amount),
    PartyA: shortcode(env('MPESA_SHORTCODE'), 'MPESA_SHORTCODE'),
    PartyB: '572572',
    AccountReference: requiredId(input.accountReference, 'AccountReference'),
    Remarks: String(input.remarks || 'KRA settlement').slice(0, 100),
    QueueTimeOutURL: resolveUrl(input.queueTimeoutUrl, 'MPESA_B2C_TIMEOUT_URL'),
    ResultURL: resolveUrl(input.resultUrl, 'MPESA_B2C_RESULT_URL'),
  });
}
