import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FaPaperPlane } from 'react-icons/fa';

/**
 * Customer <-> team message thread + composer. Posts to
 * POST /bookings/:publicReference/messages. Messages from server are appended
 * to the thread; the composer is disabled while sending.
 */
const BookingCommunication = ({ messages = [], booking, onSend, sending }) => {
    const { colors } = useTheme();
    const [draft, setDraft] = useState('');

    const submit = (e) => {
        e.preventDefault();
        if (!draft.trim() || sending) return;
        onSend(draft.trim());
        setDraft('');
    };

    const thread = messages.length
        ? messages
        : (booking?.events || []).filter((ev) =>
              ['information_requested', 'customer_replied', 'customer_review_requested', 'changes_requested'].includes(ev.type)
          );

    return (
        <div className="booking-communication">
            <div className="booking-communication-thread">
                {thread.length === 0 && <p className="booking-communication-empty">No messages yet.</p>}
                {thread.map((m) => (
                    <div key={m.id || m.createdAt} className={`booking-msg booking-msg-${m.actorType === 'client' ? 'out' : 'in'}`}>
                        <p className="booking-msg-text">{m.text || m.description}</p>
                        <span className="booking-msg-meta">
                            {m.actorType === 'client' ? 'You' : 'AngiSoft Team'} ·{' '}
                            {new Date(m.createdAt).toLocaleString('en-KE', { hour: '2-digit', minute: '2-digit', day: 'short' })}
                        </span>
                    </div>
                ))}
            </div>
            <form className="booking-communication-form" onSubmit={submit}>
                <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a message…"
                    disabled={sending}
                />
                <button type="submit" className="btn btn-primary" disabled={sending || !draft.trim()}>
                    <FaPaperPlane /> Send
                </button>
            </form>
        </div>
    );
};

export default BookingCommunication;
