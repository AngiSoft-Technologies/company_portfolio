/**
 * PayHero (https://docs.payhero.co.ke) — M-Pesa STK push + Kenyan bank/Sacco/
 * school paybill automation through a single aggregation API.
 *
 * v2 API: Basic auth (API username + password). `POST /payments` fires an STK
 * push. The callback is NOT signed — authenticity comes from matching
 * `ExternalReference`+`CheckoutRequestID` to a Payment row we minted at
 * initiate time.
 *
 * Beyond inbound STK pushes this module also exposes the full account
 * management surface used by the in-app Payments console: payment channels
 * (register/list), bank paybills, service/payment wallets, wallet top-up,
 * payouts (SasaPay → mobile/bank), account transactions and transaction
 * status. Every call fails closed when the account is not configured.
 */

export const PAYHERO_BASE = 'https://backend.payhero.co.ke/api/v2';

export function isConfigured() {
  // Channel id is resolved at push time (provided channel -> DB default -> env),
  // so only the account credentials gate the provider.
  return Boolean(process.env.PAYHERO_API_USERNAME && process.env.PAYHERO_API_PASSWORD);
}

function authHeader() {
  const user = process.env.PAYHERO_API_USERNAME || '';
  const pass = process.env.PAYHERO_API_PASSWORD || '';
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

class PayHeroError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PayHeroError';
    this.status = status;
  }
}

