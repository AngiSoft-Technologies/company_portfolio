// @ts-nocheck
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '@/lib/httpClient';
import { getBookingLookupPath } from '@/lib/marketing/booking/bookingRoutes';
import { toast } from '@/lib/marketing/toast';

import '@/styles/marketing/bookings/bookings.css';

/**
 * Booking history now uses the same proof-of-email-control flow as guest
 * tracking. Email alone cannot enumerate bookings; a signed link is sent to
 * the address on the booking instead.
 */
const BookingHistory = () => {
    const [reference, setReference] = useState('');
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState(null);

    const submit = async (e) => {
        e.preventDefault();
        const ref = reference.trim().toUpperCase();
        const addr = email.trim();
        if (!ref || !addr) return;
        setSubmitting(true);
        setError(null);
        setSent(false);
        try {
            await apiPost(`/bookings/reference/${encodeURIComponent(ref)}/access/request`, { email: addr });
            setSent(true);
        } catch {
            const message = 'Could not send the tracking link. Check the reference and email.';
            setError(message);
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="bookings-page booking-history-page">
            <div className="bookings-container booking-lookup-inner">
                <header className="booking-lookup-header">
                    <h1>Your Booking</h1>
                    <p>Enter the reference from your confirmation email and the email you booked with. We’ll send a private link to open that booking.</p>
                </header>

                <form className="booking-lookup-form glass-card" onSubmit={submit}>
                    <label className="booking-lookup-field">
                        <span>Booking reference</span>
                        <input
                            type="text"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="ANG-2026-A1B2C3D4"
                            required
                        />
                    </label>
                    <label className="booking-lookup-field">
                        <span>Email used for the booking</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                        />
                    </label>
                    {error && <p className="booking-lookup-error">{error}</p>}
                    {sent && <p className="booking-lookup-success">If the details match, a secure tracking link is on its way.</p>}
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Sending…' : 'Email me a secure link'}
                    </button>
                    <Link to={getBookingLookupPath()} className="booking-history-alt">Need help finding your reference?</Link>
                </form>
            </div>
        </main>
    );
};

export default BookingHistory;
