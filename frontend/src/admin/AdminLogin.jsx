import React, { useState } from 'react';
import { apiPost } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import { FaLock, FaEnvelope, FaEye, FaEyeSlash, FaMoon, FaSun, FaArrowRight, FaKey } from 'react-icons/fa';

const AdminLogin = () => {
    const { colors, mode, toggleMode } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showReset, setShowReset] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetMsg, setResetMsg] = useState('');
    const [focusedField, setFocusedField] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await apiPost('/auth/login', { email, password });
            if (data.accessToken) {
                localStorage.setItem('adminToken', data.accessToken);
                window.location.href = '/admin';
            } else {
                setError('Login failed: No token received');
            }
        } catch (err) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        setResetMsg('');
        setError('');
        setLoading(true);
        try {
            await apiPost('/auth/forgot', { email: resetEmail });
            setResetMsg('If this email exists, a reset link will be sent.');
        } catch {
            setResetMsg('If this email exists, a reset link will be sent.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={{ backgroundColor: colors.background }}
        >
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div 
                    className="absolute w-[600px] h-[600px] rounded-full blur-3xl opacity-30 animate-pulse"
                    style={{ 
                        background: `radial-gradient(circle, ${colors.primary}, transparent)`,
                        top: '-20%',
                        right: '-10%'
                    }}
                />
                <div 
                    className="absolute w-[500px] h-[500px] rounded-full blur-3xl opacity-20 animate-pulse"
                    style={{ 
                        background: `radial-gradient(circle, ${colors.secondary || colors.primary}, transparent)`,
                        bottom: '-10%',
                        left: '-10%',
                        animationDelay: '2s'
                    }}
                />
                <div 
                    className="absolute w-[300px] h-[300px] rounded-full blur-3xl opacity-25 animate-pulse"
                    style={{ 
                        background: `radial-gradient(circle, #8B5CF6, transparent)`,
                        top: '50%',
                        left: '30%',
                        animationDelay: '1s'
                    }}
                />
            </div>

            {/* Theme Toggle */}
            <button
                onClick={toggleMode}
                className="absolute top-6 right-6 p-3 rounded-xl transition-all z-10"
                style={{ 
                    backgroundColor: `${colors.text}10`,
                    color: colors.text
                }}
            >
                {mode === 'dark' ? <FaSun size={20} /> : <FaMoon size={20} />}
            </button>

            {/* Login Card */}
            <div 
                className="w-full max-w-md relative z-10"
            >
                {/* Glass Card */}
                <div 
                    className="rounded-3xl p-8 md:p-10"
                    style={{
                        backgroundColor: mode === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}
                >
                    {/* Logo / Icon */}
                    <div 
                        className="w-20 h-20 mx-auto mb-8 rounded-2xl flex items-center justify-center"
                        style={{ 
                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark || '#4338CA'})`
                        }}
                    >
                        <FaLock className="text-3xl text-white" />
                    </div>

                    <h1 
                        className="text-3xl font-bold text-center mb-2"
                        style={{ color: colors.text }}
                    >
                        {showReset ? 'Reset Password' : 'Welcome Back'}
                    </h1>
                    <p 
                        className="text-center mb-8"
                        style={{ color: colors.textSecondary }}
                    >
                        {showReset 
                            ? 'Enter your email to receive a reset link'
                            : 'Sign in to access your admin dashboard'
                        }
                    </p>

                    {showReset ? (
                        <form onSubmit={handleReset} className="space-y-6">
                            {/* Email Field */}
                            <div className="relative">
                                <div 
                                    className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
                                    style={{ color: focusedField === 'resetEmail' ? colors.primary : colors.textSecondary }}
                                >
                                    <FaEnvelope />
                                </div>
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    onFocus={() => setFocusedField('resetEmail')}
                                    onBlur={() => setFocusedField(null)}
                                    className="w-full pl-12 pr-4 py-4 rounded-xl text-base outline-none transition-all"
                                    style={{
                                        backgroundColor: colors.backgroundSecondary,
                                        color: colors.text,
                                        border: `2px solid ${focusedField === 'resetEmail' ? colors.primary : colors.border}`
                                    }}
                                    required
                                />
                            </div>

                            {resetMsg && (
                                <div 
                                    className="p-4 rounded-xl text-center text-sm"
                                    style={{ 
                                        backgroundColor: `${colors.success || '#10B981'}20`,
                                        color: colors.success || '#10B981'
                                    }}
                                >
                                    {resetMsg}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 group"
                                style={{ 
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark || colors.primary})`,
                                    opacity: loading ? 0.7 : 1
                                }}
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Send Reset Link
                                        <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setShowReset(false); setResetMsg(''); setError(''); }}
                                className="w-full py-4 rounded-xl font-semibold transition-all"
                                style={{
                                    backgroundColor: colors.backgroundSecondary,
                                    color: colors.text
                                }}
                            >
                                Back to Login
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Email Field */}
                            <div className="relative">
                                <div 
                                    className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
                                    style={{ color: focusedField === 'email' ? colors.primary : colors.textSecondary }}
                                >
                                    <FaEnvelope />
                                </div>
                                <input
                                    type="email"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    className="w-full pl-12 pr-4 py-4 rounded-xl text-base outline-none transition-all"
                                    style={{
                                        backgroundColor: colors.backgroundSecondary,
                                        color: colors.text,
                                        border: `2px solid ${focusedField === 'email' ? colors.primary : colors.border}`
                                    }}
                                    required
                                />
                            </div>

                            {/* Password Field */}
                            <div className="relative">
                                <div 
                                    className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
                                    style={{ color: focusedField === 'password' ? colors.primary : colors.textSecondary }}
                                >
                                    <FaKey />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    className="w-full pl-12 pr-12 py-4 rounded-xl text-base outline-none transition-all"
                                    style={{
                                        backgroundColor: colors.backgroundSecondary,
                                        color: colors.text,
                                        border: `2px solid ${focusedField === 'password' ? colors.primary : colors.border}`
                                    }}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2"
                                    style={{ color: colors.textSecondary }}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>

                            {/* Forgot Password Link */}
                            <div className="text-right">
                                <button
                                    type="button"
                                    onClick={() => setShowReset(true)}
                                    className="text-sm font-medium hover:underline"
                                    style={{ color: colors.primary }}
                                >
                                    Forgot password?
                                </button>
                            </div>

                            {error && (
                                <div 
                                    className="p-4 rounded-xl text-center text-sm"
                                    style={{ 
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        color: '#EF4444'
                                    }}
                                >
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 group hover:shadow-lg"
                                style={{ 
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark || colors.primary})`,
                                    opacity: loading ? 0.7 : 1
                                }}
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Sign In
                                        <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <p 
                    className="text-center mt-8 text-sm"
                    style={{ color: colors.textSecondary }}
                >
                    &copy; {new Date().getFullYear()} Angera Silas. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default AdminLogin;
