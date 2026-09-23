import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';

export default function SolutionDetailError({ error, onRetry }) {
    return (
        <section className="solution-state">
            <div className="solution-state__panel">
                <span className="solution-state__eyebrow">Something went wrong</span>
                <h1 className="solution-state__title">We couldn't load this solution</h1>
                <p className="solution-state__text">
                    {error?.message
                        ? `Error: ${error.message}`
                        : "That's on us, not you. Try again, or browse all solutions."}
                </p>
                <div className="solution-state__actions">
                    {onRetry && (
                        <button type="button" className="btn btn--primary" onClick={onRetry}>
                            Try again
                        </button>
                    )}
                    <Link to="/solutions" className="btn btn--ghost">
                        All solutions <FaArrowRight aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
