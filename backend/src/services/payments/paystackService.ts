import crypto from 'crypto';

/**
 * Paystack (https://paystack.com/docs) — cards, mobile money, bank, USSD.
 * Amounts are in the currency's subunit (KES, NGN → cents). Webhooks carry an
 * `x-paystack-signature` header that is the HMAC-SHA512 of the RAW body signed
 * with the secret key; Paystack provides no higher-level SDK dependency here.
 */

const BASE = 'https://api.paystack.co';

export function isConfigured() {
    return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export async function initializeTransaction(opts: {
    email: string;
    amount: number; // major units (KES)
    currency?: string;
    reference: string;
    metadata?: Record<string, unknown>;
}) {
    const secret = process.env.PAYSTACK_SECRET_KEY || '';
    if (!secret) throw new Error('Paystack not configured');

    const res = await fetch(`${BASE}/transaction/initialize`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: opts.email,
            amount: Math.round(opts.amount * 100),
            currency: opts.currency || 'KES',
            reference: opts.reference,
            metadata: opts.metadata || {}
        })
    });

    const json = await res.json().catch(() => ({})) as any;
    if (!res.ok || !json || json.status !== true) {
        throw new Error(json?.message || `Paystack initialize failed (${res.status})`);
    }
    return {
        reference: json.data.reference as string,
        authorizationUrl: json.data.authorization_url as string,
        accessCode: json.data.access_code as string
    };
}

export async function verifyTransaction(reference: string) {
    const secret = process.env.PAYSTACK_SECRET_KEY || '';
    if (!secret) throw new Error('Paystack not configured');

    const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${secret}` }
    });
    const json = await res.json().catch(() => ({})) as any;
    if (!res.ok || !json || json.status !== true) {
        throw new Error(json?.message || `Paystack verify failed (${res.status})`);
    }
    return json.data;
}

/** Constant-time HMAC-SHA512 comparison of the raw body against x-paystack-signature. */
export function verifyWebhookSignature(rawBody: string | Buffer, signature: string | undefined, secret: string) {
    if (!signature || !secret) return false;
    const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(String(signature), 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

export function parseRawBody(body: any): any {
  if (Buffer.isBuffer(body)) {
    return JSON.parse(body.toString('utf8'));
  }
  return body;
}

/** GET /transaction — paginated transactions ledger (cards etc.). */
export async function listTransactions(page = 1, perPage = 50) {
  const json = await authedGet(`/transaction?perPage=${perPage}&page=${page}`);
  return {
    transactions: json?.data || [],
    meta: json?.meta || null,
  };
}

/** GET /subaccount — list split/partner accounts on the account. */
export async function listSubaccounts() {
  return (await authedGet('/subaccount'))?.data || [];
}

/** POST /subaccount — register a recipient account for split payments. */
export async function createSubaccount(opts: {
  businessName: string;
  accountNumber: string;
  settlementBank: string; // 5-digit Paystack bank code
  percentageCharge?: number;
  description?: string;
}) {
  const secret = process.env.PAYSTACK_SECRET_KEY || '';
  if (!secret) throw new Error('Paystack not configured');
  const res = await fetch(`${BASE}/subaccount`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_name: opts.businessName,
      account_number: opts.accountNumber,
      settlement_bank: opts.settlementBank,
      percentage_charge: opts.percentageCharge ?? 100,
      description: opts.description || '',
    }),
  });
  const json = await res.json().catch(() => ({})) as any;
  if (!res.ok || !json || json.status !== true) {
    throw new Error(json?.message || `Paystack subaccount create failed (${res.status})`);
  }
  return json.data;
}

async function authedGet(path: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY || '';
  if (!secret) throw new Error('Paystack not configured');
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const json = await res.json().catch(() => ({})) as any;
  if (!res.ok || !json || json.status !== true) {
    throw new Error(json?.message || `Paystack request failed (${res.status})`);
  }
  return json;
}