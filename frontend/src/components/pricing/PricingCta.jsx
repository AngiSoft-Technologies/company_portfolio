import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';

// Closing call-to-action. Falls back gracefully if content.cta is absent.
export default function PricingCta({ cta }) {
    if (!cta) return null;

    const title = cta.title || 'Tell us what you need';
    const subtitle = cta.subtitle || 'Send the brief and we will come back with a scoped, honest quote.';
    const primary = cta.primaryButton || { url: '/booking', label: 'Request a quote' };
    const secondary = cta.secondaryButton || { url: '/contact', label: 'Talk to us' };

    return (
        <section className="pricing-section">
            <div className="pricing-container">
                <div className="pricing-card pricing-cta" style={{ textAlign: 'center' }}>
                    <h2 className="pricing-section-title">{title}</h2>
                    {subtitle && <p className="pricing-section-sub" style={{ margin: '0.6rem auto 0' }}>{subtitle}</p>}
                    <div className="pricing-hero__actions" style={{ justifyContent: 'center' }}>
                        <Link to={primary.url} className="btn btn--primary">
                            {primary.label} <FaArrowRight aria-hidden="true" />
                        </Link>
                        {secondary.url && (
                            <Link to={secondary.url} className="btn btn--ghost">
                                {secondary.label}
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
