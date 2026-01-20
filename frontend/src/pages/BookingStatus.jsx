import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../js/httpClient';

const BookingStatus = ({ theme }) => {
    const { id } = useParams();
    const [email, setEmail] = useState('');
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showEmailForm, setShowEmailForm] = useState(true);
    const [paymentLoading, setPaymentLoading] = useState(false);

    useEffect(() => {
        // Check if booking ID is in URL params or localStorage
        const storedBookingId = localStorage.getItem('lastBookingId');
        const storedEmail = localStorage.getItem('lastBookingEmail');
        if (id || storedBookingId) {
            setShowEmailForm(false);
            if (storedEmail) setEmail(storedEmail);
            fetchBooking(id || storedBookingId, storedEmail);
        }
    }, [id]);

    const fetchBooking = async (bookingId, bookingEmail = '') => {
        setLoading(true);
        setError('');
        try {
            const query = bookingEmail ? `?email=${encodeURIComponent(bookingEmail)}` : '';
            const data = await apiGet(`/bookings/${bookingId}${query}`);
            setBooking(data);
        } catch (err) {
            setError(err.message || 'Failed to load booking');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSubmit = (e) => {
        e.preventDefault();
        if (!email || !id) {
            setError('Please enter your email');
            return;
        }
        fetchBooking(id, email);
        setShowEmailForm(false);
    };

    const handlePayDeposit = async () => {
        if (!booking) return;
        setPaymentLoading(true);
        try {
            // Find pending payment
            const pendingPayment = booking.payments?.find(p => p.status === 'PENDING');
            if (pendingPayment && pendingPayment.metadata?.raw?.client_secret) {
                // Redirect to payment page or open Stripe checkout
                // For now, we'll show a message
                alert('Payment integration will be implemented here. Payment Intent ID: ' + pendingPayment.providerId);
            } else {
                setError('No pending payment found');
            }
        } catch (err) {
            setError(err.message || 'Failed to initiate payment');
        } finally {
            setPaymentLoading(false);
        }
    };

    const bgColor = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900';
    const cardBg = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50';
    const statusColors = {
        SUBMITTED: 'bg-yellow-500',
        UNDER_REVIEW: 'bg-blue-500',
        ACCEPTED: 'bg-green-500',
        REJECTED: 'bg-red-500',
        TERMS_ACCEPTED: 'bg-purple-500',
        DEPOSIT_PAID: 'bg-green-600',
        IN_PROGRESS: 'bg-indigo-500',
        DELIVERED: 'bg-teal-500',
        COMPLETED: 'bg-green-700',
        CANCELLED: 'bg-gray-500'
    };

    const getStatusMessage = (status) => {
        const messages = {
            SUBMITTED: 'Your booking has been submitted and is awaiting review.',
            UNDER_REVIEW: 'Your booking is currently under review by our team.',
            ACCEPTED: 'Your booking has been accepted! Please proceed with payment.',
            REJECTED: 'Unfortunately, your booking has been rejected.',
            TERMS_ACCEPTED: 'Terms accepted. Please proceed with payment.',
            DEPOSIT_PAID: 'Deposit payment received. Work will begin soon!',
            IN_PROGRESS: 'Your project is currently in progress.',
            DELIVERED: 'Your project has been delivered!',
            COMPLETED: 'Project completed successfully!',
            CANCELLED: 'This booking has been cancelled.'
        };
        return messages[status] || 'Status unknown';
    };

    if (showEmailForm) {
        return (
            <div className={`min-h-screen p-8 ${bgColor}`}>
                <div className="max-w-2xl mx-auto">
                    <div className={`${cardBg} rounded-lg p-8`}>
                        <h1 className="text-3xl font-bold mb-6">View Booking Status</h1>
                        <p className="mb-6 text-gray-600 dark:text-gray-400">
                            Enter your email address to view your booking status
                        </p>
                        <form onSubmit={handleEmailSubmit}>
                            <div className="mb-4">
                                <label className="block mb-2 font-semibold">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`w-full p-3 border rounded-lg ${
                                        theme === 'dark' 
                                            ? 'bg-gray-700 border-gray-600 text-white' 
                                            : 'bg-white border-gray-300'
                                    }`}
                                    required
                                />
                            </div>
                            {error && (
                                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                    {error}
                                </div>
                            )}
                            <button
                                type="submit"
                                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                            >
                                View Status
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={`min-h-screen p-8 ${bgColor}`}>
                <div className="max-w-4xl mx-auto text-center py-16">
                    <p>Loading booking status...</p>
                </div>
            </div>
        );
    }

    if (error && !booking) {
        return (
            <div className={`min-h-screen p-8 ${bgColor}`}>
                <div className="max-w-4xl mx-auto">
                    <div className={`${cardBg} rounded-lg p-8 text-center`}>
                        <p className="text-red-500 mb-4">{error}</p>
                        <button
                            onClick={() => setShowEmailForm(true)}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!booking) return null;

    const pendingPayment = booking.payments?.find(p => p.status === 'PENDING');
    const needsPayment = booking.status === 'ACCEPTED' || booking.status === 'TERMS_ACCEPTED';

    return (
        <div className={`min-h-screen p-8 ${bgColor}`}>
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-8">Booking Status</h1>

                {/* Status Card */}
                <div className={`${cardBg} rounded-lg p-6 mb-6`}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">{booking.title}</h2>
                            <p className="text-sm text-gray-500">
                                Booking ID: {booking.id}
                            </p>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-white font-semibold ${
                            statusColors[booking.status] || 'bg-gray-500'
                        }`}>
                            {booking.status.replace('_', ' ')}
                        </div>
                    </div>
                    <p className="text-lg mb-4">{getStatusMessage(booking.status)}</p>
                    <p className="text-sm text-gray-500">
                        Created: {new Date(booking.createdAt).toLocaleString()}
                    </p>
                </div>

                {/* Payment Prompt */}
                {needsPayment && pendingPayment && (
                    <div className={`${cardBg} rounded-lg p-6 mb-6 border-2 border-blue-500`}>
                        <h3 className="text-xl font-bold mb-4">Payment Required</h3>
                        <div className="mb-4">
                            <p className="text-lg mb-2">
                                Deposit Amount: <span className="font-bold">
                                    {pendingPayment.currency} {pendingPayment.amount}
                                </span>
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Please complete your deposit payment to proceed with the project.
                            </p>
                        </div>
                        <button
                            onClick={handlePayDeposit}
                            disabled={paymentLoading}
                            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
                        >
                            {paymentLoading ? 'Processing...' : 'Pay Deposit Now'}
                        </button>
                    </div>
                )}

                {/* Booking Details */}
                <div className={`${cardBg} rounded-lg p-6 mb-6`}>
                    <h3 className="text-xl font-bold mb-4">Project Details</h3>
                    <div className="space-y-2">
                        <p><span className="font-semibold">Type:</span> {booking.projectType}</p>
                        <p><span className="font-semibold">Description:</span></p>
                        <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                            {booking.description}
                        </p>
                        {booking.priceEstimate && (
                            <p><span className="font-semibold">Estimated Price:</span> {booking.priceEstimate}</p>
                        )}
                    </div>
                </div>

                {/* Files */}
                {booking.files && booking.files.length > 0 && (
                    <div className={`${cardBg} rounded-lg p-6 mb-6`}>
                        <h3 className="text-xl font-bold mb-4">Uploaded Files</h3>
                        <div className="space-y-2">
                            {booking.files.map((file) => (
                                <div key={file.id} className="flex items-center justify-between p-2 bg-gray-700 dark:bg-gray-600 rounded">
                                    <span>{file.filename}</span>
                                    <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:underline"
                                    >
                                        Download
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Payment History */}
                {booking.payments && booking.payments.length > 0 && (
                    <div className={`${cardBg} rounded-lg p-6`}>
                        <h3 className="text-xl font-bold mb-4">Payment History</h3>
                        <div className="space-y-3">
                            {booking.payments.map((payment) => (
                                <div key={payment.id} className="p-4 bg-gray-700 dark:bg-gray-600 rounded">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold">
                                                {payment.currency} {payment.amount}
                                            </p>
                                            <p className="text-sm text-gray-400">
                                                {payment.provider} • {payment.status}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded ${
                                            payment.status === 'SUCCEEDED' ? 'bg-green-500' :
                                            payment.status === 'PENDING' ? 'bg-yellow-500' :
                                            payment.status === 'FAILED' ? 'bg-red-500' : 'bg-gray-500'
                                        } text-white text-sm`}>
                                            {payment.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="mt-8 flex gap-4">
                    <button
                        onClick={() => window.location.href = '/book'}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Create New Booking
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BookingStatus;

