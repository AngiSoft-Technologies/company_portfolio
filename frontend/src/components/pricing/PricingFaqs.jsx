import { useState } from 'react';
import { FaPlus } from 'react-icons/fa';

// Accessible FAQ accordion. Each item toggles independently.
export default function PricingFaqs({ title, subtitle, faqs = [] }) {
    const [open, setOpen] = useState(() => (faqs.length ? 0 : -1));
    if (!faqs || !faqs.length) return null;

    return (
        <section className="pricing-section">
            <div className="pricing-container">
                <div className="pricing-section-head">
                    {title && <h2 className="pricing-section-title">{title}</h2>}
                    {subtitle && <p className="pricing-section-sub">{subtitle}</p>}
                </div>
                <div className="pricing-faqs__list">
                    {faqs.map((f, i) => {
                        const isOpen = open === i;
                        const btnId = `pricing-faq-q-${i}`;
                        const panelId = `pricing-faq-a-${i}`;
                        return (
                            <div
                                className={`pricing-faq${isOpen ? ' pricing-faq--open' : ''}`}
                                key={`${f.question}-${i}`}
                            >
                                <button
                                    type="button"
                                    className="pricing-faq__q"
                                    id={btnId}
                                    aria-expanded={isOpen}
                                    aria-controls={panelId}
                                    onClick={() => setOpen(isOpen ? -1 : i)}
                                >
                                    <span>{f.question}</span>
                                    <FaPlus className="pricing-faq__icon" aria-hidden="true" />
                                </button>
                                {isOpen && (
                                    <p className="pricing-faq__a" id={panelId} role="region" aria-labelledby={btnId}>
                                        {f.answer}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
