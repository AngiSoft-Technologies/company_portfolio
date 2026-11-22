// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { apiPost, safeGet } from '@/lib/httpClient';
import { API_BASE_URL } from '@/lib/marketing/constants';
import { getBookingLookupPath } from '@/lib/marketing/booking/bookingRoutes';
import { getBookingFollowUpContactPath } from '@/lib/marketing/contact/contactRoutes';
import { toast } from '@/lib/marketing/toast';

import BookingProgressHero from '@/features/bookings/components/bookings/BookingProgressHero';
import BookingStageProgress from '@/features/bookings/components/bookings/BookingStageProgress';
import BookingSummaryCard from '@/features/bookings/components/bookings/BookingSummaryCard';
import BookingTimeline from '@/features/bookings/components/bookings/BookingTimeline';
import BookingQuotationCard from '@/features/bookings/components/bookings/BookingQuotationCard';
import BookingPaymentCard from '@/features/bookings/components/bookings/BookingPaymentCard';
import BookingDepositPanel, {
    clearDepositCheckout,
    readDepositCheckout,
} from '@/features/bookings/components/bookings/BookingDepositPanel';
import BookingCommunication from '@/features/bookings/components/bookings/BookingCommunication';
import BookingAttachments from '@/features/bookings/components/bookings/BookingAttachments';
import BookingActions from '@/features/bookings/components/bookings/BookingActions';
import BookingProgressSkeleton from '@/features/bookings/components/bookings/BookingProgressSkeleton';
import BookingAccessError from '@/features/bookings/components/bookings/BookingAccessError';

import '@/styles/marketing/bookings/bookings.css';

/**
 * Customer-facing progress page for a single booking, keyed by publicReference.
 * Access requires the secure tracking token returned after submission or sent
 * by the signed access-link email. Email alone is never accepted.
 */
const BookingProgress = () => {
    const { reference } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [accessError, setAccessError] = useState(false);
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);
    const paypalCaptureStarted = useRef(false);

    // PayPal reuses `token` for the approved order id. On the deposit return
    // the booking authorization is carried in `access`; never let the order id
    // be mistaken for a booking tracking token.
    const paypalFlag = searchParams.get('paypal');
    const accessParam = searchParams.get('access') || '';
    const token = accessParam || (paypalFlag ? '' : searchParams.get('token') || '');

    const load = async () => {
        if (!token) {
            setAccessError(true);
            setLoading(false);
            return;
        }
        setLoading(true);
        setAccessError(false);
        const res = await safeGet(`/bookings/reference/${reference}?token=${encodeURIComponent(token)}`, token);
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
    }, [reference, token]);

    const refetch = () => load();
    const authQuery = token ? `?token=${encodeURIComponent(token)}` : '';

    // Buyer return from PayPal. PayPal appends `?token=<orderId>` to the return
    // URL; the signed booking authorization is carried in `access`. We pair the
    // order with the reference saved before redirecting and ask the server to
    // capture. The webhook remains authoritative and is idempotent.
    useEffect(() => {
        if (!reference || !paypalFlag || paypalCaptureStarted.current) return;
        paypalCaptureStarted.current = true;
        const canonicalUrl = () => {
            const path = window.location.pathname;
            return token ? `${path}?token=${encodeURIComponent(token)}` : path;
        };
        const clearUrl = () => window.history.replaceState({}, '', canonicalUrl());

        if (paypalFlag === 'cancel') {
            clearDepositCheckout(reference);
            toast.info('PayPal checkout was cancelled. No charge was made.');
            clearUrl();
            return;
        }
        if (paypalFlag !== 'success') return;

        const orderId = searchParams.get('token') || '';
        const pending = readDepositCheckout(reference);
        if (!orderId || !token || !pending?.reference || (pending.orderId && pending.orderId !== orderId)) {
            toast.error('We could not match this PayPal deposit to a booking. Contact support if you were charged.');
            clearDepositCheckout(reference);
            clearUrl();
            return;
        }

        void (async () => {
            try {
                const result: any = await apiPost(
                    '/payments/paypal/capture',
                    { orderId, reference: pending.reference },
                    token,
                );
                const confirmed = ['COMPLETED', 'SUCCEEDED'].includes(String(result?.status));
                if (confirmed) {
                    toast.success(`Deposit confirmed${result?.payerEmail ? ` for ${result.payerEmail}` : ''}.`);
                } else {
                    toast.error(result?.error || 'PayPal has not confirmed the deposit yet. It will update automatically.');
                }
            } catch {
                // apiPost already surfaces the provider error to the user.
            } finally {
                clearDepositCheckout(reference);
                clearUrl();
                refetch();
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reference]);

    // 'act' = one of the server-allowed actions (or a message/file/action op)
    const runAction = async (action, payload) => {
        setBusy(true);
        try {
            const data: any = await apiPost(
                `/bookings/reference/${reference}/actions${authQuery}`,
                { action, ...payload },
                token || null,
            );
            if (data?.id || data?.publicReference) {
                setBooking(data);
                toast.success(data.message || 'Updated');
            } else {
                toast.error(data?.error || 'Action failed');
            }
        } catch (err) {
            toast.error((err as any)?.message || 'Action failed');
        } finally {
            setBusy(false);
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
            const res = await fetch(`${API_BASE_URL}/bookings/reference/${reference}/files${authQuery}`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                body: form,
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.files) {
                toast.success('Files added');
            } else {
                toast.error(data.error || data.message || 'Upload failed');
            }
        } finally {
            setUploading(false);
            refetch();
        }
    };

    const handleSend = async (text) => {
        setSending(true);
        try {
            const data: any = await apiPost(
                `/bookings/reference/${reference}/messages${authQuery}`,
                { message: text },
                token || null,
            );
            if (data?.ok) refetch();
            else toast.error(data?.error || 'Message failed');
        } catch (err) {
            toast.error((err as any)?.message || 'Message failed');
        } finally {
            setSending(false);
        }
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
                        <BookingDepositPanel
                            booking={booking}
                            token={token}
                            onPaid={refetch}
                        />
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
