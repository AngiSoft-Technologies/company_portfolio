import { useState } from 'react';

const FAQS = [
    {
        q: 'Should I book a service or just contact you?',
        a: 'Contact us when you want to ask a question, get advice or check feasibility. Book a service when you already know what you want and are ready to start — booking captures the requirements and files up front.',
    },
    {
        q: 'Can I see pricing before I book?',
        a: 'Yes. Visit the pricing page or a service detail page for indicative pricing. For custom scopes, send an enquiry and we will share a tailored quote.',
    },
    {
        q: 'Can I ask about more than one service at once?',
        a: 'Absolutely. Mention everything in your message, or send separate enquiries. We can combine related services into one engagement.',
    },
    {
        q: 'Is WhatsApp a good way to reach you?',
        a: 'Yes — WhatsApp is often the fastest way to get a quick answer. For detailed requirements, the form here keeps everything in one place.',
    },
    {
        q: 'What should I include in my enquiry?',
        a: 'A short description of what you need, your preferred outcome, any deadlines, and files or links that help. The more context, the faster we can help.',
    },
    {
        q: 'How do I follow up on an existing booking?',
        a: 'Include your booking reference (ANG-…) in the form or use the “Contact About This Booking” link from your booking progress page so we can pull up the details.',
    },
];

/**
 * FAQ accordion — collapsed by default, natural-height expansion.
 */
export default function ContactFaqs() {
    const [open, setOpen] = useState(-1);
    return (
        <section className="contact-faqs" aria-labelledby="contact-faqs-heading">
            <h2 id="contact-faqs-heading" className="contact-faqs__heading">Frequently Asked Questions</h2>
            <div className="contact-faqs__list">
                {FAQS.map((item, i) => {
                    const isOpen = open === i;
                    const btnId = `faq-btn-${i}`;
                    const panelId = `faq-panel-${i}`;
                    return (
                        <div key={i} className={`contact-faqs__item ${isOpen ? 'is-open' : ''}`}>
                            <button
                                type="button"
                                id={btnId}
                                className="contact-faqs__trigger"
                                aria-expanded={isOpen}
                                aria-controls={panelId}
                                onClick={() => setOpen(isOpen ? -1 : i)}
                            >
                                <span className="contact-faqs__q">{item.q}</span>
                                <span className="contact-faqs__chevron" aria-hidden="true">{isOpen ? '−' : '+'}</span>
                            </button>
                            <div id={panelId} role="region" aria-labelledby={btnId} className="contact-faqs__panel" hidden={!isOpen}>
                                <p>{item.a}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
