import { useState } from 'react';

/**
 * Compact service-specific FAQ accordion.
 * Renders only when FAQ data exists. All answers start collapsed and use
 * natural-height expansion (no fixed max-height).
 */
export default function ServiceFaqs({ faqs = [] }) {
    const [open, setOpen] = useState(-1);
    if (!Array.isArray(faqs) || !faqs.length) return null;

    return (
        <section className="service-faqs" aria-labelledby="service-faqs-heading">
            <header className="service-section-head">
                <h2 id="service-faqs-heading" className="service-section-title">Common Questions</h2>
            </header>
            <div className="service-faqs__list">
                {faqs.map((faq, i) => {
                    const isOpen = open === i;
                    const btnId = `faq-btn-${i}`;
                    const panelId = `faq-panel-${i}`;
                    return (
                        <div className={`service-faqs__item${isOpen ? ' is-open' : ''}`} key={i}>
                            <h3 className="service-faqs__qtitle">
                                <button
                                    type="button"
                                    id={btnId}
                                    className="service-faqs__trigger"
                                    aria-expanded={isOpen}
                                    aria-controls={panelId}
                                    onClick={() => setOpen(isOpen ? -1 : i)}
                                >
                                    <span>{faq.question}</span>
                                    <span className="service-faqs__icon" aria-hidden="true">{isOpen ? '−' : '+'}</span>
                                </button>
                            </h3>
                            <div
                                id={panelId}
                                role="region"
                                aria-labelledby={btnId}
                                className="service-faqs__panel"
                                hidden={!isOpen}
                            >
                                <p className="service-faqs__answer">{faq.answer}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
