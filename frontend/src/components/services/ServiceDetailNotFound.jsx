import { Link } from 'react-router-dom';

/**
 * Not-found state for a missing/unpublished service.
 * No raw warning emoji or inline styles.
 */
export default function ServiceDetailNotFound() {
    return (
        <div className="service-detail service-state">
            <div className="service-container">
                <div className="service-state__panel">
                    <span className="service-state__eyebrow">Service</span>
                    <h1 className="service-state__title">Service Not Found</h1>
                    <p className="service-state__text">
                        The service you’re looking for may have been removed, renamed, or is not currently published.
                    </p>
                    <div className="service-state__actions">
                        <Link to="/services" className="btn btn--primary">Browse All Services</Link>
                        <Link to="/services" className="btn btn--ghost">Search Services</Link>
                        <Link to="/contact" className="btn btn--link">Contact AngiSoft</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
