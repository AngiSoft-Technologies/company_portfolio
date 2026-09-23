import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet, apiPost } from '../../js/httpClient';
import { API_BASE_URL } from '../../utils/constants';
import { getBookingLookupPath } from '../../utils/booking/bookingRoutes';
import { getBookingFollowUpContactPath } from '../../utils/contact/contactRoutes';
import { toast } from '../../utils/toast';

import BookingProgressHero from '../../components/bookings/BookingProgressHero';
import BookingStageProgress from '../../components/bookings/BookingStageProgress';
import BookingSummaryCard from '../../components/bookings/BookingSummaryCard';
import BookingTimeline from '../../components/bookings/BookingTimeline';
import BookingQuotationCard from '../../components/bookings/BookingQuotationCard';
import BookingPaymentCard from '../../components/bookings/BookingPaymentCard';
import BookingCommunication from '../../components/bookings/BookingCommunication';
import BookingAttachments from '../../components/bookings/BookingAttachments';
import BookingActions from '../../components/bookings/BookingActions';
import BookingProgressSkeleton from '../../components/bookings/BookingProgressSkeleton';
import BookingAccessError from '../../components/bookings/BookingAccessError';

import '../../css/bookings/bookings.css';

/**
 * Customer-facing progress page for a single booking, keyed by publicReference.
 * Access is granted via the secure tracking token (present in the redirect
 * URL after submission) or, if absent, by the customer's email lookup. The
 * backend decides visibility; this page only renders what it receives.
 */
const BookingProgress = () => {
    const { reference } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { colors } = useTheme();

    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [accessError, setAccessError] = useState(false);
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);

    const token = searchParams.get('token') || '';
    const email = searchParams.get('email') || '';

    const load = async () => {
        setLoading(true);
        setAccessError(false);
        const query = new URLSearchParams();
        if (token) query.set('token', token);
        if (email) query.set('email', email);
        const qs = query.toString();
        const res = await apiGet(`/bookings/reference/${reference}${qs ? `?${qs}` : ''}`);
        if (res.ok && res.data?.booking) {
            setBooking(res.data.booking);
        } else if (res.status === 401 || res.status === 403 || res.status === 404) {
            setAccessError(true);
        } else {
            setAccessError(true);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (reference) load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reference, token, email]);

    const refetch = () => load();

    // 'act' = one of the server-allowed actions (or a message/file/action op)
    const runAction = async (action, payload) => {
        setBusy(true);
        const res = await apiPost(`/bookings/reference/${reference}/actions`, { action, ...payload }, token || null);
        setBusy(false);
        if (res.ok && res.data?.booking) {
            setBooking(res.data.booking);
            toast.success(res.data.message || 'Updated');
        } else {
            toast.error(res.data?.message || 'Action failed');
        }
    };

    const handleAction = (action) => {
        if (action === 'CANCEL_BOOKING') return runAction('CANCEL_BOOKING');
        if (action === 'ACCEPT_QUOTATION') return runAction('ACCEPT_QUOTATION');
        if (action === 'DECLINE_QUOTATION') return runAction('DECLINE_QUOTATION');
        if (action === 'CONFIRM_DELIVERY') return runAction('CONFIRM_DELIVERY');
        if (action === 'REQUEST_CHANGES') {
            const note = window.prompt('Describe the changes you need:');
            if (note) return runAction('REQUEST_CHANGES', { message: note });
        }
        return undefined;
    };

    const handleRepeat = () => {
        const q = new URLSearchParams();
        if (booking?.serviceSlug) q.set('service', booking.serviceSlug);
        if (booking?.packageSlug) q.set('package', booking.packageSlug);
        q.set('source', 'repeat-booking');
        q.set('repeat', booking.publicReference);
        navigate(`/booking?${q.toString()}`);
    };

    const handleUpload = async (files) => {
        if (!files?.length) return;
        setUploading(true);
        const form = new FormData();
        Array.from(files).forEach((f) => form.append('files', f));
        try {
            const res = await fetch(`${API_BASE_URL}/bookings/reference/${reference}/files`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                body: form,
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.booking) {
                setBooking(data.booking);
                toast.success('Files added');
            } else {
                toast.error(data.message || 'Upload failed');
            }
        } finally {
            setUploading(false);
            refetch();
        }
    };

    const handleSend = async (text) => {
        setSending(true);
        const res = await apiPost(`/bookings/reference/${reference}/messages`, { text }, token || null);
        setSending(false);
        if (res.ok && res.data?.booking) setBooking(res.data.booking);
        else if (res.ok && res.data?.event) setBooking((b) => ({ ...b, events: [...(b.events || []), res.data.event] }));
        else toast.error('Message failed');
    };

    const availableActions = useMemo(() => booking?.availableActions || [], [booking]);

    if (loading) return <BookingProgressSkeleton />;
    if (accessError) return <BookingAccessError />;

    return (
        <main className="bookings-page booking-progress-page">
            <div className="bookings-container">
                <BookingProgressHero booking={booking} />

                <section className="booking-progress-stepper-wrap">
                    <BookingStageProgress stage={booking.currentStage} stageProgress={booking.stageProgress} />
                </section>

                <div className="booking-progress-grid">
                    <div className="booking-progress-main">
                        <BookingSummaryCard booking={booking} />
                        <BookingCommunication
                            messages={booking.messages}
                            booking={booking}
                            onSend={handleSend}
                            sending={sending}
                        />
                        {(booking.availableActions || []).includes('ADD_FILE') && (
                            <div className="booking-section">
                                <h3 className="booking-section-title">Attachments</h3>
                                <BookingAttachments
                                    files={booking.files || []}
                                    onUpload={handleUpload}
                                    uploading={uploading}
                                />
                            </div>
                        )}
                    </div>

                    <aside className="booking-progress-side">
                        <BookingQuotationCard
                            booking={booking}
                            availableActions={availableActions}
                            onAccept={() => handleAction('ACCEPT_QUOTATION')}
                            onDecline={() => handleAction('DECLINE_QUOTATION')}
                            reacting={busy}
                        />
                        <BookingPaymentCard booking={booking} />
                        <div className="booking-section">
                            <h3 className="booking-section-title">Activity</h3>
                            <BookingTimeline events={booking.events || []} />
                        </div>
                        <BookingActions
                            availableActions={availableActions}
                            repeatFromBooking={booking.publicReference}
                            onAction={handleAction}
                            onRepeat={handleRepeat}
                            busy={busy}
                        />
                        <Link to={getBookingLookupPath()} className="booking-progress-back">
                            Track another booking
                        </Link>
                        <Link to={getBookingFollowUpContactPath(booking)} className="booking-progress-contact">
                            Contact About This Booking
                        </Link>
                    </aside>
                </div>
            </div>
        </main>
    );
};

export default BookingProgress;
