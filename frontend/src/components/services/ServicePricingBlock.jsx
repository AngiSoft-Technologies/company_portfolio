import { Link } from 'react-router-dom';
import { FaRegArrowAltCircleRight, FaInfoCircle } from 'react-icons/fa';
import { getServiceBookingPath, getServicePricingPath } from '../../utils/services/serviceRoutes';
import { getServicePriceLabel } from '../../utils/services/servicePricing';

const PRICING_COPY = {
    fixed: 'Fixed price for a defined scope.',
    starting_from: 'Pricing starts from the amount below and is confirmed after we review your requirements.',
    hourly: 'Billed by the hour; final cost depends on the time invested.',
    custom_quote: 'A custom quotation is prepared after discussing your specific requirements.',
    free_consultation: 'The initial discussion is free — we’ll outline the way forward at no cost.',
};

/**
 * Pricing + engagement model block. Explains the pricing type, starting price,
 * what affects it, and links to book / full pricing. Renders only when there
 * is something meaningful to show (a price or a pricing type with copy).
 */
export default function ServicePricingBlock({ service }) {
    if (!service) return null;

    const priceLabel = getServicePriceLabel(service);
    const copy = service.pricingNote || PRICING_COPY[service.pricingType];
    const showCard = Boolean(priceLabel || copy || service.pricingFactors?.length);

    if (!showCard) return null;

    const bookingPath = getServiceBookingPath(service);
    const pricingPath = getServicePricingPath(service);

    return (
        <section className="service-pricing" aria-labelledby="service-pricing-heading">
            <div className="service-pricing__card">
                <header className="service-pricing__head">
                    <h2 id="service-pricing-heading" className="service-pricing__title">Pricing &amp; Engagement</h2>
                    {priceLabel && <p className="service-pricing__amount">{priceLabel}</p>}
                </header>

                {copy && (
                    <p className="service-pricing__note">
                        <FaInfoCircle aria-hidden="true" />
                        {copy}
                    </p>
                )}

                {Array.isArray(service.pricingFactors) && service.pricingFactors.length > 0 && (
                    <div className="service-pricing__factors">
                        <h3 className="service-pricing__factors-title">What affects the final price</h3>
                        <ul className="service-pricing__factors-list">
                            {service.pricingFactors.map((factor, i) => (
                                <li key={i}>{factor}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="service-pricing__actions">
                    <Link to={bookingPath} className="btn btn--primary">
                        Request This Service
                        <FaRegArrowAltCircleRight aria-hidden="true" />
                    </Link>
                    <Link to={pricingPath} className="btn btn--ghost">View Full Pricing</Link>
                </div>
            </div>
        </section>
    );
}
