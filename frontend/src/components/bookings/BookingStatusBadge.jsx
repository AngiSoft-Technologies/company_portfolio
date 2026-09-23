import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Maps a BookingStatus enum value (or a workflow stage) to a human label +
 * colour. Used everywhere a status pill is shown (timeline, history, progress).
 */
const STATUS_LABELS = {
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'Under Review',
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected',
    TERMS_ACCEPTED: 'Terms Accepted',
    DEPOSIT_PAID: 'Deposit Paid',
    IN_PROGRESS: 'In Progress',
    DELIVERED: 'Delivered',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
};

const STAGE_LABELS = {
    request_submitted: 'Submitted',
    requirements_review: 'Requirements Review',
    clarification_needed: 'Clarification Needed',
    scope_and_quotation: 'Scope & Quotation',
    awaiting_confirmation: 'Awaiting Confirmation',
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    customer_review: 'Customer Review',
    changes_requested: 'Changes Requested',
    completed: 'Completed',
    cancelled: 'Cancelled',
    rejected: 'Rejected',
};

export function statusLabel(value) {
    return STATUS_LABELS[value] || STAGE_LABELS[value] || value || 'Unknown';
}

const BookingStatusBadge = ({ status, stage, tone }) => {
    const { colors } = useTheme();
    const label = statusLabel(status || stage);
    const isCancelled = status === 'CANCELLED' || stage === 'cancelled';
    const isCompleted = status === 'COMPLETED' || stage === 'completed';
    const isRejected = status === 'REJECTED' || stage === 'rejected';

    let color = colors.info;
    if (isCancelled) color = colors.error;
    else if (isCompleted) color = colors.success;
    else if (isRejected) color = colors.warning;
    else if (tone) color = tone;

    return (
        <span
            className="booking-status-badge"
            style={{
                color,
                borderColor: `${color}66`,
                background: `${color}1a`,
            }}
        >
            <span className="booking-status-dot" style={{ background: color }} />
            {label}
        </span>
    );
};

export default BookingStatusBadge;
