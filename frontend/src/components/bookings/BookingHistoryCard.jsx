import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Link } from 'react-router-dom';
import BookingStatusBadge from './BookingStatusBadge';
import { getBookingProgressPath } from '../../utils/booking/bookingRoutes';

/**
 * A single row in the customer booking history list. Links to the progress
 * page for that reference. Avoids exposing internal staff info — only the
 * customer-safe summary is shown.
 */
const BookingHistoryCard = ({ booking }) => {
    const { colors } = useTheme();
    if (!booking) return null;
    const title = booking.title || booking.serviceTitle || booking.packageTitle || 'Booking';
    const submitted = booking.submittedAt || booking.createdAt;

    return (
        <Link to={getBookingProgressPath(booking)} className="booking-history-card glass-card">
            <div className="booking-history-card-main">
                <h3>{title}</h3>
                <span className="booking-history-ref">#{booking.publicReference}</span>
                {submitted && (
                    <p className="booking-history-date">
                        {new Date(submitted).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                )}
            </div>
            <div className="booking-history-card-side">
                <BookingStatusBadge status={booking.status} stage={booking.currentStage} tone={colors.primary} />
                <span className="booking-history-arrow">View →</span>
            </div>
        </Link>
    );
};

export default BookingHistoryCard;
