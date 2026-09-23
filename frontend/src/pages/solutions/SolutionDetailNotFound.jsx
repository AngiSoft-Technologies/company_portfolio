import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';

export default function SolutionDetailNotFound() {
    return (
        <section className="solution-state">
            <div className="solution-state__panel">
                <span className="solution-state__eyebrow">Not found</span>
                <h1 className="solution-state__title">We don't have that solution page</h1>
                <p className="solution-state__text">
                    The solution you're looking for may have moved. Browse everything we offer instead.
                </p>
                <div className="solution-state__actions">
                    <Link to="/solutions" className="btn btn--primary">
                        All solutions <FaArrowRight aria-hidden="true" />
                    </Link>
                    <Link to="/contact" className="btn btn--ghost">Contact us</Link>
                </div>
            </div>
        </section>
    );
}
