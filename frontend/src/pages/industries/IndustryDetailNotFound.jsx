import { Link } from 'react-router-dom';

export default function IndustryDetailNotFound() {
    return (
        <div className="industry-state">
            <div className="industry-state__panel">
                <span className="industry-state__eyebrow">Industry not found</span>
                <h1 className="industry-state__title">We don’t have that industry page</h1>
                <p className="industry-state__text">
                    The industry you’re looking for may have moved. Explore the full list instead.
                </p>
                <div className="industry-state__actions">
                    <Link to="/industries" className="btn btn--primary">Browse industries</Link>
                    <Link to="/contact" className="btn btn--ghost">Contact us</Link>
                </div>
            </div>
        </div>
    );
}
