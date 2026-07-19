import { FaTimes, FaExternalLinkAlt, FaEdit } from 'react-icons/fa';
import { enquiryLabel } from '../../utils/contact/contactSubjects';

/**
 * Shows the arrival context (service / product / booking follow-up) and lets
 * the user view details, change selection, or remove the context entirely.
 */
export default function ContactContextCard({ context, onRemove, onChange, onViewDetails }) {
    if (!context) return null;

    const hasContext = Boolean(
        context.enquiryType ||
        context.serviceSlug ||
        context.productSlug ||
        context.bookingReference
    );
    if (!hasContext) return null;

    let title = '';
    if (context.bookingReference) {
        title = `Following Up On Booking ${context.bookingReference}`;
    } else if (context.serviceSlug) {
        title = `Enquiring About ${prettify(context.serviceSlug)}`;
    } else if (context.productSlug) {
        title = `Product Enquiry ${prettify(context.productSlug)}`;
    } else {
        title = `${enquiryLabel(context.enquiryType)} Enquiry`;
    }

    return (
        <div className="contact-context-card" role="status" aria-label="Enquiry context">
            <div className="contact-context-card__head">
                <span className="contact-context-card__tag">Context</span>
            </div>
            <p className="contact-context-card__title">{title}</p>
            {context.source && (
                <p className="contact-context-card__source">From: {prettify(context.source)}</p>
            )}
            <div className="contact-context-card__actions">
                {onViewDetails && (
                    <button type="button" className="contact-context-card__btn" onClick={onViewDetails}>
                        <FaExternalLinkAlt aria-hidden="true" /> View Details
                    </button>
                )}
                {onChange && (
                    <button type="button" className="contact-context-card__btn" onClick={onChange}>
                        <FaEdit aria-hidden="true" /> Change Selection
                    </button>
                )}
                {onRemove && (
                    <button type="button" className="contact-context-card__btn contact-context-card__btn--remove" onClick={onRemove}>
                        <FaTimes aria-hidden="true" /> Remove Context
                    </button>
                )}
            </div>
        </div>
    );
}

function prettify(slug) {
    if (!slug) return '';
    return slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
