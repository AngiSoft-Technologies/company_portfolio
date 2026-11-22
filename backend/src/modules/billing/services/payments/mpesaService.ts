import { getConfig } from '../../../../shared/services/runtimeConfig';
import { getQueue } from '../../../../queue';
import { darajaResolveUrl } from './darajaPayouts';
/**
 * Safaricom M-Pesa Daraja API — Lipa Na M-Pesa Online (STK Push).
 *
 * Flow: cached OAuth token → STK push → Safaricom calls our callback with
 * `Body.stkCallback`. The callback is NOT cryptographically signed — authenticity
 * comes from matching `CheckoutRequestID` to a Payment row minted at initiation
 * plus the shared callback token gate in the route layer.
 *
 * Production readiness (from the local Daraja guide):
 * - OAuth tokens are cached with a five-minute safety margin; never fetch one
 *   token per payment.
 * - The synchronous response only means "accepted"; persist CheckoutRequestID.
 * - If the callback is lost, query STK status once after 5–10 minutes rather
 *   than polling continuously (which can get the IP blocked).
 */

const SANDBOX_BASE = 'https://sandbox.safaricom.co.ke';
const PRODUCTION_BASE = 'https://api.safaricom.co.ke';

interface JsonRecord {
  [key: string]: unknown;
}

function jsonRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' ? value as JsonRecord : {};
}

function baseUrl() {
    const env = getConfig('MPESA_ENV', 'sandbox').trim().toLowerCase();
    return env === 'production' || env === 'live' ? PRODUCTION_BASE : SANDBOX_BASE;
}

export function isConfigured() {
    return Boolean(getConfig('MPESA_CONSUMER_KEY') && getConfig('MPESA_CONSUMER_SECRET'));
}

/** One delayed status query per STK push — never a polling loop. */
export const MPESA_STK_RECOVERY_QUEUE = 'mpesa-stk-recovery';
export const MPESA_STK_RECOVERY_DELAY_MS = 7 * 60 * 1000;

export interface StkRecoveryJob {
    checkoutRequestId: string;
    reference?: string;
    amount?: number;
    phone?: string;
}

export function scheduleStkStatusRecovery(job: StkRecoveryJob): Promise<{ id: string }> {
    if (!job.checkoutRequestId) return Promise.resolve({ id: '' });
    return getQueue(MPESA_STK_RECOVERY_QUEUE).add('recover-once', job as unknown as Record<string, unknown>, {
        delayMs: MPESA_STK_RECOVERY_DELAY_MS,
    });
}

/**
 * Safaricom timestamps are Africa/Nairobi wall-clock time (EAT, UTC+3), NOT the
 * server's local timezone. The local pack is inconsistent here — its Node sample
 * uses UTC `toISOString()` while its Python sample uses local `datetime.now()` —
 * so pin the IANA zone explicitly. A Fly/host container defaults to UTC, which
 * would otherwise produce a three-hour skew and an invalid STK password.
 * Kenya has no DST, but Intl keeps this correct even if that ever changes.
 */
const DARAJA_TIMEZONE = 'Africa/Nairobi';
const darajaClock = new Intl.DateTimeFormat('en-GB', {
    timeZone: DARAJA_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
});

/** Safaricom timestamp = YYYYMMDDHHmmss in Africa/Nairobi local time. */
export function darajaTimestamp(date = new Date()) {
    const parts = darajaClock.formatToParts(date);
    const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
    return `${part('year')}${part('month')}${part('day')}${part('hour')}${part('minute')}${part('second')}`;
}

/** Base64(ShortCode + Passkey + Timestamp), shared by STK push and STK query. */
export function darajaPassword(shortcode: string, passkey: string, timestamp: string) {
    return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
}

/** Normalise '07XXXXXXXX' / '+2547XXXXXXXX' → 2547XXXXXXXX */
export function normalizePhone(phone: string) {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('254')) return digits;
    if (digits.startsWith('07')) return `254${digits.slice(1)}`;
    if (digits.startsWith('7')) return `254${digits}`;
    return digits;
}

interface CachedToken {
    token: string;
    expiresAt: number;
}

let tokenCache: CachedToken | null = null;
let tokenPromise: Promise<string> | null = null;

function cacheKey() {
    return `${baseUrl()}:${getConfig('MPESA_CONSUMER_KEY')}`;
}

let cachedKey = '';

