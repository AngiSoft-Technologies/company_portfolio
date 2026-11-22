// @ts-nocheck
// Structured pricing packages (PricingPackage records via /v1/pricing-packages).
const PERIOD_LABELS = {
    one_time: 'one-time',
    monthly: '/ month',
    yearly: '/ year',
    project: 'per project',
    custom: 'custom',
};

export default function PricingPackages({ title = 'Packages', subtitle, packages = [] }) {
    if (!packages || !packages.length) return null;

    return (
        <section className="pricing-section">
            <div className="pricing-container">
                <div className="pricing-section-head">
                    {title && <h2 className="pricing-section-title">{title}</h2>}
                    {subtitle && <p className="pricing-section-sub">{subtitle}</p>}
                </div>
                <div className="pricing-packages__grid">
                    {packages.map((p) => (
                        <article
                            className={`pricing-package${p.highlighted ? ' pricing-package--highlighted' : ''}`}
                            key={p.slug || p.name}
                        >
                            {p.highlighted && <span className="pricing-package__badge">Popular</span>}
                            {p.serviceTitle && <p className="pricing-package__service">{p.serviceTitle}</p>}
                            <h3 className="pricing-package__name">{p.name}</h3>
                            {p.priceLabel && (
                                <p className="pricing-package__price">
                                    {p.priceLabel}
                                    {p.billingPeriod && PERIOD_LABELS[p.billingPeriod] && (
                                        <span className="pricing-package__period"> {PERIOD_LABELS[p.billingPeriod]}</span>
                                    )}
                                </p>
                            )}
                            {p.description && <p className="pricing-package__desc">{p.description}</p>}
                            {p.features?.length > 0 && (
                                <ul className="pricing-package__features">
                                    {p.features.map((f, i) => <li key={i}>{f}</li>)}
                                </ul>
                            )}
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
