import { Link } from 'react-router-dom';

export default function IndustryDetailError({ error, onRetry }) {
    if (error && error.message) {
        console.error('[IndustryDetail] failed to load:', error);
    }

    return (
        <div className="industry-state">
            <div className="industry-state__panel">
                <span className="industry-state__eyebrow">Something went wrong</span>
                <h1 className="industry-state__title">We couldn’t load this industry</h1>
                <p className="industry-state__text">
                    The page failed to load. Try again, or browse all industries.
                </p>
                <div className="industry-state__actions">
                    <button type="button" className="btn btn--primary" onClick={onRetry}>
                        Try again
                    </button>
                    <Link to="/industries" className="btn btn--ghost">All industries</Link>
                </div>
            </div>
        </div>
    );
}