/** Fail-closed OAuth token fetch with 60-minute lifetime and a 5-minute margin. */
async function fetchAccessToken(): Promise<string> {
    const key = getConfig('MPESA_CONSUMER_KEY');
    const secret = getConfig('MPESA_CONSUMER_SECRET');
    if (!key || !secret) throw new Error('M-Pesa not configured');
    const basic = Buffer.from(`${key}:${secret}`).toString('base64');
    const res = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: { Authorization: `Basic ${basic}`, Accept: 'application/json' },
    });
    const json = jsonRecord(await res.json().catch(() => ({})));
    if (!res.ok || typeof json.access_token !== 'string') {
        const message = json.errorMessage || json.error_description || `M-Pesa token failed (${res.status})`;
        throw new Error(String(message));
    }
    const expiresIn = Number(json.expires_in) || 3600;
    tokenCache = {
        token: json.access_token,
        expiresAt: Date.now() + Math.max(60, expiresIn - 300) * 1000,
    };
    cachedKey = cacheKey();
    return json.access_token;
}

export async function getAccessToken(): Promise<string> {
    const now = Date.now();
    if (tokenCache && cachedKey === cacheKey() && tokenCache.expiresAt > now) return tokenCache.token;
    if (!tokenPromise) {
        tokenPromise = fetchAccessToken().finally(() => { tokenPromise = null; });
    }
    return tokenPromise;
}

export function resetAccessTokenCache() {
    tokenCache = null;
    tokenPromise = null;
    cachedKey = '';
}

