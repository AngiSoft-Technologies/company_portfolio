import React, { useState, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ScrollReveal } from '../modern';
import { API_BASE_URL } from '../../utils/constants';
import {
  FaEnvelope,
  FaArrowRight,
  FaCheckCircle,
  FaExclamationCircle,
  FaPaperPlane,
  FaBolt,
  FaNewspaper
} from 'react-icons/fa';

const NewsletterSection = () => {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('loading');

    try {
      const response = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'You have been subscribed successfully!');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }

    // Clear status after 5 seconds
    setTimeout(() => {
      setStatus('idle');
      setMessage('');
    }, 5000);
  };

  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      {/* Gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${colors.brandNavy} 0%, ${colors.primary} 50%, ${colors.secondary} 100%)`
        }}
      />

      {/* Decorative floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-72 h-72 rounded-full blur-3xl animate-pulse"
          style={{
            top: '10%',
            left: '5%',
            backgroundColor: `${colors.primary}30`,
            animationDuration: '4s'
          }}
        />
        <div
          className="absolute w-96 h-96 rounded-full blur-3xl animate-pulse"
          style={{
            bottom: '5%',
            right: '10%',
            backgroundColor: `${colors.secondary}20`,
            animationDuration: '6s',
            animationDelay: '2s'
          }}
        />
        <div
          className="absolute w-64 h-64 rounded-full blur-3xl animate-pulse"
          style={{
            top: '40%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: `${colors.accent}15`,
            animationDuration: '8s',
            animationDelay: '1s'
          }}
        />
        <div
          className="absolute w-48 h-48 rounded-full blur-2xl animate-pulse"
          style={{
            top: '60%',
            left: '15%',
            backgroundColor: `${colors.success}10`,
            animationDuration: '5s',
            animationDelay: '3s'
          }}
        />
        <div
          className="absolute w-56 h-56 rounded-full blur-2xl animate-pulse"
          style={{
            top: '20%',
            right: '20%',
            backgroundColor: `${colors.primary}15`,
            animationDuration: '7s',
            animationDelay: '1.5s'
          }}
        />

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full animate-ping"
            style={{
              top: `${15 + i * 15}%`,
              left: `${10 + i * 15}%`,
              backgroundColor: 'rgba(255,255,255,0.3)',
              animationDuration: `${3 + i * 0.5}s`,
              animationDelay: `${i * 0.4}s`
            }}
          />
        ))}

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <ScrollReveal animation="fadeUp">
          {/* Icon badge */}
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-8"
            style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            <FaNewspaper className="text-white text-2xl" />
          </div>

          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4"
          >
            Stay Updated
          </h2>
          <p
            className="text-lg md:text-xl mb-10 max-w-2xl mx-auto"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            Get the latest product updates, tech insights, and exclusive tips delivered straight to your inbox. No spam, just value.
          </p>
        </ScrollReveal>

        <ScrollReveal animation="fadeUp" delay={200}>
          {/* Email form */}
          <form
            onSubmit={handleSubmit}
            className="relative max-w-xl mx-auto"
          >
            <div
              className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-0 p-2 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
              }}
            >
              <div className="flex items-center flex-1 gap-3 px-4">
                <FaEnvelope
                  className="flex-shrink-0"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                />
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-1 bg-transparent text-white placeholder-white/40 outline-none text-base py-3"
                  disabled={status === 'loading'}
                  aria-label="Email address"
                  style={{
                    fontFamily: "'Inter', sans-serif"
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="group flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark || '#0029CC'} 100%)`,
                  boxShadow: `0 4px 20px ${colors.primary}60`
                }}
              >
                {status === 'loading' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Subscribing...</span>
                  </>
                ) : (
                  <>
                    <FaPaperPlane className="group-hover:rotate-12 transition-transform" />
                    <span>Subscribe</span>
                    <FaArrowRight className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Status messages */}
          {status === 'success' && (
            <div
              className="flex items-center justify-center gap-2 mt-4 text-sm font-medium"
              style={{ color: colors.success }}
            >
              <FaCheckCircle />
              <span>{message}</span>
            </div>
          )}
          {status === 'error' && (
            <div
              className="flex items-center justify-center gap-2 mt-4 text-sm font-medium"
              style={{ color: colors.error }}
            >
              <FaExclamationCircle />
              <span>{message}</span>
            </div>
          )}

          {/* Trust indicators */}
          <div
            className="flex flex-wrap items-center justify-center gap-6 mt-8"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <div className="flex items-center gap-2 text-sm">
              <FaBolt style={{ color: colors.success }} />
              <span>Weekly insights</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FaCheckCircle style={{ color: colors.success }} />
              <span>No spam, ever</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FaEnvelope style={{ color: colors.success }} />
              <span>Unsubscribe anytime</span>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default NewsletterSection;
