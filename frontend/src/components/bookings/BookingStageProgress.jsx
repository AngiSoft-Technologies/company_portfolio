import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import BookingStatusBadge from './BookingStatusBadge';

/**
 * Horizontal stepper driven by the server's stageProgress contract
 * { order: [...stages], currentIndex }. Rendering the order from the backend
 * keeps the frontend in lockstep with the workflow definition (single source
 * of truth). If the contract is missing, falls back to the raw stage.
 */
const STAGE_LABELS = {
    request_submitted: 'Submitted',
    requirements_review: 'Review',
    clarification_needed: 'Clarify',
    scope_and_quotation: 'Quotation',
    awaiting_confirmation: 'Confirm',
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    customer_review: 'Review',
    completed: 'Completed',
};

const BookingStageProgress = ({ stage, stageProgress }) => {
    const { colors } = useTheme();

    if (stageProgress?.order?.length) {
        const { order, currentIndex } = stageProgress;
        const cancelled = stage === 'cancelled';
        return (
            <div className={`booking-stepper${cancelled ? ' is-cancelled' : ''}`}>
                {order.map((s, i) => {
                    const isDone = i < currentIndex;
                    const isCurrent = i === currentIndex;
                    const isRejected = stage === 'rejected' && isCurrent;
                    const itemColor = cancelled || isRejected ? colors.error
                        : isDone || isCurrent ? colors.primary : colors.textMuted;
                    return (
                        <div
                            key={s}
                            className={`booking-stepper-item${isDone ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}`}
                        >
                            <div
                                className="booking-stepper-dot"
                                style={{ borderColor: itemColor, background: isDone ? itemColor : 'transparent' }}
                            >
                                {isDone ? '✓' : i + 1}
                            </div>
                            <span className="booking-stepper-label">{STAGE_LABELS[s] || s}</span>
                            {i < order.length - 1 && (
                                <span
                                    className="booking-stepper-bar"
                                    style={{ background: isDone ? itemColor : colors.border }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="booking-stepper-single">
            <BookingStatusBadge stage={stage} />
        </div>
    );
};

export default BookingStageProgress;