async function post(path: string, payload: JsonRecord): Promise<JsonRecord> {
    const token = await getAccessToken();
    const res = await fetch(`${baseUrl()}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const json = jsonRecord(await res.json().catch(() => ({})));
    if (!res.ok) throw new Error(`M-Pesa request failed (${res.status})`);
    return json;
}

export async function initStkPush(opts: {
    phone: string;
    amount: number; // major units (KES)
    reference: string;
    description?: string;
}) {
    if (!isConfigured()) throw new Error('M-Pesa not configured');
    // Shared with the outbound adapter: live callbacks must be absolute HTTPS.
    // Validate before requesting an OAuth token so invalid config makes no call.
    const callbackUrl = darajaResolveUrl(getConfig('MPESA_CALLBACK_URL'), 'MPESA_CALLBACK_URL');
    const token = await getAccessToken();
    const shortcode = getConfig('MPESA_SHORTCODE', '174379').trim();
    const passkey = getConfig('MPESA_PASSKEY');
    const timestamp = darajaTimestamp();

    const res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            BusinessShortCode: shortcode,
            Password: darajaPassword(shortcode, passkey, timestamp),
            Timestamp: timestamp,
            TransactionType: getConfig('MPESA_TRANSACTION_TYPE', 'CustomerPayBillOnline'),
            Amount: Math.round(opts.amount),
            PartyA: normalizePhone(opts.phone),
            PartyB: shortcode,
            PhoneNumber: normalizePhone(opts.phone),
            CallBackURL: callbackUrl,
            AccountReference: String(opts.reference || 'ANGISOFT').slice(0, 12),
            TransactionDesc: String(opts.description || 'Payment').slice(0, 13)
        })
    });

    const json = jsonRecord(await res.json().catch(() => ({})));
    // ResponseCode '0' = request accepted; CheckoutRequestID is our natural key.
    if (json.ResponseCode !== '0' || !json.CheckoutRequestID) {
        throw new Error(String(json.ResponseDescription || `M-Pesa STK push failed (${res.status})`));
    }
    const result = {
        checkoutRequestId: String(json.CheckoutRequestID),
        merchantRequestId: String(json.MerchantRequestID || ''),
        responseDescription: String(json.ResponseDescription || ''),
    };
    // A lost or delayed callback is recovered by exactly one delayed status
    // query. No repeated polling; the worker itself never reschedules.
    void scheduleStkStatusRecovery({
        checkoutRequestId: result.checkoutRequestId,
        reference: opts.reference,
        amount: opts.amount,
        phone: opts.phone,
    }).catch(() => undefined);
    return result;
}

export type StkQueryOutcome = 'SUCCESS' | 'FAILED' | 'PENDING' | 'UNKNOWN';

export interface StkQueryResult {
    outcome: StkQueryOutcome;
    resultCode: string;
    resultDescription: string;
    receipt?: string;
    amount?: number;
    phone?: string;
    transactionDate?: string;
}

/**
 * Interpret one STK status query. Only an explicit Daraja result can move a
 * Payment; a failed query or an in-progress code always leaves it PENDING.
 */
export function decodeStkQueryResult(status: Awaited<ReturnType<typeof queryStkStatus>>): StkQueryResult {
    const raw = jsonRecord(status.raw);
    const resultCode = String(raw.ResultCode ?? '');
    const result: StkQueryResult = {
        outcome: 'UNKNOWN',
        resultCode,
        resultDescription: String(raw.ResultDesc ?? status.responseDescription ?? ''),
    };
    const receipt = raw.MpesaReceiptNumber;
    if (receipt !== undefined && receipt !== null && String(receipt).trim()) {
        result.receipt = String(receipt).trim();
    }
    if (raw.Amount !== undefined && raw.Amount !== null && Number.isFinite(Number(raw.Amount))) {
        result.amount = Number(raw.Amount);
    }
    if (raw.PhoneNumber !== undefined && raw.PhoneNumber !== null) result.phone = String(raw.PhoneNumber);
    if (raw.TransactionDate !== undefined && raw.TransactionDate !== null) result.transactionDate = String(raw.TransactionDate);

    // The query itself must be accepted; otherwise the result code is meaningless.
    if (status.responseCode !== '0') return result;
    if (resultCode === '0') {
        result.outcome = result.receipt ? 'SUCCESS' : 'UNKNOWN';
        return result;
    }
    if (resultCode === '1' || !resultCode) {
        result.outcome = 'PENDING';
        return result;
    }
    // Explicit non-zero terminal result (cancelled, timeout, rejected PIN, …).
    result.outcome = 'FAILED';
    return result;
}

/** Lost-webhook recovery: query once after 5–10 minutes, never in a tight loop. */
export async function queryStkStatus(checkoutRequestId: string) {
    if (!isConfigured()) throw new Error('M-Pesa not configured');
    const shortcode = getConfig('MPESA_SHORTCODE', '174379').trim();
    const passkey = getConfig('MPESA_PASSKEY');
    const timestamp = darajaTimestamp();
    const json = await post('/mpesa/stkpushquery/v1/query', {
        BusinessShortCode: shortcode,
        Password: darajaPassword(shortcode, passkey, timestamp),
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
    });
    return {
        responseCode: String(json.ResponseCode || ''),
        responseDescription: String(json.ResponseDescription || ''),
        checkoutRequestId: String(json.CheckoutRequestID || checkoutRequestId),
        raw: json,
    };
}

export interface StkCallback {
    checkoutRequestId: string;
    merchantRequestId?: string;
    resultCode: string;
    resultDesc: string;
    mpesaReceipt?: string;
    amount?: number;
    phone?: string;
    transactionDate?: string;
    raw: unknown;
}

/** Decode the callback body Safaricom posts as plain JSON: Body.stkCallback. */
export function decodeStkCallback(body: unknown): StkCallback | null {
    const envelope = jsonRecord(body);
    const wrapper = jsonRecord(envelope.Body);
    const raw = jsonRecord(wrapper.stkCallback);
    if (!wrapper.stkCallback) return null;
    const resultCode = String(raw.ResultCode);
    const metadata = jsonRecord(raw.CallbackMetadata);
    let meta: Array<{ Name?: unknown; Value?: unknown }> = Array.isArray(metadata.Item)
        ? metadata.Item as Array<{ Name?: unknown; Value?: unknown }>
        : [];
    if (typeof raw.CallbackMetadata === 'string') {
        try {
            const parsed = jsonRecord(JSON.parse(raw.CallbackMetadata));
            if (Array.isArray(parsed.Item)) meta = parsed.Item as Array<{ Name?: unknown; Value?: unknown }>;
        } catch { meta = []; }
    }
    const get = (name: string) => meta.find((m) => m.Name === name)?.Value;
    return {
        checkoutRequestId: String(raw.CheckoutRequestID || ''),
        merchantRequestId: raw.MerchantRequestID ? String(raw.MerchantRequestID) : undefined,
        resultCode,
        resultDesc: String(raw.ResultDesc || ''),
        mpesaReceipt: get('MpesaReceiptNumber') as string | undefined,
        amount: get('Amount') as number | undefined,
        phone: get('PhoneNumber') as string | undefined,
        transactionDate: get('TransactionDate') as string | undefined,
        raw,
    };
}
