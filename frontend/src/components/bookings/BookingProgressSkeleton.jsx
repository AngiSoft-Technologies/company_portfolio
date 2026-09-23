import React from 'react';

/** Loading placeholder for the progress / history pages while data loads. */
const BookingProgressSkeleton = () => (
    <div className="booking-skeleton" aria-busy="true" aria-label="Loading booking">
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
