import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollReveal, GlassmorphismCard, ParallaxSection } from '../components/modern';
import { 
    FaCheckCircle, FaClock, FaTimesCircle, FaSpinner, FaCreditCard,
    FaFileAlt, FaDownload, FaHome, FaPlus, FaArrowRight,
    FaEnvelope, FaMoneyBillWave
} from 'react-icons/fa';

const statusConfig = {
    SUBMITTED: { color: '#eab308', icon: FaClock, text: 'Submitted' },
    UNDER_REVIEW: { color: '#3b82f6', icon: FaSpinner, text: 'Under Review' },
    ACCEPTED: { color: '#22c55e', icon: FaCheckCircle, text: 'Accepted' },
    REJECTED: { color: '#ef4444', icon: FaTimesCircle, text: 'Rejected' },
    TERMS_ACCEPTED: { color: '#8b5cf6', icon: FaCheckCircle, text: 'Terms Accepted' },
    DEPOSIT_PAID: { color: '#10b981', icon: FaMoneyBillWave, text: 'Deposit Paid' },
    IN_PROGRESS: { color: '#6366f1', icon: FaSpinner, text: 'In Progress' },
    DELIVERED: { color: '#14b8a6', icon: FaCheckCircle, text: 'Delivered' },
    COMPLETED: { color: '#22c55e', icon: FaCheckCircle, text: 'Completed' },
    CANCELLED: { color: '#6b7280', icon: FaTimesCircle, text: 'Cancelled' }
};

