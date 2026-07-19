import { useState } from 'react';
import { FaRegClock, FaUserCheck, FaCommentDots, FaPaperPlane } from 'react-icons/fa';

const STEPS = [
    { icon: <FaPaperPlane aria-hidden="true" />, title: 'We receive your enquiry', text: 'It lands in our queue with your chosen response method and any booking or service context.' },
    { icon: <FaUserCheck aria-hidden="true" />, title: 'Routed to the right team', text: 'We match your enquiry type so the person best placed to help picks it up.' },
    { icon: <FaRegClock aria-hidden="true" />, title: 'You get a reply', text: 'We respond via your preferred channel. For anything urgent, WhatsApp is fastest.' },
    { icon: <FaCommentDots aria-hidden="true" />, title: 'Next steps together', text: 'We confirm requirements, answer questions and outline how to proceed — booking or otherwise.' },
];

/**
 * "What happens after you contact us?" — natural accordion (no fixed max-height).
 */
export default function ContactResponseGuide() {
    const [open, setOpen] = useState(0);
    return (
        <section className="contact-guide" aria-labelledby="contact-guide-heading">
            <h2 id="contact-guide-heading" className="contact-guide__heading">What Happens After You Contact Us?</h2>
            <ol className="contact-guide__list">
                {STEPS.map((step, i) => {
                    const isOpen = open === i;
                    const panelId = `guide-panel-${i}`;
                    const btnId = `guide-btn-${i}`;
                    return (
                        <li key={i} className={`contact-guide__item ${isOpen ? 'is-open' : ''}`}>
                            <button
                                type="button"
                                id={btnId}
                                className="contact-guide__trigger"
                                aria-expanded={isOpen}
                                aria-controls={panelId}
                                onClick={() => setOpen(isOpen ? -1 : i)}
                            >
                                <span className="contact-guide__icon" aria-hidden="true">{step.icon}</span>
                                <span className="contact-guide__step-title">{step.title}</span>
                                <span className="contact-guide__chevron" aria-hidden="true">{isOpen ? '−' : '+'}</span>
                            </button>
                            <div id={panelId} role="region" aria-labelledby={btnId} className="contact-guide__panel" hidden={!isOpen}>
                                <p>{step.text}</p>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
