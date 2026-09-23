import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import BookingStatusBadge from './BookingStatusBadge';
import { getBookingProgressPath } from '../../utils/booking/bookingRoutes';

/**
 * Hero banner for the booking progress page: title, public reference, and the
 * current status pill. Stays deliberately compact — the stepper carries the
 * workflow detail below it.
 */
const BookingProgressHero = ({ booking }) => {
    const { colors } = useTheme();
    if (!booking) return null;
    const title = booking.title || booking.serviceTitle || 'Booking Progress';

    return (
        <header className="booking-progress-hero">
            <div className="booking-progress-hero-inner">
                <div>
                    <p className="booking-progress-eyebrow">Booking</p>
                    <h1>{title}</h1>
                    <p className="booking-progress-ref">Reference #{booking.publicReference}</p>
                </div>
                <BookingStatusBadge status={booking.status} stage={booking.currentStage} tone={colors.primary} />
            </div>
        </header>
    );
};

export default BookingProgressHero;