const statusMessages = {
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

const BookingStatus = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { colors, mode } = useTheme();
    const [email, setEmail] = useState('');
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showEmailForm, setShowEmailForm] = useState(true);
    const [paymentLoading, setPaymentLoading] = useState(false);

    useEffect(() => {
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
            const pendingPayment = booking.payments?.find(p => p.status === 'PENDING');
            if (pendingPayment && pendingPayment.metadata?.raw?.client_secret) {
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

    const inputStyle = {
        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
        borderColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
        color: colors.text
    };

    // Email Form View
    if (showEmailForm) {
        return (
            <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
                <div className="max-w-lg mx-auto px-4 py-20">
                    <ScrollReveal animation="scaleUp">
                        <GlassmorphismCard className="p-8">
                            <div 
                                className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
                                style={{ backgroundColor: `${colors.primary}20` }}
                            >
                                <FaFileAlt 
                                    className="text-2xl"
                                    style={{ color: colors.primary }}
                                />
                            </div>
                            
                            <h1 
                                className="text-2xl font-bold mb-4 text-center"
                                style={{ color: colors.text }}
                            >
                                View Booking Status
                            </h1>
                            
                            <p 
                                className="text-center mb-8"
                                style={{ color: colors.textSecondary }}
                            >
                                Enter your email address to view your booking status
                            </p>
                            
                            <form onSubmit={handleEmailSubmit} className="space-y-6">
                                <div>
                                    <label 
                                        className="block mb-2 font-medium"
                                        style={{ color: colors.text }}
                                    >
                                        <FaEnvelope className="inline mr-2" style={{ color: colors.primary }} />
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full p-4 rounded-xl border-2 focus:outline-none transition-all"
                                        style={inputStyle}
                                        placeholder="Enter your email"
                                        required
                                    />
                                </div>
                                
                                {error && (
                                    <div 
                                        className="p-4 rounded-lg border"
                                        style={{ 
                                            backgroundColor: `${colors.danger || '#ef4444'}15`,
                                            borderColor: colors.danger || '#ef4444',
                                            color: colors.danger || '#ef4444'
                                        }}
                                    >
                                        {error}
                                    </div>
                                )}
                                
                                <button
                                    type="submit"
                                    className="w-full py-4 rounded-full font-semibold transition-all hover:scale-105"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                                        color: 'white'
                                    }}
                                >
                                    View Status
                                </button>
                            </form>
                        </GlassmorphismCard>
                    </ScrollReveal>
                </div>
            </div>
        );
    }

    // Loading State
    if (loading) {
        return (
            <div 
                style={{ backgroundColor: colors.background, color: colors.text }} 
                className="min-h-screen flex items-center justify-center"
            >
                <div 
                    className="w-16 h-16 border-4 rounded-full animate-spin"
                    style={{ 
                        borderColor: `${colors.primary}30`,
                        borderTopColor: colors.primary
                    }}
                />
            </div>
        );
    }

    // Error State
    if (error && !booking) {
        return (
            <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
                <div className="max-w-lg mx-auto px-4 py-20">
                    <ScrollReveal animation="scaleUp">
                        <GlassmorphismCard className="p-8 text-center">
                            <div 
                                className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
                                style={{ backgroundColor: `${colors.danger || '#ef4444'}20` }}
                            >
                                <FaTimesCircle 
                                    className="text-2xl"
                                    style={{ color: colors.danger || '#ef4444' }}
                                />
                            </div>
                            <p 
                                className="text-lg mb-6"
                                style={{ color: colors.danger || '#ef4444' }}
                            >
                                {error}
                            </p>
                            <button
                                onClick={() => setShowEmailForm(true)}
                                className="px-6 py-3 rounded-full font-semibold transition-all hover:scale-105"
                                style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                                    color: 'white'
                                }}
                            >
                                Try Again
                            </button>
                        </GlassmorphismCard>
                    </ScrollReveal>
                </div>
            </div>
        );
    }

    if (!booking) return null;

    const currentStatus = statusConfig[booking.status] || statusConfig.SUBMITTED;
    const StatusIcon = currentStatus.icon;
    const pendingPayment = booking.payments?.find(p => p.status === 'PENDING');
    const needsPayment = booking.status === 'ACCEPTED' || booking.status === 'TERMS_ACCEPTED';

    // Timeline steps
    const timelineSteps = [
        { status: 'SUBMITTED', label: 'Submitted' },
        { status: 'UNDER_REVIEW', label: 'Review' },
        { status: 'ACCEPTED', label: 'Accepted' },
        { status: 'IN_PROGRESS', label: 'In Progress' },
        { status: 'DELIVERED', label: 'Delivered' },
        { status: 'COMPLETED', label: 'Completed' },
    ];

    const currentStepIndex = timelineSteps.findIndex(s => s.status === booking.status);

    return (
        <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
            {/* Hero */}
            <ParallaxSection
                speed={0.3}
                className="relative py-16 overflow-hidden"
            >
                <div 
                    className="absolute inset-0 z-0"
                    style={{
                        background: `linear-gradient(135deg, ${currentStatus.color}20 0%, ${colors.secondary}10 100%)`
                    }}
                />

                <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
                    <ScrollReveal animation="fadeUp">
                        <h1 className="text-4xl font-bold mb-4" style={{ color: colors.text }}>
                            Booking Status
                        </h1>
                        <div 
                            className="inline-block px-4 py-2 rounded-lg"
                            style={{ backgroundColor: `${colors.primary}10` }}
                        >
                            <span style={{ color: colors.textSecondary }}>ID: </span>
                            <span 
                                className="font-mono font-bold"
                                style={{ color: colors.primary }}
                            >
                                {booking.id}
                            </span>
                        </div>
                    </ScrollReveal>
                </div>
            </ParallaxSection>

            <section className="py-12 px-4">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Status Card */}
                    <ScrollReveal animation="fadeUp">
                        <GlassmorphismCard className="p-8">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div 
                                    className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: `${currentStatus.color}20` }}
                                >
                                    <StatusIcon 
                                        className="text-3xl"
                                        style={{ color: currentStatus.color }}
                                    />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h2 
                                        className="text-2xl font-bold mb-2"
                                        style={{ color: colors.text }}
                                    >
                                        {booking.title}
                                    </h2>
                                    <div 
                                        className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-sm font-semibold mb-3"
                                        style={{ 
                                            backgroundColor: `${currentStatus.color}20`,
                                            color: currentStatus.color
                                        }}
                                    >
                                        {currentStatus.text}
                                    </div>
                                    <p style={{ color: colors.textSecondary }}>
                                        {statusMessages[booking.status]}
                                    </p>
                                </div>
                            </div>

                            {/* Progress Timeline */}
                            {booking.status !== 'REJECTED' && booking.status !== 'CANCELLED' && (
                                <div className="mt-8 pt-8 border-t" style={{ borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                                    <div className="flex items-center justify-between relative">
                                        <div 
                                            className="absolute top-4 left-0 right-0 h-1 mx-4"
                                            style={{ backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                                        >
                                            <div 
                                                className="h-full transition-all duration-500"
                                                style={{ 
                                                    width: `${Math.max(0, (currentStepIndex / (timelineSteps.length - 1)) * 100)}%`,
                                                    backgroundColor: colors.primary
                                                }}
                                            />
                                        </div>
                                        
                                        {timelineSteps.map((step, idx) => (
                                            <div key={step.status} className="relative z-10 flex flex-col items-center">
                                                <div 
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                                    style={{
                                                        backgroundColor: idx <= currentStepIndex ? colors.primary : mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                                        color: idx <= currentStepIndex ? 'white' : colors.textSecondary
                                                    }}
                                                >
                                                    {idx < currentStepIndex ? '✓' : idx + 1}
                                                </div>
                                                <span 
                                                    className="mt-2 text-xs hidden sm:block"
                                                    style={{ color: idx <= currentStepIndex ? colors.primary : colors.textSecondary }}
                                                >
                                                    {step.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </GlassmorphismCard>
                    </ScrollReveal>

                    {/* Payment Required */}
                    {needsPayment && pendingPayment && (
                        <ScrollReveal animation="fadeUp" delay={100}>
                            <div 
                                className="rounded-2xl p-6 border-2"
                                style={{ 
                                    backgroundColor: `${colors.primary}10`,
                                    borderColor: colors.primary
                                }}
                            >
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    <div 
                                        className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ backgroundColor: colors.primary }}
                                    >
                                        <FaCreditCard className="text-2xl text-white" />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h3 
                                            className="text-xl font-bold mb-2"
                                            style={{ color: colors.text }}
                                        >
                                            Payment Required
                                        </h3>
                                        <p 
                                            className="text-2xl font-bold mb-2"
                                            style={{ color: colors.primary }}
                                        >
                                            {pendingPayment.currency} {pendingPayment.amount}
                                        </p>
                                        <p style={{ color: colors.textSecondary }}>
                                            Please complete your deposit payment to proceed.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handlePayDeposit}
                                        disabled={paymentLoading}
                                        className="px-8 py-4 rounded-full font-semibold transition-all hover:scale-105 disabled:opacity-50"
                                        style={{
                                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                                            color: 'white'
                                        }}
                                    >
                                        {paymentLoading ? 'Processing...' : 'Pay Now'}
                                    </button>
                                </div>
                            </div>
                        </ScrollReveal>
                    )}

                    {/* Booking Details */}
                    <ScrollReveal animation="fadeUp" delay={150}>
                        <GlassmorphismCard className="p-6">
                            <h3 
                                className="text-lg font-bold mb-4"
                                style={{ color: colors.text }}
                            >
                                Project Details
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span style={{ color: colors.textSecondary }}>Type:</span>
                                    <span className="font-medium" style={{ color: colors.text }}>{booking.projectType}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: colors.textSecondary }}>Created:</span>
                                    <span className="font-medium" style={{ color: colors.text }}>
                                        {new Date(booking.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                {booking.priceEstimate && (
                                    <div className="flex justify-between">
                                        <span style={{ color: colors.textSecondary }}>Estimated Price:</span>
                                        <span className="font-medium" style={{ color: colors.primary }}>{booking.priceEstimate}</span>
                                    </div>
                                )}
                            </div>
                            <div 
                                className="mt-4 pt-4 border-t"
                                style={{ borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                            >
                                <p 
                                    className="text-sm font-medium mb-2"
                                    style={{ color: colors.textSecondary }}
                                >
                                    Description:
                                </p>
                                <p 
                                    className="whitespace-pre-line"
                                    style={{ color: colors.text }}
                                >
                                    {booking.description}
                                </p>
                            </div>
                        </GlassmorphismCard>
                    </ScrollReveal>

                    {/* Files */}
                    {booking.files && booking.files.length > 0 && (
                        <ScrollReveal animation="fadeUp" delay={200}>
                            <GlassmorphismCard className="p-6">
                                <h3 
                                    className="text-lg font-bold mb-4"
                                    style={{ color: colors.text }}
                                >
                                    Uploaded Files
                                </h3>
                                <div className="space-y-2">
                                    {booking.files.map((file) => (
                                        <div 
                                            key={file.id}
                                            className="flex items-center justify-between p-3 rounded-xl"
                                            style={{ backgroundColor: `${colors.primary}10` }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <FaFileAlt style={{ color: colors.primary }} />
                                                <span style={{ color: colors.text }}>{file.filename}</span>
                                            </div>
                                            <a
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105"
                                                style={{ 
                                                    backgroundColor: colors.primary,
                                                    color: 'white'
                                                }}
                                            >
                                                <FaDownload />
                                                Download
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </GlassmorphismCard>
                        </ScrollReveal>
                    )}

                    {/* Payment History */}
                    {booking.payments && booking.payments.length > 0 && (
                        <ScrollReveal animation="fadeUp" delay={250}>
                            <GlassmorphismCard className="p-6">
                                <h3 
                                    className="text-lg font-bold mb-4"
                                    style={{ color: colors.text }}
                                >
                                    Payment History
                                </h3>
                                <div className="space-y-3">
                                    {booking.payments.map((payment) => (
                                        <div 
                                            key={payment.id}
                                            className="flex items-center justify-between p-4 rounded-xl"
                                            style={{ backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
                                        >
                                            <div>
                                                <p 
                                                    className="font-bold"
                                                    style={{ color: colors.text }}
                                                >
                                                    {payment.currency} {payment.amount}
                                                </p>
                                                <p 
                                                    className="text-sm"
                                                    style={{ color: colors.textSecondary }}
                                                >
                                                    {payment.provider}
                                                </p>
                                            </div>
                                            <span 
                                                className="px-3 py-1 rounded-full text-xs font-semibold"
                                                style={{ 
                                                    backgroundColor: `${
                                                        payment.status === 'SUCCEEDED' ? '#22c55e' :
                                                        payment.status === 'PENDING' ? '#eab308' :
                                                        '#ef4444'
                                                    }20`,
                                                    color: payment.status === 'SUCCEEDED' ? '#22c55e' :
                                                           payment.status === 'PENDING' ? '#eab308' : '#ef4444'
                                                }}
                                            >
                                                {payment.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </GlassmorphismCard>
                        </ScrollReveal>
                    )}

                    {/* Actions */}
                    <ScrollReveal animation="fadeUp" delay={300}>
                        <div className="flex flex-wrap justify-center gap-4">
                            <button
                                onClick={() => navigate('/book')}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105"
                                style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                                    color: 'white'
                                }}
                            >
                                <FaPlus />
                                New Booking
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105"
                                style={{
                                    backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                    color: colors.text,
                                    border: `2px solid ${colors.primary}`
                                }}
                            >
                                <FaHome />
                                Back to Home
                            </button>
                        </div>
                    </ScrollReveal>
                </div>
            </section>
        </div>
    );
};

export default BookingStatus;
