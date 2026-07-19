import React from 'react';
import { Link } from 'react-router-dom';
import BookingExperience from '../components/booking/BookingExperience';
import '../css/booking/booking.css';

/**
 * Thin page wrapper for the /booking route.
 *
 * All booking-form logic now lives in the reusable <BookingExperience />.
 * BookingExperience self-resolves its context (service / package / product /
 * source / referrer) from props → router location.state → URL query params →
 * sessionStorage draft, so this page does not need to extract anything — it
 * just mounts the experience with redirect-after-success enabled.
 *
 * The legacy /booking/:id (BookingStatus) route is unchanged and continues to
 * show booking status for the old direct-ID flow.
 */
const Booking = () => {
    return (
        <BookingExperience
            redirectAfterSuccess
            successRedirectPath="/bookings"
        />
    );
};

export default Booking;
