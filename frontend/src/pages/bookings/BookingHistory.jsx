import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet } from '../../js/httpClient';
import BookingHistoryCard from '../../components/bookings/BookingHistoryCard';
import BookingHistoryFilters, { statusPredicate } from '../../components/bookings/BookingHistoryFilters';
import BookingEmptyState from '../../components/bookings/BookingEmptyState';
import BookingProgressSkeleton from '../../components/bookings/BookingProgressSkeleton';
import { getBookingLookupPath } from '../../utils/booking/bookingRoutes';
import { toast } from '../../utils/toast';

import '../../css/bookings/bookings.css';

/**
 * Customer booking history. The customer supplies the email they booked with;
 * the backend returns only bookings matching that email (no auth session
 * required for the guest history view, by design). Persisted email is
 * re-used from localStorage to spare the customer re-typing.
 */
const BookingHistory = () => {
    const { colors } = useTheme();
    const [email, setEmail] = useState(() => localStorage.getItem('angi_booking_email') || '');
    const [submittedEmail, setSubmittedEmail] = useState('');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');

    const lookup = async (addr) => {
        if (!addr) return;
        setLoading(true);
        setError(null);
        const res = await apiGet(`/bookings/my?email=${encodeURIComponent(addr)}`);
        setLoading(false);
        if (res.ok && res.data?.bookings) {
            setBookings(res.data.bookings);
            localStorage.setItem('angi_booking_email', addr);
        } else if (res.status === 404) {
            setBookings([]);
        } else {
            setError(res.data?.message || 'Could not load bookings');
            toast.error(res.data?.message || 'Could not load bookings');
        }
    };

    useEffect(() => {
        if (submittedEmail) lookup(submittedEmail);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [submittedEmail]);

    const counts = useMemo(() => ({
        all: bookings.length,
        active: bookings.filter(statusPredicate('active')).length,
        completed: bookings.filter(statusPredicate('completed')).length,
        cancelled: bookings.filter(statusPredicate('cancelled')).length,
    }), [bookings]);

    const visible = useMemo(
        () => bookings.filter(statusPredicate(filter)),
        [bookings, filter]
    );

    const submit = (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        setSubmittedEmail(email.trim());
    };

    return (
        <main className="bookings-page booking-history-page">
            <div className="bookings-container">
                <header className="booking-history-header">
                    <h1>Your Bookings</h1>
                    <p>Track the status of work you've requested with AngiSoft Technologies.</p>
                </header>

                <form className="booking-history-form" onSubmit={submit}>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter the email you booked with"
                        required
                    />
                    <button type="submit" className="btn btn-primary">View Bookings</button>
                    <Link to={getBookingLookupPath()} className="booking-history-alt">Have a reference instead?</Link>
                </form>

                {loading && <BookingProgressSkeleton />}

                {!loading && !submittedEmail && (
                    <BookingEmptyState
                        title="Find your bookings"
                        message="Enter your email above to see every request you've made with us."
                        ctaLabel="Track by reference"
                        ctaTo={getBookingLookupPath()}
                    />
                )}

                {!loading && submittedEmail && !error && bookings.length === 0 && (
                    <BookingEmptyState
                        title="No bookings found"
                        message={`We couldn't find any bookings for ${submittedEmail}. Start a new request below.`}
                    />
                )}

                {!loading && error && (
                    <BookingEmptyState title="Something went wrong" message={error} />
                )}

                {!loading && visible.length > 0 && (
                    <>
                        <BookingHistoryFilters value={filter} onChange={setFilter} counts={counts} />
                        <div className="booking-history-list">
                            {visible.map((b) => (
                                <BookingHistoryCard key={b.publicReference || b.id} booking={b} />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </main>
    );
};

export default BookingHistory;
