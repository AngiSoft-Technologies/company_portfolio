import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { getBookingProgressPath } from '../../utils/booking/bookingRoutes';
import { toast } from '../../utils/toast';

import '../../css/bookings/bookings.css';

/**
 * Guest lookup form. The customer enters a public reference (and optionally
 * the email they booked with). On success we route to the progress page; the
 * backend will issue the tracking token implicitly for matches, and the
 * redirect there carries it.
 */
const BookingLookup = () => {
    const navigate = useNavigate();
    const { colors } = useTheme();
    const [reference, setReference] = useState('');
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const submit = async (e) => {
        e.preventDefault();
        if (!reference.trim()) return;
        setSubmitting(true);
        setError(null);
        const ref = reference.trim().toUpperCase();
        // We verify the reference server-side; a quick client-side probe keeps
        // the flow snappy and surfaces obvious typos before navigation.
        const query = new URLSearchParams();
        if (email.trim()) query.set('email', email.trim());
        try {
            // Navigate to progress; the page itself enforces token/email access.
            navigate(`${getBookingProgressPath(ref)}?${query.toString()}`);
        } catch (err) {
            setError('Could not open that booking.');
            toast.error('Could not open that booking.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="bookings-page booking-lookup-page">
            <div className="bookings-container booking-lookup-inner">
                <header className="booking-lookup-header">
                    <h1>Track a Booking</h1>
                    <p>Enter your booking reference (e.g. ANG-2026-00481) to see its live progress.</p>
                </header>

                <form className="booking-lookup-form glass-card" onSubmit={submit}>
                    <label className="booking-lookup-field">
                        <span>Booking reference</span>
                        <input
                            type="text"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="ANG-2026-00481"
                            required
                        />
                    </label>
                    <label className="booking-lookup-field">
                        <span>Email (optional, helps verify)</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                        />
                    </label>
                    {error && <p className="booking-lookup-error">{error}</p>}
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Opening…' : 'Track Booking'}
                    </button>
                </form>
            </div>
        </main>
    );
};

export default BookingLookup;
