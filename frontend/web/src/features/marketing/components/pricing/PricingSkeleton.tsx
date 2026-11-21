// @ts-nocheck
// Content placeholder for the Pricing page. Mirrors the real section layout.
export default function PricingSkeleton() {
    return (
        <div className="pricing-page" aria-hidden="true">
            <section className="pricing-hero">
                <div className="pricing-container">
                    <div className="pricing-hero__inner">
                        <span className="pricing-badge">Pricing</span>
                        <div style={{ height: '2.4rem', width: '60%', marginTop: '1rem', borderRadius: '0.6rem', background: 'color-mix(in srgb, var(--color-white) 8%, transparent)' }} />
                        <div style={{ height: '1rem', width: '75%', marginTop: '1rem', borderRadius: '0.5rem', background: 'color-mix(in srgb, var(--color-white) 6%, transparent)' }} />
                    </div>
                </div>
            </section>
            <section className="pricing-section">
                <div className="pricing-container">
                    <div className="pricing-ranges__grid">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="pricing-range" style={{ minHeight: '150px' }} />
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
