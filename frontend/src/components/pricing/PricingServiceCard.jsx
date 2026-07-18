import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import { getServiceBookingPath, getServiceRoute } from '../../utils/pricing/pricingRoutes';

// A single service priced from real data (priceFrom only — never invented).
export default function PricingServiceCard({ service, isHighlight, cardRef }) {
    const { slug, title, name, description, category, priceLabel, hasPrice } = service;
    const displayName = title || name || 'Service';
    const catName = category?.name || (typeof category === 'string' ? category : '');
    const bookingUrl = getServiceBookingPath(slug);
    const detailUrl = getServiceRoute(slug);

    return (
        <article
            ref={cardRef}
            className={`pricing-service-card${isHighlight ? ' pricing-service-card--highlight' : ''}`}
            id={isHighlight ? `service-${slug}` : undefined}
            aria-current={isHighlight ? 'true' : undefined}
        >
            <div>
                {catName && <span className="pricing-service-card__cat">{catName}</span>}
                <h3 className="pricing-service-card__name">{displayName}</h3>
                {description && (
                    <p className="pricing-service-card__desc">{description}</p>
                )}
            </div>

            <div>
                {hasPrice ? (
                    <div className="pricing-service-card__price">{priceLabel}</div>
                ) : (
                    <div className="pricing-service-card__price pricing-service-card__price--quote">
                        Quote on request
                    </div>
                )}
            </div>

            <div className="pricing-service-card__cta">
                <Link to={bookingUrl} aria-label={`Request a quote for ${displayName}`}>
                    Request this <FaArrowRight aria-hidden="true" />
                </Link>
                <span aria-hidden="true"> · </span>
                <Link to={detailUrl} aria-label={`View details for ${displayName}`}>
                    Details
                </Link>
            </div>
        </article>
    );
}
