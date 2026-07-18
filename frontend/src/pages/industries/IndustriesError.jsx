import { Link } from 'react-router-dom';

export default function IndustriesError({ error, onRetry }) {
    if (error && error.message) {
        console.error('[Industries] failed to load:', error);
    }

    return (
        <div className="industry-state">
            <div className="industry-state__panel">
                <span className="industry-state__eyebrow">Something went wrong</span>
                <h1 className="industry-state__title">We couldn’t load the industries</h1>
                <p className="industry-state__text">
                    Please try again — if the problem continues, reach out and we’ll point you to the
                    right solution.
                </p>
                <div className="industry-state__actions">
                    <button type="button" className="btn btn--primary" onClick={onRetry}>
                        Try again
                    </button>
                    <Link to="/contact" className="btn btn--ghost">Contact us</Link>
                </div>
            </div>
        </div>
    );
}
