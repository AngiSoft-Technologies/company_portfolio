import { Link } from 'react-router-dom';
import { FaRegArrowAltCircleRight, FaTag, FaRegQuestionCircle } from 'react-icons/fa';
import { resolveAssetUrl } from '../../utils/constants';
import { resolveIcon } from '../../utils/iconRegistry';
import { getServiceBookingPath, getServicePricingPath } from '../../utils/services/serviceRoutes';
import { getServiceContactPath } from '../../utils/contact/contactRoutes';
import { getServicePriceLabel } from '../../utils/services/servicePricing';

/**
 * Service detail hero: category badge, title, summary, pricing, request +
 * pricing + contact actions, and a service image or branded fallback.
 * Maintains a single h1 for the page.
 */
export default function ServiceDetailHero({ service }) {
    if (!service) return null;

    const Icon = resolveIcon(service.category?.icon);
    const priceLabel = getServicePriceLabel(service);
    const image = service.image ? resolveAssetUrl(service.image) : null;
    const bookingPath = getServiceBookingPath(service);
    const pricingPath = getServicePricingPath(service);

    return (
        <header className="service-hero">
            <div className="service-container service-hero__inner">
                <div className="service-hero__content">
                    {service.categoryName && (
                        <span className="service-hero__badge">
                            {Icon && <Icon className="service-hero__badge-icon" />}
                            {service.categoryName}
                        </span>
                    )}

                    <h1 className="service-hero__title">{service.title}</h1>

                    <p className="service-hero__summary">{service.shortDescription || service.description}</p>

                    <div className="service-hero__meta">
                        {priceLabel && (
                            <span className="service-hero__price">
                                <FaTag className="service-hero__price-icon" aria-hidden="true" />
                                {priceLabel}
                            </span>
                        )}
                        {service.targetAudience && (
                            <span className="service-hero__audience">For {service.targetAudience}</span>
                        )}
                    </div>

                    <div className="service-hero__actions">
                        <Link to={bookingPath} className="btn btn--primary service-hero__cta">
                            Request This Service
                            <FaRegArrowAltCircleRight aria-hidden="true" />
                        </Link>
                        <Link to={pricingPath} className="btn btn--ghost service-hero__cta">View Pricing</Link>
                        <Link to={getServiceContactPath(service)} className="btn btn--link service-hero__cta">
                            <FaRegQuestionCircle aria-hidden="true" />
                            Ask a Question
                        </Link>
                    </div>
                </div>

                <div className="service-hero__media">
                    {image ? (
                        <img
                            src={image}
                            alt={`${service.title} — AngiSoft service`}
                            className="service-hero__image"
                            loading="eager"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    ) : (
                        <div className="service-hero__visual" aria-hidden="true">
                            {Icon && <Icon className="service-hero__visual-icon" />}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
