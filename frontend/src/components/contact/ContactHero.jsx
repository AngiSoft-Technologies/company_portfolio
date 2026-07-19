import { Link } from 'react-router-dom';
import { FaWhatsapp, FaRegCommentDots } from 'react-icons/fa';

const WHATSAPP_URL = 'https://wa.me/254710398690';

/**
 * Compact hero. Primary CTA scrolls to the workspace; secondary opens WhatsApp.
 */
export default function ContactHero() {
    return (
        <section className="contact-hero" aria-labelledby="contact-hero-heading">
            <div className="contact-hero__inner">
                <span className="contact-hero__badge">
                    <FaRegCommentDots aria-hidden="true" />
                    Contact AngiSoft
                </span>
                <h1 id="contact-hero-heading" className="contact-hero__title">
                    Let's Talk About <span className="contact-hero__hl">What You Need</span>
                </h1>
                <p className="contact-hero__subtitle">
                    Tell us about your project, question or booking and the right AngiSoft team will
                    get back to you. It only takes a minute.
                </p>
                <div className="contact-hero__actions">
                    <a href="#contact-workspace" className="btn btn--primary contact-hero__cta">
                        Send an Enquiry
                    </a>
                    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn btn--ghost contact-hero__cta">
                        <FaWhatsapp aria-hidden="true" />
                        WhatsApp AngiSoft
                    </a>
                    <Link to="/booking" className="btn btn--link contact-hero__cta">
                        Book a Service
                    </Link>
                </div>
            </div>
        </section>
    );
}
