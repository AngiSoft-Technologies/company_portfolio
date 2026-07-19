import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { formatCurrency } from '../../utils/format';

/**
 * Compact overview card for a single booking: service/package, requested
 * outcome, budget vs quoted amount, timeline + reference. Consumed by both the
 * progress page (header) and the history list.
 */
const BookingSummaryCard = ({ booking }) => {
    const { colors } = useTheme();
    if (!booking) return null;

    const title = booking.title || booking.serviceTitle || booking.packageTitle || 'Booking';
    const serviceLine = [booking.serviceTitle, booking.packageTitle].filter(Boolean).join(' · ');
    const requested = booking.requestedOutcome || booking.requestType || booking.projectType;
    const submitted = booking.submittedAt || booking.createdAt;

    return (
        <div className="booking-summary-card glass-card">
            <div className="booking-summary-row booking-summary-title">
                <h3>{title}</h3>
                <span className="booking-summary-ref">#{booking.publicReference}</span>
            </div>
            {serviceLine && <p className="booking-summary-service">{serviceLine}</p>}

            <div className="booking-summary-grid">
                {requested && (
                    <div>
                        <span className="booking-summary-label">Type</span>
                        <span className="booking-summary-value">{requested}</span>
                    </div>
                )}
                {booking.desiredOutcome && (
                    <div>
                        <span className="booking-summary-label">Outcome</span>
                        <span className="booking-summary-value">{booking.desiredOutcome}</span>
                    </div>
                )}
                {booking.budgetAmount != null && (
                    <div>
                        <span className="booking-summary-label">Budget</span>
                        <span className="booking-summary-value">
                            {formatCurrency(booking.budgetAmount, booking.currency)}
                        </span>
                    </div>
                )}
                {booking.quotedAmount != null && (
                    <div>
                        <span className="booking-summary-label">Quoted</span>
                        <span className="booking-summary-value booking-summary-quoted">
                            {formatCurrency(booking.quotedAmount, booking.quotedCurrency || booking.currency)}
                        </span>
                    </div>
                )}
                {submitted && (
                    <div>
                        <span className="booking-summary-label">Submitted</span>
                        <span className="booking-summary-value">
                            {new Date(submitted).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookingSummaryCard;
