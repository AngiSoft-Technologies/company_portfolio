// @ts-nocheck
import React from 'react';
import { useTheme } from '@/lib/theme';
import { formatCurrency } from '@/lib/marketing/format';
import { FaCreditCard } from 'react-icons/fa';

/**
 * Payment summary widget. Shows recorded payments and the outstanding balance
 * relative to quotedAmount. Deposits are opened by BookingDepositPanel using
 * the capability-gated Phase 7 rails; no payment secret reaches this card.
 */
const BookingPaymentCard = ({ booking }) => {
    const { colors } = useTheme();
    const payments = booking?.payments || [];
    const paid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const quoted = booking?.quotedAmount != null ? Number(booking.quotedAmount) : null;
    const outstanding = quoted != null ? Math.max(quoted - paid, 0) : null;

    return (
        <div className="booking-payment-card glass-card">
            <div className="booking-payment-head">
                <FaCreditCard style={{ color: colors.primary }} />
                <h4>Payments</h4>
            </div>
            {payments.length > 0 ? (
                <ul className="booking-payment-list">
                    {payments.map((p) => (
                        <li key={p.id}>
                            <span>{p.label || p.provider || 'Payment'}</span>
                            <span>{formatCurrency(Number(p.amount), p.currency || booking.currency)}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="booking-payment-none">No payments recorded yet.</p>
            )}
            {quoted != null && (
                <p className="booking-payment-outstanding">
                    Outstanding: <strong>{formatCurrency(outstanding, booking.quotedCurrency || booking.currency)}</strong>
                </p>
            )}
        </div>
    );
};

export default BookingPaymentCard;
