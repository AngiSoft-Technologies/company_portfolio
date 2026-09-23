import { Link } from 'react-router-dom';
import { FaWhatsapp, FaRegArrowAltCircleRight } from 'react-icons/fa';

const WHATSAPP_URL = 'https://wa.me/254710398690';

/**
 * Decision block for users unsure whether to contact or book.
 */
export default function ContactFinalCTA() {
    return (
        <section className="contact-final-cta" aria-labelledby="contact-final-cta-heading">
            <div className="contact-final-cta__panel">
                <h2 id="contact-final-cta-heading" className="contact-final-cta__title">
                    Not Sure Whether to Contact or Book?
                </h2>
                <p className="contact-final-cta__text">
                    If you need clarity first, ask us a question. If you already know what you want,
                    start a service request and we'll take it from there.
                </p>
                <div className="contact-final-cta__actions">
                    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn btn--primary">
                        <FaWhatsapp aria-hidden="true" /> Ask a Question
                    </a>
                    <Link to="/booking" className="btn btn--ghost">
                        Start a Service Request <FaRegArrowAltCircleRight aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
