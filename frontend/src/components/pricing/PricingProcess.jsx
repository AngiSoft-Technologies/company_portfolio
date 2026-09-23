// "How it works" process steps.
export default function PricingProcess({ title, subtitle, steps = [] }) {
    if (!steps || !steps.length) return null;

    return (
        <section className="pricing-section">
            <div className="pricing-container">
                <div className="pricing-section-head">
                    {title && <h2 className="pricing-section-title">{title}</h2>}
                    {subtitle && <p className="pricing-section-sub">{subtitle}</p>}
                </div>
                <div className="pricing-process__steps">
                    {steps.map((s, i) => (
                        <article className="pricing-step" key={`${s.title || s.step}-${i}`}>
                            <span className="pricing-step__num">{s.step || i + 1}</span>
                            {s.title && <h3 className="pricing-step__title">{s.title}</h3>}
                            {s.description && <p className="pricing-step__desc">{s.description}</p>}
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