/** Shared fetch wrapper: PayHero returns {success, ...} with HTTP 200 on errors. */
async function request(path: string, opts: { method?: string; body?: any } = {}): Promise<any> {
  if (!isConfigured()) throw new PayHeroError('PayHero not configured', 503);
  const res = await fetch(`${PAYHERO_BASE}${path}`, {
    method: opts.method || 'GET',
    headers: {
      Authorization: authHeader(),
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    // Bound every call so lock-holding transactions (initiate, payouts) can't
    // hang indefinitely on a stalled upstream.
    signal: AbortSignal.timeout(15_000),
  });
  const json = await res.json().catch(() => ({})) as any;
  if (!res.ok || json?.success === false) {
    throw new PayHeroError(
      json?.error_message || json?.message || `PayHero request failed (${res.status})`,
      res.status
    );
  }
  return json;
}

// ─── Inbound: STK push + callback ───────────────────────────────────────────

export async function initStkPush(opts: {
  phone: string; // '0787…' or '2547…', passed through as-is
  amount: number; // major units (KES)
  reference: string;
  channelId?: number; // in-app channel takes precedence over PAYHERO_CHANNEL_ID
  description?: string;
}) {
  if (!isConfigured()) throw new PayHeroError('PayHero not configured', 503);
  const channelId = opts.channelId ?? Number(process.env.PAYHERO_CHANNEL_ID || 0);
  if (!channelId) throw new PayHeroError('No PayHero channel configured for this push', 400);

  const json = await request('/payments', {
    method: 'POST',
    body: {
      amount: Math.round(opts.amount),
      phone_number: opts.phone,
      channel_id: channelId,
      provider: 'm-pesa',
      external_reference: String(opts.reference || '').slice(0, 50),
      customer_name: process.env.PAYHERO_CUSTOMER_NAME || '',
      description: String(opts.description || 'Payment'),
      callback_url: process.env.PAYHERO_CALLBACK_URL || ''
    }
  });

  return {
    checkoutRequestId: json.CheckoutRequestID as string,
    reference: json.reference as string,
    status: json.status as string
  };
}

/**
 * Typed view of the callback PayHero POSTs to our callback_url. Match on
 * `ExternalReference` (ours) and `CheckoutRequestID` (theirs) to authenticate.
 */
export function decodeCallback(body: any) {
  const response = body?.response || body?.data || {};
  return {
    externalReference: String(response.ExternalReference || body?.external_reference || ''),
    checkoutRequestId: String(response.CheckoutRequestID || ''),
    merchantRequestId: String(response.MerchantRequestID || ''),
    resultCode: Number.isFinite(Number(response.ResultCode)) ? Number(response.ResultCode) : -1,
    resultDesc: String(response.ResultDesc || ''),
    success: String(response.Status || '').toLowerCase() === 'success',
    amount: Number(response.Amount) || 0,
    receipt: String(response.MpesaReceiptNumber || ''),
    raw: body
  };
}

// ─── Payment channels (the "accounts" customers pay into) ────────────────────

/** GET /payment_channels — list (optionally active-only) registered channels. */
export async function listChannels(onlyActive = false) {
  const json = await request(`/payment_channels${onlyActive ? '?is_active=true' : ''}`);
  const channels = Array.isArray(json.payment_channels) ? json.payment_channels : [];
  return {
    payment_channels: channels.map(normalizeChannel),
    pagination: json.pagination || null
  };
}

/** GET /bank_paybills — PayHero-hosted bank paybills usable for bank channels. */
export async function getBankPaybills() {
  const json = await request('/bank_paybills');
  return Array.isArray(json.bank_paybills) ? json.bank_paybills : [];
}

/**
 * POST /payment_channels — register a new channel (paybill | till | bank).
 * `short_code` is the business number/till, `account_number` optional
 * customer paybill account. Network-level bank codes come via getBankPaybills.
 */
export async function registerChannel(opts: {
  channelType: 'paybill' | 'till' | 'bank';
  shortCode?: string;
  accountNumber?: string;
  transactionType?: string;
  description?: string;
}) {
  const body: Record<string, any> = {
    channel_type: opts.channelType,
    transaction_type: opts.transactionType || (opts.channelType === 'bank' ? 'CustomerPayBillOnline' : 'CustomerPayBillOnline'),
    description: opts.description || ''
  };
  if (opts.shortCode) body.short_code = opts.shortCode;
  if (opts.accountNumber) body.account_number = opts.accountNumber;
  if (process.env.PAYHERO_ACCOUNT_ID) body.account_id = Number(process.env.PAYHERO_ACCOUNT_ID);

  const json = await request('/payment_channels', { method: 'POST', body });
  return {
    channel: normalizeChannel(json.payment_channel || json.data || json),
    success: json.success !== false
  };
}

function normalizeChannel(raw: any) {
  return {
    id: raw.id,
    channelType: raw.channel_type,
    shortCode: raw.short_code,
    accountNumber: raw.account_number,
    accountId: raw.account_id,
    transactionType: raw.transaction_type,
    description: raw.description,
    isActive: raw.is_active !== false,
    balance: raw.balance_plain ?? raw.balance,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at
  };
}

// ─── Wallets ─────────────────────────────────────────────────────────────────

/** GET /wallets?wallet_type=service_wallet | payment_wallet */
export async function getWallet(walletType: 'service_wallet' | 'payment_wallet') {
  const json = await request(`/wallets?wallet_type=${walletType}`);
  return {
    walletType,
    balance: Number(json.balance_plain ?? json.balance ?? 0),
    currency: 'KES',
    meta: json
  };
}

/** POST /topup — top up the service wallet via an M-Pesa prompt. */
export async function topUpServiceWallet(opts: { amount: number; phone: string }) {
  const json = await request('/topup', {
    method: 'POST',
    body: { amount: Math.round(opts.amount), phone_number: opts.phone }
  });
  return {
    reference: json.reference as string,
    checkoutRequestId: json.CheckoutRequestID as string,
    status: json.status as string,
    success: json.success !== false
  };
}

// ─── Payouts / withdrawals ─────────────────────────────────────────────────────

/**
 * POST /withdraw — SasaPay payout to a mobile wallet or a bank account.
 * `network_code` is required (e.g. 'safaricom' for mobile; the bank's
 * SasaPay network code for bank payouts).
 */
export async function withdraw(opts: {
  amount: number;
  reference: string;
  channel: 'mobile' | 'bank';
  phone?: string;
  accountNumber?: string;
  networkCode: string;
  description?: string;
}) {
  const body: Record<string, any> = {
    amount: Math.round(opts.amount),
    network_code: opts.networkCode,
    external_reference: String(opts.reference).slice(0, 50),
    callback_url: process.env.PAYHERO_CALLBACK_URL || '',
    channel: opts.channel
  };
  if (opts.channel === 'mobile') body.phone_number = opts.phone || '';
  else body.account_number = opts.accountNumber || '';

  const json = await request('/withdraw', { method: 'POST', body });
  return {
    providerReference: json.reference as string,
    checkoutRequestId: json.CheckoutRequestID as string,
    status: json.status as string,
    success: json.success !== false,
    meta: json
  };
}

// ─── Transactions ─────────────────────────────────────────────────────────────

/** GET /transactions?page=N&per_page=M — paginated account ledger. */
export async function listTransactions(page = 1, perPage = 50) {
  const json = await request(`/transactions?page=${page}&per_page=${perPage}`);
  return {
    transactions: Array.isArray(json.transactions) ? json.transactions : (Array.isArray(json.data) ? json.data : []),
    pagination: json.pagination || null
  };
}

/** GET /transaction-status?reference= — status of any transaction by reference. */
export async function getTransactionStatus(reference: string) {
  if (!reference) throw new PayHeroError('Missing transaction reference');
  const json = await request(`/transaction-status?reference=${encodeURIComponent(reference)}`);
  return {
    status: json.status as string,
    reference: json.external_reference ?? json.reference ?? reference,
    amount: Number(json.amount_plain ?? json.amount ?? 0),
    success: json.success !== false,
    meta: json
  };
}