import { Link } from 'react-router-dom';

export default function IndustryContactCTA({ industry }) {
    if (!industry) return null;
    return (
        <section className="industry-cta">
            <div className="industry-cta__panel">
                <h2 className="industry-cta__title">Ready to build for {industry.name}?</h2>
                <p className="industry-cta__text">
                    Tell us about your operations and we’ll scope a solution that fits how your team
                    actually works.
                </p>
                <div className="industry-cta__actions">
                    <Link to="/book" className="btn btn--primary">Request a solution</Link>
                    <Link to="/contact" className="btn btn--ghost">Talk to an expert</Link>
                </div>
            </div>
        </section>
    );
}
