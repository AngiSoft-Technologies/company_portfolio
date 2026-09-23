import React from 'react';
import { Link } from 'react-router-dom';
import { FaLock } from 'react-icons/fa';
import { getBookingLookupPath } from '../../utils/booking/bookingRoutes';

/**
 * Shown when a tracking reference/token lookup fails or is forbidden. Never
 * reveals whether a reference exists — just offers to retry via lookup.
 */
const BookingAccessError = ({ message = 'We could not open that booking. Check the reference or tracking link and try again.' }) => (
    <div className="booking-access-error">
        <FaLock className="booking-access-icon" />
        <h3>Booking not accessible</h3>
        <p>{message}</p>
        <Link to={getBookingLookupPath()} className="btn btn-primary">Track a Booking</Link>
    </div>
);

export default BookingAccessError;
