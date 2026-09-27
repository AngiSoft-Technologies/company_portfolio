// @ts-nocheck
import React from 'react';

/** Content placeholder for progress and history surfaces. */
const BookingProgressSkeleton = () => (
    <div className="booking-skeleton" aria-busy="true">
        <div className="booking-skeleton-hero" />
        <div className="booking-skeleton-stepper">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="booking-skeleton-step" />
            ))}
        </div>
        <div className="booking-skeleton-body">
            <div className="booking-skeleton-block" />
            <div className="booking-skeleton-block short" />
        </div>
    </div>
);

export default BookingProgressSkeleton;
