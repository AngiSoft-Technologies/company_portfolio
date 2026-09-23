/**
 * Safaricom M-Pesa Daraja API — Lipa Na M-Pesa Online (STK Push).
 * https://developer.safaricom.co.ke / https://sandbox.safaricom.co.ke
 *
 * Flow: OAuth token (consumer key/secret) → STK push → Safaricom calls our
 * callback with `Body.stkCallback`. The callback is NOT cryptographically
 * signed — authenticity comes from matching `CheckoutRequestID` to a Payment
 * row we minted at initiate time (surprise webhooks are rejected).
 */

const SANDBOX_BASE = 'https://sandbox.safaricom.co.ke';
const PRODUCTION_BASE = 'https://api.safaricom.co.ke';

function baseUrl() {
    return (process.env.MPESA_ENV || 'sandbox') === 'production' ? PRODUCTION_BASE : SANDBOX_BASE;
}

export function isConfigured() {
    return Boolean(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET);
}

function pad(n: number) {
    return String(n).padStart(2, '0');
}

/** Safaricom timestamp = YYYYMMDDHHmmss in LOCAL time. */
function darajaTimestamp(date = new Date()) {
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/** Normalise '07XXXXXXXX' / '+2547XXXXXXXX' → 2547XXXXXXXX */
export function normalizePhone(phone: string) {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('254')) return digits;
    if (digits.startsWith('07')) return `254${digits.slice(1)}`;
    if (digits.startsWith('7')) return `254${digits}`;
    return digits;
}

async function getAccessToken() {
    const key = process.env.MPESA_CONSUMER_KEY || '';
    const secret = process.env.MPESA_CONSUMER_SECRET || '';
    const basic = Buffer.from(`${key}:${secret}`).toString('base64');
    const res = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: { Authorization: `Basic ${basic}` }
    });
    const json = await res.json().catch(() => ({})) as any;
    if (!res.ok || !json.access_token) {
        throw new Error(json?.errorMessage || json?.error_description || `M-Pesa token failed (${res.status})`);
    }
    return json.access_token;
}

export async function initStkPush(opts: {
    phone: string;
    amount: number; // major units (KES)
    reference: string;
    description?: string;
}) {
    if (!isConfigured()) throw new Error('M-Pesa not configured');
    const token = await getAccessToken();
    const shortcode = (process.env.MPESA_SHORTCODE || '174379').trim();
    const passkey = process.env.MPESA_PASSKEY || '';
    const timestamp = darajaTimestamp();

    const res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            BusinessShortCode: shortcode,
            Password: Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64'),
            Timestamp: timestamp,
            TransactionType: process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline',
            Amount: Math.round(opts.amount),
            PartyA: normalizePhone(opts.phone),
            PartyB: shortcode,
            PhoneNumber: normalizePhone(opts.phone),
            CallBackURL: process.env.MPESA_CALLBACK_URL || '',
            AccountReference: String(opts.reference || 'ANGISOFT').slice(0, 12),
            TransactionDesc: String(opts.description || 'Payment').slice(0, 13)
        })
    });

    const json = await res.json().catch(() => ({})) as any;
    // ResponseCode '0' = request accepted; CheckoutRequestID is our natural key.
    if (json.ResponseCode !== '0' || !json.CheckoutRequestID) {
        throw new Error(json?.ResponseDescription || `M-Pesa STK push failed (${res.status})`);
    }
    return {
        checkoutRequestId: json.CheckoutRequestID as string,
        merchantRequestId: json.MerchantRequestID as string,
        responseDescription: json.ResponseDescription as string
    };
}

export interface StkCallback {
    checkoutRequestId: string;
    resultCode: string;
    resultDesc: string;
    mpesaReceipt?: string;
    amount?: number;
    raw: any;
}

/** Decode the callback body Safaricom posts: Body.stkCallback (Base64-encoded in sandbox). */
export function decodeStkCallback(body: any): StkCallback | null {
    const raw = body?.Body?.stkCallback;
    if (!raw) return null;
    const resultCode = String(raw.ResultCode);
    let meta: Array<{ Name: string; Value?: any }> = Array.isArray(raw.CallbackMetadata?.Item) ? raw.CallbackMetadata.Item : [];
    if (typeof raw.CallbackMetadata === 'string') {
        try {
            meta = JSON.parse(raw.CallbackMetadata).Item || [];
        } catch {
            meta = [];
        }
    }
    const get = (name: string) => {
        const item = meta.find((m) => m.Name === name);
        return item ? item.Value : undefined;
    };
    return {
        checkoutRequestId: String(raw.CheckoutRequestID || ''),
        resultCode,
        resultDesc: String(raw.ResultDesc || ''),
        mpesaReceipt: get('MpesaReceiptNumber'),
        amount: get('Amount'),
        raw
    };
}