import PricingRangeCard from './PricingRangeCard';

// Estimated price floors by category. Renders nothing if no ranges.
export default function PricingRanges({ title, subtitle, ranges = [] }) {
    if (!ranges || !ranges.length) return null;

    return (
        <section className="pricing-section">
            <div className="pricing-container">
                <div className="pricing-section-head">
                    {title && <h2 className="pricing-section-title">{title}</h2>}
                    {subtitle && <p className="pricing-section-sub">{subtitle}</p>}
                </div>
                <div className="pricing-ranges__grid">
                    {ranges.map((range, i) => (
                        <PricingRangeCard range={range} key={`${range.category}-${i}`} />
                    ))}
                </div>
            </div>
        </section>
    );
}
