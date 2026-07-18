import { getServicePriceLabel } from '../../utils/services/servicePricing';

/**
 * Compact strip of the most useful facts about a service.
 * Only facts with real data are rendered. Uses service.categoryName
 * (never the category description) for the category value.
 */
export default function ServiceQuickFacts({ service }) {
    if (!service) return null;

    const facts = [];
    if (service.categoryName) {
        facts.push({ label: 'Category', value: service.categoryName });
    }
    if (service.targetAudience) {
        facts.push({ label: 'Best for', value: service.targetAudience });
    }
    const priceLabel = getServicePriceLabel(service);
    if (priceLabel) {
        facts.push({ label: service.pricingType === 'free_consultation' ? 'Consultation' : 'Pricing', value: priceLabel });
    }
    if (service.deliveryType) {
        facts.push({ label: 'Delivery', value: service.deliveryType });
    }
    if (service.timeline) {
        facts.push({ label: 'Timeline', value: service.timeline });
    }
    if (service.supportModel) {
        facts.push({ label: 'Support', value: service.supportModel });
    }

    if (!facts.length) return null;

    return (
        <section className="service-quick-facts" aria-label="Service quick facts">
            <ul className="service-quick-facts__grid">
                {facts.map((fact) => (
                    <li className="service-quick-facts__item" key={fact.label}>
                        <span className="service-quick-facts__label">{fact.label}</span>
                        <span className="service-quick-facts__value">{fact.value}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
