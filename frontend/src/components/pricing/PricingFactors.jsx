// "What shapes your quote" — the pricing factors from site_pricing.
export default function PricingFactors({ title, subtitle, factors = [] }) {
    if (!factors || !factors.length) return null;

    return (
        <section className="pricing-section">
            <div className="pricing-container">
                <div className="pricing-section-head">
                    {title && <h2 className="pricing-section-title">{title}</h2>}
                    {subtitle && <p className="pricing-section-sub">{subtitle}</p>}
                </div>
                <div className="pricing-factors__grid">
                    {factors.map((f, i) => (
                        <article className="pricing-factor" key={`${f.title}-${i}`}>
                            <h3 className="pricing-factor__title">{f.title}</h3>
                            {f.description && <p className="pricing-factor__desc">{f.description}</p>}
                            {f.examples && f.examples.length > 0 && (
                                <ul className="pricing-factor__examples">
                                    {f.examples.map((ex, j) => (
                                        <li key={`${ex}-${j}`}>{ex}</li>
                                    ))}
                                </ul>
                            )}
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
