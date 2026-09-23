import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';

// Hero for the Pricing page. Purely data-driven from the site_pricing content.
export default function PricingHero({ content }) {
    const badge = content?.badge || 'Pricing';
    const title = content?.title || 'Transparent, practical pricing';
    const subtitle =
        content?.subtitle ||
        'Real guidance for the work your business already does — from quick builds to ongoing systems. No invented numbers: what you see reflects how we scope projects.';

    const quoteUrl = content?.cta?.primaryButton?.url || '/booking';
    const quoteLabel = content?.cta?.primaryButton?.label || 'Request a quote';
    const secondaryUrl = content?.cta?.secondaryButton?.url || '/services';
    const secondaryLabel = content?.cta?.secondaryButton?.label || 'Explore services';

    return (
        <section className="pricing-hero">
            <div className="pricing-container">
                <div className="pricing-hero__inner">
                    <span className="pricing-badge">{badge}</span>
                    <h1 className="pricing-hero__title">
                        {title}
                    </h1>
                    <p className="pricing-hero__subtitle">{subtitle}</p>
                    <div className="pricing-hero__actions">
                        <Link to={quoteUrl} className="btn btn--primary">
                            {quoteLabel} <FaArrowRight aria-hidden="true" />
                        </Link>
                        <Link to={secondaryUrl} className="btn btn--ghost">
                            {secondaryLabel}
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
