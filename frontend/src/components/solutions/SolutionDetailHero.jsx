import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';

export default function SolutionDetailHero({ solution }) {
    if (!solution) return null;
    return (
        <header className="solution-detail-hero">
            <div
                className="solution-detail-hero__media"
                style={{ backgroundImage: `url(${solution.bgImage})` }}
            />
            <div className="solutions-container">
                <nav className="solution-breadcrumbs" aria-label="Breadcrumb">
                    <ol className="solution-breadcrumbs__list">
                        <li>
                            <Link to="/" className="solution-breadcrumbs__link">Home</Link>
                        </li>
                        <li className="solution-breadcrumbs__sep" aria-hidden="true">/</li>
                        <li>
                            <Link to="/solutions" className="solution-breadcrumbs__link">Solutions</Link>
                        </li>
                        <li className="solution-breadcrumbs__sep" aria-hidden="true">/</li>
                        <li className="solution-breadcrumbs__item" aria-current="page">{solution.name}</li>
                    </ol>
                </nav>
                <div className="solution-detail-hero__inner">
                    <span className="solution-detail-hero__icon" aria-hidden="true">{solution.icon}</span>
                    <h1 className="solution-detail-hero__title">{solution.headline}</h1>
                    <p className="solution-detail-hero__summary">{solution.longDescription}</p>
                    <div className="solution-detail-hero__actions">
                        <Link to="/book" className="btn btn--primary">
                            Request a quote <FaArrowRight aria-hidden="true" />
                        </Link>
                        <Link to="/contact" className="btn btn--ghost">Talk to us</Link>
                    </div>
                </div>
            </div>
        </header>
    );
}
