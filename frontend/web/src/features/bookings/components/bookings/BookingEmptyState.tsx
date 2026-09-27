// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { VisualState } from '@angisoft/ui';

const BookingEmptyState = ({ ctaLabel = 'Start a Booking', ctaTo = '/booking' }) => (
    <div className="booking-empty-state">
        <VisualState variant="unavailable" />
        <Link to={ctaTo} className="btn btn-primary">{ctaLabel}</Link>
    </div>
);

export default BookingEmptyState;
