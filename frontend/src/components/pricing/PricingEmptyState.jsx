import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';

// Shown when the API returns no pricing content and no services at all.
export default function PricingEmptyState() {
    return (
        <section className="solution-state">
            <div className="solution-state__panel">
                <span className="solution-state__eyebrow">Pricing</span>
                <h1 className="solution-state__title">Pricing guidance is on its way</h1>
                <p className="solution-state__text">
                    We are still putting together public pricing. In the meantime, tell us what you
                    need and we will scope it with you.
                </p>
                <div className="solution-state__actions">
                    <Link to="/booking" className="btn btn--primary">
                        Request a quote <FaArrowRight aria-hidden="true" />
                    </Link>
                    <Link to="/services" className="btn btn--ghost">
                        Browse services
                    </Link>
                </div>
            </div>
        </section>
    );
}
