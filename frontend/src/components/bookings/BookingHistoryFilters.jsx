import React from 'react';

const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

const isActive = (b) => !['COMPLETED', 'CANCELLED', 'completed', 'cancelled'].includes(b.status || b.currentStage);
const isCompleted = (b) => ['COMPLETED', 'completed'].includes(b.status || b.currentStage);
const isCancelled = (b) => ['CANCELLED', 'cancelled'].includes(b.status || b.currentStage);

/**
 * Stateless filter pill group for the history list. Returns the predicate the
 * page uses to slice the bookings array.
 */
export function statusPredicate(filter) {
    switch (filter) {
        case 'active': return isActive;
        case 'completed': return isCompleted;
        case 'cancelled': return isCancelled;
        default: return () => true;
    }
}

const BookingHistoryFilters = ({ value, onChange, counts = {} }) => (
    <div className="booking-history-filters">
        {FILTERS.map((f) => (
            <button
                key={f.value}
                className={`booking-history-filter${value === f.value ? ' is-active' : ''}`}
                onClick={() => onChange(f.value)}
            >
                {f.label}
                {counts[f.value] != null && <span className="booking-history-filter-count">{counts[f.value]}</span>}
            </button>
        ))}
    </div>
);

export default BookingHistoryFilters;
