import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet } from '../../js/httpClient';
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaHome } from 'react-icons/fa';

const NewsletterConfirm = () => {
    const { colors, mode } = useTheme();
    const isDark = mode === 'dark';
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState('loading'); // loading | success | error
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid confirmation link. No token provided.');
            return;
        }

        apiGet(`/api/newsletter/confirm?token=${encodeURIComponent(token)}`)
            .then((data) => {
                setStatus('success');
                setMessage(data?.message || 'Your subscription has been confirmed! You\'ll now receive our updates.');
            })
            .catch((err) => {
                setStatus('error');
                setMessage(err?.response?.data?.error || err?.message || 'Failed to confirm subscription. The link may have expired.');
            });
    }, [token]);

    return (
        <div
            className="min-h-screen flex items-center justify-center px-6 py-20"
            style={{
                background: isDark
                    ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'
                    : 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)'
            }}
        >
            <div
                className="max-w-md w-full text-center p-10 rounded-3xl"
                style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                    boxShadow: '0 8px 40px rgba(0,0,0,0.1)',
                }}
            >
                {status === 'loading' && (
                    <>
                        <FaSpinner className="text-5xl mx-auto mb-4 animate-spin" style={{ color: colors.primary }} />
                        <h1 className="text-2xl font-bold" style={{ color: isDark ? '#fff' : '#1e293b' }}>
                            Confirming...
                        </h1>
                        <p className="mt-2" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                            Verifying your subscription
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <FaCheckCircle className="text-5xl mx-auto mb-4 text-green-500" />
                        <h1 className="text-2xl font-bold" style={{ color: isDark ? '#fff' : '#1e293b' }}>
                            Subscription Confirmed!
                        </h1>
                        <p className="mt-3" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
                            {message}
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <FaTimesCircle className="text-5xl mx-auto mb-4 text-red-500" />
                        <h1 className="text-2xl font-bold" style={{ color: isDark ? '#fff' : '#1e293b' }}>
                            Confirmation Failed
                        </h1>
                        <p className="mt-3" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
                            {message}
                        </p>
                    </>
                )}

                <Link
                    to="/"
                    className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:-translate-y-0.5"
                    style={{
                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || colors.primary})`,
                        boxShadow: `0 4px 16px ${colors.primary}30`,
                    }}
                >
                    <FaHome />
                    Back to Home
                </Link>
            </div>
        </div>
    );
};

export default NewsletterConfirm;
