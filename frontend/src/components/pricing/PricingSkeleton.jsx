// Loading skeleton for the Pricing page. Mirrors the real section layout.
export default function PricingSkeleton() {
    return (
        <div className="pricing-page" aria-hidden="true">
            <section className="pricing-hero">
                <div className="pricing-container">
                    <div className="pricing-hero__inner">
                        <span className="pricing-badge">Pricing</span>
                        <div style={{ height: '2.4rem', width: '60%', marginTop: '1rem', borderRadius: '0.6rem', background: 'rgba(255,255,255,0.08)' }} />
                        <div style={{ height: '1rem', width: '75%', marginTop: '1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.06)' }} />
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
