import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet } from '../../js/httpClient';
import ScrollReveal from '../modern/ScrollReveal';
import SectionBadge from '../common/SectionBadge';
import { FaChevronDown, FaQuestionCircle } from 'react-icons/fa';

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
            .catch(() => {})
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
        <section id="faq" className="py-20 md:py-28 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0" style={{
                background: isDark
                    ? 'linear-gradient(180deg, rgba(15,23,42,1) 0%, rgba(30,41,59,1) 100%)'
                    : 'linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(241,245,249,1) 100%)'
            }} />

            <div className="relative max-w-4xl mx-auto px-6">
                {/* Header */}
                <ScrollReveal animation="fadeUp">
                    <div className="text-center mb-14">
                        <SectionBadge icon={FaQuestionCircle} text="FAQs" />
                        <h2 className="text-3xl md:text-4xl font-bold mt-4" style={{ color: isDark ? '#fff' : '#1e293b' }}>
                            Frequently Asked <span style={{ color: colors.primary }}>Questions</span>
                        </h2>
                        <p className="mt-3 text-lg" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
                            Quick answers to common questions about our services
                        </p>
                    </div>
                </ScrollReveal>

                {/* Category Tabs */}
                {categories.length > 2 && (
                    <ScrollReveal animation="fadeUp" delay={100}>
                        <div className="flex flex-wrap justify-center gap-2 mb-10">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => { setActiveCategory(cat); setActiveIndex(null); }}
                                    className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                                    style={{
                                        background: activeCategory === cat
                                            ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || colors.primary})`
                                            : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                        color: activeCategory === cat ? '#fff' : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                                        border: `1px solid ${activeCategory === cat ? 'transparent' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                                    }}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </ScrollReveal>
                )}

                {/* Accordion */}
                <div className="space-y-3">
                    {filtered.map((faq, idx) => (
                        <ScrollReveal key={faq.id} animation="fadeUp" delay={100 + idx * 50}>
                            <div
                                className="rounded-2xl overflow-hidden transition-all"
                                style={{
                                    background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                                    boxShadow: activeIndex === idx
                                        ? `0 4px 24px ${colors.primary}15`
                                        : '0 1px 3px rgba(0,0,0,0.04)',
                                }}
                            >
                                <button
                                    onClick={() => toggle(idx)}
                                    className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left"
                                >
                                    <span
                                        className="font-semibold text-base"
                                        style={{ color: activeIndex === idx ? colors.primary : isDark ? '#fff' : '#1e293b' }}
                                    >
                                        {faq.question}
                                    </span>
                                    <FaChevronDown
                                        className="flex-shrink-0 transition-transform duration-300"
                                        style={{
                                            transform: activeIndex === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                                            color: activeIndex === idx ? colors.primary : isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
                                        }}
                                    />
                                </button>
                                <div
                                    className="overflow-hidden transition-all duration-300"
                                    style={{
                                        maxHeight: activeIndex === idx ? '500px' : '0px',
                                        opacity: activeIndex === idx ? 1 : 0,
                                    }}
                                >
                                    <div
                                        className="px-6 pb-5 text-sm leading-relaxed"
                                        style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                                    >
                                        {faq.answer}
                                    </div>
                                </div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>

                {/* CTA */}
                <ScrollReveal animation="fadeUp" delay={300}>
                    <div className="mt-12 text-center">
                        <p className="mb-4" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                            Still have questions?
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <a
                                href="https://wa.me/254710398690"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-6 py-3 rounded-xl font-semibold text-white transition-all hover:-translate-y-0.5"
                                style={{
                                    background: '#25D366',
                                    boxShadow: '0 4px 16px rgba(37,211,102,0.3)',
                                }}
                            >
                                💬 WhatsApp Us
                            </a>
                            <a
                                href="mailto:support@angisoft.co.ke"
                                className="px-6 py-3 rounded-xl font-semibold transition-all hover:-translate-y-0.5"
                                style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || colors.primary})`,
                                    color: '#fff',
                                    boxShadow: `0 4px 16px ${colors.primary}30`,
                                }}
                            >
                                📧 Email Support
                            </a>
                        </div>
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
};

export default FaqSection;
