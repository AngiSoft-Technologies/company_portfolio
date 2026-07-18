import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet } from '../../js/httpClient';
import { FaChevronDown, FaQuestionCircle, FaWhatsapp } from 'react-icons/fa';
import { IoSparkles } from 'react-icons/io5';
import '../../css/FaqSection.css';

const FaqSection = () => {
    const { colors } = useTheme();
    const [faqs, setFaqs] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [activeCategory, setActiveCategory] = useState('All');
    const [visibleCount, setVisibleCount] = useState(8);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        apiGet('/api/faqs')
            .then((response) => {
                if (!active) return;
                // Support direct arrays, { data: [] }, and { faqs: [] }.
                const records = Array.isArray(response)
                    ? response
                    : response?.data || response?.faqs || [];

                setFaqs(records.filter(Boolean));
            })
            .catch((err) => console.error('Failed to load FAQs:', err))
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const categories = useMemo(
        () => [
            'All',
            ...Array.from(
                new Set(faqs.map((faq) => faq.category).filter(Boolean))
            ),
        ],
        [faqs]
    );

    const filtered = useMemo(
        () =>
            activeCategory === 'All'
                ? faqs
                : faqs.filter((faq) => faq.category === activeCategory),
        [faqs, activeCategory]
    );

    const toggle = (faqId) => {
        setActiveId((currentId) => (currentId === faqId ? null : faqId));
    };

    const selectCategory = (cat) => {
        setActiveCategory(cat);
        setActiveId(null);
        setVisibleCount(8);
    };

    const visibleFaqs = useMemo(
        () => filtered.slice(0, visibleCount),
        [filtered, visibleCount]
    );

    if (loading) return null;
    if (faqs.length === 0) return null;

    return (
        <section
            id="faq"
            className="angi-faq-section"
            style={{
                '--faq-primary': colors?.primary || '#0875FF',
                '--faq-secondary':
                    colors?.secondary || colors?.accent || '#00AFFF',
            }}
        >
            <IoSparkles className="angi-faq-sparkle" aria-hidden="true" />

            <div className="angi-faq-container">
                {/* ── Header ── */}
                <header className="angi-faq-header">
                    <div className="angi-faq-badge">
                        <FaQuestionCircle className="angi-faq-badge-icon" aria-hidden="true" />
                        FAQs
                    </div>

                    <h2 className="angi-faq-heading">
                        Frequently Asked{' '}
                        <span className="angi-faq-heading-gradient">Questions</span>
                    </h2>

                    <p className="angi-faq-subtitle">
                        Quick answers to common questions about our services
                    </p>
                </header>

                {/* ── Category Tabs ── */}
                {categories.length > 2 && (
                    <div className="angi-faq-category-scroll">
                        <div className="angi-faq-categories" role="tablist" aria-label="FAQ categories">
                            {categories.map((cat) => {
                                const isActive = activeCategory === cat;
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        className={`angi-faq-category${isActive ? ' is-active' : ''}`}
                                        onClick={() => selectCategory(cat)}
                                    >
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── FAQ Accordion ── */}
                <div className="angi-faq-list">
                    {visibleFaqs.map((faq, index) => {
                        const faqId = faq.id || `${faq.category || 'faq'}-${index}`;
                        const isOpen = activeId === faqId;
                        const answerId = `faq-answer-${faqId}`;
                        const num = String(index + 1).padStart(2, '0');

                        return (
                            <article
                                key={faqId}
                                className={`angi-faq-item${isOpen ? ' is-open' : ''}`}
                            >
                                <button
                                    type="button"
                                    className="angi-faq-question"
                                    onClick={() => toggle(faqId)}
                                    aria-expanded={isOpen}
                                    aria-controls={answerId}
                                >
                                    <span className="angi-faq-number" aria-hidden="true">
                                        {num}
                                    </span>

                                    <span className="angi-faq-question-text">
                                        {faq.question}
                                    </span>

                                    <FaChevronDown className="angi-faq-chevron" aria-hidden="true" />
                                </button>

                                <div
                                    id={answerId}
                                    className="angi-faq-answer-region"
                                    role="region"
                                    aria-hidden={!isOpen}
                                >
                                    <div className="angi-faq-answer-inner">
                                        <div className="angi-faq-answer">
                                            {faq.answer}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>

                {/* ── Show More / Fewer ── */}
                {filtered.length > 8 && (
                    <button
                        type="button"
                        className="angi-faq-show-more"
                        onClick={() =>
                            setVisibleCount((c) =>
                                c >= filtered.length ? 8 : filtered.length
                            )
                        }
                    >
                        {visibleCount >= filtered.length
                            ? 'Show Fewer Questions'
                            : 'Show More Questions'}
                    </button>
                )}

                {/* ── CTA ── */}
                <div className="angi-faq-cta">
                    <p className="angi-faq-cta-text">Still have questions?</p>
                    <div className="angi-faq-cta-links">
                        <a
                            className="angi-faq-cta-whatsapp"
                            href="https://wa.me/254710398690"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <FaWhatsapp aria-hidden="true" /> WhatsApp Us
                        </a>

                        <a
                            className="angi-faq-cta-email"
                            href="mailto:info@angisoft.co.ke"
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
