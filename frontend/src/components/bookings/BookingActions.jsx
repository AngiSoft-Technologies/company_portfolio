import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FaRedo, FaComment, FaUpload, FaTimesCircle, FaCheckCircle } from 'react-icons/fa';

const ACTION_META = {
    ACCEPT_QUOTATION: { label: 'Accept Quotation', icon: FaCheckCircle, cls: 'btn-primary' },
    DECLINE_QUOTATION: { label: 'Decline Quotation', icon: FaTimesCircle, cls: 'btn-ghost' },
    REQUEST_CHANGES: { label: 'Request Changes', icon: FaComment, cls: 'btn-ghost' },
    CONFIRM_DELIVERY: { label: 'Confirm Delivery', icon: FaCheckCircle, cls: 'btn-primary' },
    CANCEL_BOOKING: { label: 'Cancel Booking', icon: FaTimesCircle, cls: 'btn-danger' },
    ADD_FILE: { label: 'Add Files', icon: FaUpload, cls: 'btn-ghost' },
    REPEAT_BOOKING: { label: 'Book Similar', icon: FaRedo, cls: 'btn-ghost' },
};

/**
 * Renders the server-authorised action buttons for a booking. `availableActions`
 * comes straight from serializeBooking(); we never invent actions here.
 */
const BookingActions = ({ availableActions = [], repeatFromBooking, onAction, onRepeat, busy }) => {
    const { colors } = useTheme();
    const items = availableActions.filter((a) => a !== 'ADD_FILE' && a !== 'REPEAT_BOOKING');

    return (
        <div className="booking-actions">
            {items.map((action) => {
                const meta = ACTION_META[action] || { label: action, icon: FaComment, cls: 'btn-ghost' };
                const Icon = meta.icon;
                return (
                    <button
                        key={action}
                        className={`btn ${meta.cls}`}
                        disabled={busy}
                        onClick={() => onAction(action)}
                    >
                        <Icon /> {meta.label}
                    </button>
                );
            })}
            {repeatFromBooking && (
                <button className="btn btn-ghost" onClick={onRepeat}>
                    <FaRedo /> Book Similar
                </button>
            )}
        </div>
    );
};

export default BookingActions;
