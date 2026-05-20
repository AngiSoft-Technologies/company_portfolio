import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet } from '../../js/httpClient';
import { FaChevronDown, FaQuestionCircle, FaWhatsapp } from 'react-icons/fa';
import { IoSparkles } from 'react-icons/io5';

const FaqSection = () => {
    const { colors, mode } = useTheme();
    const isDark = mode === 'dark';
    const [faqs, setFaqs] = useState([]);
    const [activeIndex, setActiveIndex] = useState(null);
    const [activeCategory, setActiveCategory] = useState('All');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiGet('/api/faqs')
            .then(data => {
                if (Array.isArray(data)) setFaqs(data);
            })
            .catch((err) => console.error('Failed to load FAQs:', err))
            .finally(() => setLoading(false));
    }, []);

    const categories = ['All', ...new Set(faqs.map(f => f.category))];
    const filtered = activeCategory === 'All' ? faqs : faqs.filter(f => f.category === activeCategory);

    const toggle = (idx) => {
        setActiveIndex(activeIndex === idx ? null : idx);
    };

    if (loading) return null;
    if (faqs.length === 0) return null;

    return (
        <section id="faq" style={{
            position: 'relative',
            padding: '5rem 0 6rem',
            overflow: 'hidden',
            background: '#070E1A',
        }}>
            {/* Subtle grid pattern */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
                `,
                backgroundSize: '60px 60px',
                pointerEvents: 'none',
            }} />

            {/* Blue radial glow */}
            <div style={{
                position: 'absolute',
                top: '30%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '900px', height: '600px',
                background: 'radial-gradient(ellipse, rgba(8,117,255,0.08) 0%, rgba(0,175,255,0.04) 40%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Decorative sparkle top-right */}
            <IoSparkles style={{
                position: 'absolute',
                top: '3rem', right: '3rem',
                fontSize: '2.5rem',
                color: 'rgba(0,175,255,0.25)',
                filter: 'drop-shadow(0 0 12px rgba(0,175,255,0.3))',
            }} />

            <div style={{ position: 'relative', zIndex: 1, maxWidth: '1080px', margin: '0 auto', padding: '0 1.5rem' }}>

                {/* ── Header ── */}
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    {/* Badge */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.5rem 1rem', borderRadius: '999px',
                        fontSize: '0.8125rem', fontWeight: 600,
                        background: 'rgba(8,117,255,0.1)',
                        border: '1px solid rgba(8,117,255,0.2)',
                        color: colors.primary,
                        marginBottom: '1.25rem',
                    }}>
                        <FaQuestionCircle style={{ fontSize: '0.75rem' }} />
                        FAQs
                    </div>

                    <h2 style={{
                        fontFamily: "'Sora', sans-serif",
                        fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                        fontWeight: 800,
                        color: '#fff',
                        lineHeight: 1.2,
                        marginBottom: '0.75rem',
                    }}>
                        Frequently Asked{' '}
                        <span style={{
                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || colors.accent || '#00AFFF'})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>Questions</span>
                    </h2>

                    <p style={{
                        fontSize: '1rem',
                        color: 'rgba(255,255,255,0.5)',
                        maxWidth: '480px',
                        margin: '0 auto',
                        lineHeight: 1.6,
                    }}>
                        Quick answers to common questions about our services
                    </p>
                </div>

                {/* ── Category Tabs ── */}
                {categories.length > 2 && (
                    <div style={{
                        display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.5rem',
                        marginBottom: '2.5rem',
                    }}>
                        <div style={{
                            display: 'flex', flexWrap: 'wrap', gap: '0.375rem',
                            padding: '0.375rem',
                            borderRadius: '999px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            backdropFilter: 'blur(12px)',
                        }}>
                            {categories.map((cat) => {
                                const isActive = activeCategory === cat;
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => { setActiveCategory(cat); setActiveIndex(null); }}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            borderRadius: '999px',
                                            fontSize: '0.8125rem',
                                            fontWeight: 600,
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.25s ease',
                                            background: isActive
                                                ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || '#00AFFF'})`
                                                : 'transparent',
                                            color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                                            boxShadow: isActive ? `0 2px 12px ${colors.primary}30` : 'none',
                                        }}
                                    >
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── FAQ Accordion ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filtered.map((faq, idx) => {
                        const isOpen = activeIndex === idx;
                        const num = String(idx + 1).padStart(2, '0');

                        return (
                            <div
                                key={faq.id}
                                onClick={() => toggle(idx)}
                                style={{
                                    borderRadius: '1rem',
                                    overflow: 'hidden',
                                    transition: 'all 0.3s ease',
                                    background: isOpen ? 'rgba(8,117,255,0.06)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${isOpen ? 'rgba(8,117,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
                                    cursor: 'pointer',
                                }}
                            >
                                {/* Question row */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                    padding: '1.25rem 1.5rem',
                                }}>
                                    {/* Number */}
                                    <span style={{
                                        fontFamily: "'Sora', sans-serif",
                                        fontSize: '1.25rem',
                                        fontWeight: 800,
                                        color: isOpen ? colors.primary : 'rgba(255,255,255,0.2)',
                                        minWidth: '2rem',
                                        transition: 'color 0.3s ease',
                                    }}>
                                        {num}
                                    </span>

                                    {/* Question text */}
                                    <span style={{
                                        flex: 1,
                                        fontFamily: "'Sora', sans-serif",
                                        fontSize: '0.9375rem',
                                        fontWeight: 600,
                                        color: isOpen ? '#fff' : 'rgba(255,255,255,0.85)',
                                        lineHeight: 1.4,
                                    }}>
                                        {faq.question}
                                    </span>

                                    {/* Chevron */}
                                    <FaChevronDown style={{
                                        flexShrink: 0,
                                        fontSize: '0.75rem',
                                        color: isOpen ? colors.primary : 'rgba(255,255,255,0.3)',
                                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.3s ease, color 0.3s ease',
                                    }} />
                                </div>

                                {/* Answer */}
                                <div style={{
                                    maxHeight: isOpen ? '300px' : '0px',
                                    opacity: isOpen ? 1 : 0,
                                    overflow: 'hidden',
                                    transition: 'max-height 0.35s ease, opacity 0.3s ease',
                                }}>
                                    <div style={{
                                        padding: '0 1.5rem 1.25rem',
                                        paddingLeft: 'calc(1.5rem + 2rem + 1rem)', // align with question text
                                        fontSize: '0.875rem',
                                        lineHeight: 1.7,
                                        color: 'rgba(255,255,255,0.5)',
                                    }}>
                                        {faq.answer}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── CTA ── */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '3.5rem',
                }}>
                    <p style={{
                        fontSize: '0.9375rem',
                        color: 'rgba(255,255,255,0.45)',
                        marginBottom: '1.25rem',
                    }}>
                        Still have questions?
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {/* WhatsApp */}
                        <a
                            href="https://wa.me/254710398690"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '0.75rem',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: '#fff',
                                textDecoration: 'none',
                                background: '#25D366',
                                boxShadow: '0 4px 16px rgba(37,211,102,0.25)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,211,102,0.35)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,211,102,0.25)'; }}
                        >
                            <FaWhatsapp /> WhatsApp Us
                        </a>

                        {/* Email */}
                        <a
                            href="mailto:support@angisoft.co.ke"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '0.75rem',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: '#fff',
                                textDecoration: 'none',
                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || '#00AFFF'})`,
                                boxShadow: `0 4px 16px ${colors.primary}25`,
                                transition: 'transform 0.2s, box-shadow 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${colors.primary}35`; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 16px ${colors.primary}25`; }}
                        >
                            Email Support
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FaqSection;
