import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { formatCurrency } from '../../utils/format';
import { FaFileAlt, FaCheckCircle } from 'react-icons/fa';

/**
 * Shows the active quotation (from the latest quotation event / quotedAmount)
 * with accept/decline actions. Action availability is driven by the booking's
 * server-provided `availableActions` — never decide client-side.
 */
const BookingQuotationCard = ({ booking, availableActions = [], onAccept, onDecline, reacting }) => {
    const { colors } = useTheme();
    const canAccept = availableActions.includes('ACCEPT_QUOTATION');
    const canDecline = availableActions.includes('DECLINE_QUOTATION');

    return (
        <div className="booking-quotation-card glass-card">
            <div className="booking-quotation-head">
                <FaFileAlt style={{ color: colors.primary }} />
                <h4>Quotation</h4>
            </div>
            {booking?.quotedAmount != null ? (
                <>
                    <p className="booking-quotation-amount">
                        {formatCurrency(booking.quotedAmount, booking.quotedCurrency || booking.currency)}
                    </p>
                    {booking.quotedNote && <p className="booking-quotation-note">{booking.quotedNote}</p>}
                    {(canAccept || canDecline) && (
                        <div className="booking-quotation-actions">
                            {canAccept && (
                                <button className="btn btn-primary" disabled={reacting} onClick={onAccept}>
                                    <FaCheckCircle /> Accept
                                </button>
                            )}
                            {canDecline && (
                                <button className="btn btn-ghost" disabled={reacting} onClick={onDecline}>
                                    Decline
                                </button>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <p className="booking-quotation-pending">A quotation will appear here once prepared.</p>
            )}
        </div>
    );
};

export default BookingQuotationCard;
