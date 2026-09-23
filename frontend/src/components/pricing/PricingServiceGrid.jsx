import { useEffect, useRef } from 'react';
import PricingServiceCard from './PricingServiceCard';
import PricingCategoryFilter from './PricingCategoryFilter';

// The data-driven service grid. Wires filtering, the ?service= deep-link
// highlight, and scrolls the highlighted card into view.
export default function PricingServiceGrid({
    title,
    subtitle,
    services = [],
    categories = [],
    activeCategories = [],
    deepLinkSlug = '',
    onToggleCategory,
    onClearAll,
}) {
    const highlightRef = useRef(null);

    useEffect(() => {
        if (deepLinkSlug && highlightRef.current) {
            highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [deepLinkSlug]);

    return (
        <section className="pricing-section">
            <div className="pricing-container">
                <div className="pricing-section-head">
                    {title && <h2 className="pricing-section-title">{title}</h2>}
                    {subtitle && <p className="pricing-section-sub">{subtitle}</p>}
                </div>

                <PricingCategoryFilter
                    categories={categories}
                    active={activeCategories}
                    onToggle={onToggleCategory}
                    onClear={onClearAll}
                />

                {services.length === 0 ? (
                    <p className="pricing-section-sub">
                        No services match this filter yet.{' '}
                        <button type="button" className="btn btn--ghost" onClick={onClearAll}>
                            View all services
                        </button>
                    </p>
                ) : (
                    <div className="pricing-service-grid">
                        {services.map((service) => {
                            const isHi = Boolean(deepLinkSlug) && service.slug === deepLinkSlug;
                            return (
                                <PricingServiceCard
                                    key={service.slug || service.id}
                                    service={service}
                                    isHighlight={isHi}
                                    cardRef={isHi ? highlightRef : null}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
