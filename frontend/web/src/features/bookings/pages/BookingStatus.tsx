// @ts-nocheck
import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

/**
 * Legacy /booking/:id status URLs are no longer supported: internal ids and
 * self-asserted email addresses cannot authorize booking access. Send the
 * customer through the secure reference + email link flow instead.
 */
const BookingStatus = () => {
    const { id } = useParams();
    return <Navigate to="/track-booking" replace state={{ legacyBookingId: id }} />;
};

export default BookingStatus;
