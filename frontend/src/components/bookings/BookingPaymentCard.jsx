import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { formatCurrency } from '../../utils/format';
import { FaCreditCard } from 'react-icons/fa';

/**
 * Payment summary widget. Shows any recorded payments and the outstanding
 * balance relative to quotedAmount, with a "Pay now" trigger that the page
 * wires to the Stripe flow when a clientSecret exists.
 */
const BookingPaymentCard = ({ booking, onPay, paying }) => {
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
            {booking?.clientSecret && outstanding > 0 && (
                <button className="btn btn-primary" disabled={paying} onClick={onPay}>
                    Pay {formatCurrency(outstanding, booking.quotedCurrency || booking.currency)}
                </button>
            )}
        </div>
    );
};

export default BookingPaymentCard;
