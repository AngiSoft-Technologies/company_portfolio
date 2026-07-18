import { Link } from 'react-router-dom';

/**
 * Friendly error state. We never surface raw technical errors to the user;
 * the actual error is logged separately (passed via `error`).
 */
export default function ServiceDetailError({ error, onRetry }) {
    if (error && error.message) {
        console.error('[ServiceDetail] failed to load:', error);
    }

    return (
        <div className="service-detail service-state">
            <div className="service-container">
                <div className="service-state__panel">
                    <h1 className="service-state__title">We Couldn’t Load This Service</h1>
                    <p className="service-state__text">
                        The service information could not be loaded right now. Please try again — if the problem
                        continues, reach out and we’ll help.
                    </p>
                    <div className="service-state__actions">
                        {onRetry && (
                            <button type="button" className="btn btn--primary" onClick={onRetry}>
                                Try Again
                            </button>
                        )}
                        <Link to="/services" className="btn btn--ghost">Back to Services</Link>
                        <Link to="/contact" className="btn btn--link">Contact AngiSoft</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
