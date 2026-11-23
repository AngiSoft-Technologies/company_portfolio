// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/lib/theme';
import { apiPost, safeGet } from '@/lib/httpClient';
import { formatCurrency } from '@/lib/marketing/format';
import { FaCreditCard, FaMobileAlt, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';

const DEPOSIT_KEY = 'phase7Deposit';

type DepositBooking = {
    details?: unknown;
    currency?: string;
    client?: { phone?: string; email?: string };
    publicReference?: string;
    depositPaidAt?: string | null;
    status?: string;
};
type PaymentMethod = {
    id: string;
    label: string;
    available?: boolean;
    reason?: string;
    note?: string;
    requiresPhone?: boolean;
    requiresEmail?: boolean;
};
type PaymentMethodsResponse = { data?: { methods?: PaymentMethod[] } };
type DepositResponse = {
    error?: string;
    checkoutUrl?: string;
    reference?: string;
    orderId?: string;
    provider?: string;
    message?: string;
};
type DepositProps = {
    booking: DepositBooking;
    token: string;
    onPaid: () => void;
    depositOverride?: { amount: number; currency: string } | null;
};

/** Read the server-persisted deposit. Never trust a deposit amount from the URL. */
export function readBookingDeposit(booking: DepositBooking) {
    let raw = booking?.details;
    if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch { return null; }
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const value = raw[DEPOSIT_KEY];
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const amount = Number(value.amount);
    const currency = String(value.currency || booking?.currency || 'KES').toUpperCase();
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return { amount, currency };
}

function checkoutKey(reference: string) {
    return `booking-deposit:${reference}`;
}

export function readDepositCheckout(reference: string) {
    try {
        const raw = window.sessionStorage.getItem(checkoutKey(reference));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.reference !== 'string' || !parsed.reference) return null;
        return parsed as { reference: string; orderId?: string; provider?: string };
    } catch {
        return null;
    }
}

export function clearDepositCheckout(reference: string) {
    try { window.sessionStorage.removeItem(checkoutKey(reference)); } catch { /* noop */ }
}

/**
 * Customer deposit checkout using the same capability-gated catalogue as the
 * client portal. Only PayPal and the East Africa mobile-money rails can be
 * selected; the amount always comes from the booking's persisted details.
 */
const BookingDepositPanel = ({ booking, token, onPaid, depositOverride }: DepositProps) => {
    const { colors } = useTheme();
    const deposit = useMemo(
        () => depositOverride || readBookingDeposit(booking),
        [booking, depositOverride],
    );
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [method, setMethod] = useState('');
    const [phone, setPhone] = useState(String(booking?.client?.phone || ''));
    const [email, setEmail] = useState(String(booking?.client?.email || ''));
    const [loadingMethods, setLoadingMethods] = useState(true);
    const [paying, setPaying] = useState(false);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        safeGet('/payments/methods')
            .then((res: PaymentMethodsResponse) => {
                if (!active) return;
                const list = Array.isArray(res?.data?.methods) ? res.data.methods : [];
                setMethods(list);
                const first = list.find((m) => m.available);
                if (first) setMethod(first.id);
            })
            .finally(() => { if (active) setLoadingMethods(false); });
        return () => { active = false; };
    }, []);

    const selected = methods.find((m) => m.id === method);
    const needsPhone = Boolean(selected?.requiresPhone);
    const needsEmail = Boolean(selected?.requiresEmail);
    const canPay = Boolean(selected?.available && !paying
        && (!needsPhone || phone.trim()) && (!needsEmail || email.trim()));

    const pay = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!deposit || !selected || !canPay || !booking?.publicReference || !token) return;
        setPaying(true);
        setError('');
        setStatus('');
        try {
            const query = `?token=${encodeURIComponent(token)}`;
            const data: DepositResponse = await apiPost(
                `/bookings/reference/${encodeURIComponent(booking.publicReference)}/deposit${query}`,
                {
                    method: selected.id,
                    ...(needsPhone ? { phone: phone.trim() } : {}),
                    ...(needsEmail ? { email: email.trim() } : {}),
                },
                token,
            );
            if (!data || data.error) {
                setError(data?.error || 'Could not start the deposit');
                return;
            }
            if (data.checkoutUrl) {
                window.sessionStorage.setItem(checkoutKey(booking.publicReference), JSON.stringify({
                    reference: data.reference,
                    orderId: data.orderId,
                    provider: data.provider,
                }));
                setStatus('Opening secure PayPal checkout…');
                window.location.assign(data.checkoutUrl);
                return;
            }
            setStatus(data.message || 'Approve the payment prompt on your phone, then refresh status.');
        } catch {
            setError('Could not start the deposit. Please try again.');
        } finally {
            setPaying(false);
        }
    };

    const paid = Boolean(booking?.depositPaidAt || booking?.status === 'DEPOSIT_PAID');
    if (!deposit || paid) return null;

    return (
        <div className="booking-section booking-deposit-panel glass-card">
            <h3 className="booking-section-title">
                <FaCreditCard style={{ color: colors.primary }} /> Pay your deposit
            </h3>
            <p className="booking-payment-outstanding">
                Amount due: <strong>{formatCurrency(deposit.amount, deposit.currency)}</strong>
            </p>
            {loadingMethods ? (
                <p style={{ color: colors.textSecondary }}>Loading available payment methods…</p>
            ) : methods.length === 0 ? (
                <p style={{ color: colors.textSecondary }}>
                    No payment providers are configured on this deployment. Contact us to complete the deposit.
                </p>
            ) : (
                <form onSubmit={pay} className="booking-deposit-form">
                    <label className="booking-deposit-label" htmlFor="booking-deposit-method">Payment method</label>
                    <select
                        id="booking-deposit-method"
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        className="booking-deposit-select"
                    >
                        {methods.map((m) => (
                            <option key={m.id} value={m.id} disabled={!m.available}>
                                {m.label}{m.available ? '' : ` — ${m.reason || 'unavailable'}`}
                            </option>
                        ))}
                    </select>
                    {selected?.note && (
                        <p className="booking-deposit-note"><FaInfoCircle /> {selected.note}</p>
                    )}
                    {needsPhone && (
                        <>
                            <label className="booking-deposit-label" htmlFor="booking-deposit-phone">Phone number</label>
                            <input
                                id="booking-deposit-phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="254712345678"
                                className="booking-deposit-input"
                            />
                        </>
                    )}
                    {needsEmail && (
                        <>
                            <label className="booking-deposit-label" htmlFor="booking-deposit-email">Email</label>
                            <input
                                id="booking-deposit-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="booking-deposit-input"
                            />
                        </>
                    )}
                    <button type="submit" disabled={!canPay} className="btn btn-primary booking-deposit-submit">
                        {paying ? 'Starting…' : `Pay ${formatCurrency(deposit.amount, deposit.currency)}`}
                    </button>
                </form>
            )}
            {status && <p className="booking-deposit-status"><FaMobileAlt /> {status}</p>}
            {error && <p className="booking-deposit-error"><FaExclamationTriangle /> {error}</p>}
            <button type="button" className="booking-deposit-refresh" onClick={onPaid}>
                Refresh payment status
            </button>
        </div>
    );
};

export default BookingDepositPanel;
