import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';

export default function SolutionsError({ onRetry }) {
    return (
        <section className="solution-state">
            <div className="solution-state__panel">
                <span className="solution-state__eyebrow">Something went wrong</span>
                <h1 className="solution-state__title">We couldn't load the solutions</h1>
                <p className="solution-state__text">
                    That's on us, not you. Try again, or reach out and we'll point you to the right solution.
                </p>
                <div className="solution-state__actions">
                    {onRetry && (
                        <button type="button" className="btn btn--primary" onClick={onRetry}>
                            Try again
                        </button>
                    )}
                    <Link to="/contact" className="btn btn--ghost">
                        Contact us <FaArrowRight aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
