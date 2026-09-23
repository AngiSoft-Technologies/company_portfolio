import { Link } from 'react-router-dom';

export default function IndustryDetailHero({ industry }) {
    if (!industry) return null;
    const Icon = industry.icon;

    return (
        <section className="industry-detail-hero">
            <div
                className="industry-detail-hero__media"
                style={{ backgroundImage: `linear-gradient(120deg, rgba(7,20,43,0.62), rgba(7,20,43,0.86)), url(${industry.bgImage})` }}
            />
            <div className="industries-container">
                <nav className="industry-breadcrumbs" aria-label="Breadcrumb">
                    <ol className="industry-breadcrumbs__list">
                        <li className="industry-breadcrumbs__item">
                            <Link to="/" className="industry-breadcrumbs__link">Home</Link>
                        </li>
                        <li className="industry-breadcrumbs__sep" aria-hidden="true">/</li>
                        <li className="industry-breadcrumbs__item">
                            <Link to="/industries" className="industry-breadcrumbs__link">Industries</Link>
                        </li>
                        <li className="industry-breadcrumbs__sep" aria-hidden="true">/</li>
                        <li className="industry-breadcrumbs__item" aria-current="page">{industry.name}</li>
                    </ol>
                </nav>

                <div className="industry-detail-hero__inner">
                    {Icon && <Icon className="industry-detail-hero__icon" />}
                    <h1 className="industry-detail-hero__title">{industry.name}</h1>
                    {industry.description && (
                        <p className="industry-detail-hero__summary">{industry.description}</p>
                    )}
                    <div className="industry-detail-hero__actions">
                        <Link to="/book" className="btn btn--primary">Request a solution</Link>
                        <Link to="/contact" className="btn btn--ghost">Talk to us</Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
