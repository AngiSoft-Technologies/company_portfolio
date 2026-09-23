import { Link } from 'react-router-dom';
import { FaRegArrowAltCircleRight, FaWhatsapp, FaRegListAlt } from 'react-icons/fa';
import { getServiceBookingPath, getServicePricingPath, getServiceWhatsappLink } from '../../utils/services/serviceRoutes';

/**
 * Final service-specific CTA. Receives the current service so the request,
 * pricing and WhatsApp links never lose context.
 */
export default function ServiceContactCTA({ service }) {
    if (!service) return null;

    const bookingPath = getServiceBookingPath(service);
    const pricingPath = getServicePricingPath(service);
    const whatsapp = getServiceWhatsappLink(service);

    return (
        <section className="service-contact-cta" aria-labelledby="service-cta-heading">
            <div className="service-contact-cta__panel">
                <h2 id="service-cta-heading" className="service-contact-cta__title">
                    Ready to Request {service.title}?
                </h2>
                <p className="service-contact-cta__text">
                    Share your requirements, files, expected outcome and preferred timeline. AngiSoft will review
                    the request and respond with the next steps.
                </p>
                <div className="service-contact-cta__actions">
                    <Link to={bookingPath} className="btn btn--primary">
                        Request This Service
                        <FaRegArrowAltCircleRight aria-hidden="true" />
                    </Link>
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
                        <FaWhatsapp aria-hidden="true" />
                        WhatsApp AngiSoft
                    </a>
                    <Link to={pricingPath} className="btn btn--link">
                        <FaRegListAlt aria-hidden="true" />
                        View Pricing
                    </Link>
                </div>
            </div>
        </section>
    );
}
