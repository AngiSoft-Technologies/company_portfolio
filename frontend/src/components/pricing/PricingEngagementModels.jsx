// Engagement models (fixed scope / flexible hours / monthly retainer).
export default function PricingEngagementModels({ title, subtitle, models = [] }) {
    if (!models || !models.length) return null;

    return (
        <section className="pricing-section">
            <div className="pricing-container">
                <div className="pricing-section-head">
                    {title && <h2 className="pricing-section-title">{title}</h2>}
                    {subtitle && <p className="pricing-section-sub">{subtitle}</p>}
                </div>
                <div className="pricing-engagement__grid">
                    {models.map((m, i) => (
                        <article className="pricing-engagement" key={`${m.title}-${i}`}>
                            {m.title && <h3 className="pricing-engagement__title">{m.title}</h3>}
                            {m.description && <p className="pricing-engagement__desc">{m.description}</p>}
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
