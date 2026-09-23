import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FaFileAlt, FaComment, FaCreditCard, FaUpload, FaCheckCircle } from 'react-icons/fa';

/**
 * Chronological event timeline. The `events` passed in should already be
 * filtered to customer-visible (the backend does this). Each event shows an
 * icon by type, a title, optional description, and timestamp.
 */
const EVENT_ICONS = {
    booking_submitted: FaCheckCircle,
    stage_changed: FaCheckCircle,
    information_requested: FaComment,
    customer_replied: FaComment,
    file_uploaded: FaUpload,
    quotation_created: FaFileAlt,
    quotation_sent: FaFileAlt,
    quotation_accepted: FaCheckCircle,
    quotation_rejected: FaComment,
    payment_requested: FaCreditCard,
    payment_received: FaCreditCard,
    work_started: FaCheckCircle,
    progress_updated: FaCheckCircle,
    customer_review_requested: FaComment,
    changes_requested: FaComment,
    booking_completed: FaCheckCircle,
    booking_cancelled: FaCheckCircle,
};

const ACTOR_LABEL = { client: 'You', staff: 'AngiSoft Team', system: 'System' };

const BookingTimeline = ({ events = [] }) => {
    const { colors } = useTheme();
    if (!events.length) {
        return <p className="booking-timeline-empty">No activity recorded yet.</p>;
    }
    const ordered = [...events].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    return (
        <ul className="booking-timeline">
            {ordered.map((ev) => {
                const Icon = EVENT_ICONS[ev.type] || FaCheckCircle;
                return (
                    <li key={ev.id} className="booking-timeline-item">
                        <span className="booking-timeline-icon" style={{ background: `${colors.primary}22`, color: colors.primary }}>
                            <Icon />
                        </span>
                        <div className="booking-timeline-body">
                            <div className="booking-timeline-head">
                                <span className="booking-timeline-title">{ev.title}</span>
                                <span className="booking-timeline-time">
                                    {new Date(ev.createdAt).toLocaleString('en-KE', {
                                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                    })}
                                </span>
                            </div>
                            {ev.description && <p className="booking-timeline-desc">{ev.description}</p>}
                            {ev.actorType && ev.actorType !== 'system' && (
                                <span className="booking-timeline-actor">{ACTOR_LABEL[ev.actorType] || ev.actorType}</span>
                            )}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
};

export default BookingTimeline;
