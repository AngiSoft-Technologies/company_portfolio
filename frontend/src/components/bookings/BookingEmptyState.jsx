import React from 'react';
import { Link } from 'react-router-dom';
import { FaInbox } from 'react-icons/fa';

/**
 * Friendly empty state used on history (no bookings) and lookup (no match).
 */
const BookingEmptyState = ({ title, message, ctaLabel = 'Start a Booking', ctaTo = '/booking' }) => (
    <div className="booking-empty-state">
        <FaInbox className="booking-empty-icon" />
        <h3>{title}</h3>
        {message && <p>{message}</p>}
        <Link to={ctaTo} className="btn btn-primary">{ctaLabel}</Link>
    </div>
);

export default BookingEmptyState;
