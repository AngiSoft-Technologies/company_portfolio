import { Link } from 'react-router-dom';
import { FaCheckCircle, FaWhatsapp, FaArrowRight, FaBook, FaPhoneAlt } from 'react-icons/fa';
import { getServiceBookingPath, getProductBookingPath } from '../../utils/booking/bookingRoutes';

const WHATSAPP_URL = 'https://wa.me/254710398690';

/**
 * Success screen shown only after a real 2xx response. Context-aware primary
 * action. Does NOT auto-reset the form.
 */
export default function ContactSuccess({ result, name, entryContext }) {
    if (!result) return null;

    const reference = result.enquiry?.publicReference || result.publicReference || '—';
    const type = entryContext?.enquiryType;
    const serviceSlug = entryContext?.serviceSlug;
    const productSlug = entryContext?.productSlug;
    const bookingReference = entryContext?.bookingReference;

    let title = 'general enquiry';
    if (bookingReference) title = `your booking ${bookingReference}`;
    else if (serviceSlug) title = prettify(serviceSlug);
    else if (productSlug) title = prettify(productSlug);
    else if (type) title = type;

    let primary = {
        to: '/booking',
        label: 'Book a Service',
        icon: <FaArrowRight aria-hidden="true" />,
    };
    if (serviceSlug) {
        primary = { to: getServiceBookingPath({ slug: serviceSlug }), label: `Book This Service`, icon: <FaArrowRight aria-hidden="true" /> };
    } else if (productSlug) {
        primary = { to: getProductBookingPath({ slug: productSlug }), label: `Discuss This Product`, icon: <FaArrowRight aria-hidden="true" /> };
    } else if (bookingReference) {
        primary = { to: '/booking/progress', label: 'Return to Booking Progress', icon: <FaArrowRight aria-hidden="true" /> };
    }

    return (
        <div className="contact-success" role="status" aria-live="polite">
            <FaCheckCircle className="contact-success__icon" aria-hidden="true" />
            <h2 className="contact-success__title">Enquiry Received</h2>
            <p className="contact-success__text">
                Thanks{name ? `, ${name}` : ''}. We've received your enquiry about <strong>{title}</strong> and the
                right AngiSoft team will be in touch.
            </p>

            <div className="contact-success__reference">
                <span className="contact-success__reference-label">Reference</span>
                <span className="contact-success__reference-value">{reference}</span>
            </div>

            <ol className="contact-success__steps">
                <li>We triage your enquiry and route it to the right team.</li>
                <li>You'll get a reply to your preferred contact method.</li>
                <li>For anything urgent, reach us on WhatsApp or phone.</li>
            </ol>

            <div className="contact-success__actions">
                <Link to={primary.to} className="btn btn--primary">
                    {primary.icon} {primary.label}
                </Link>
                <Link to="/services" className="btn btn--ghost">
                    <FaBook aria-hidden="true" /> Browse Services
                </Link>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn btn--link">
                    <FaWhatsapp aria-hidden="true" /> WhatsApp AngiSoft
                </a>
                <Link to="/" className="btn btn--link">
                    <FaPhoneAlt aria-hidden="true" /> Return Home
                </Link>
            </div>
        </div>
    );
}

function prettify(slug) {
    if (!slug) return '';
    return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
