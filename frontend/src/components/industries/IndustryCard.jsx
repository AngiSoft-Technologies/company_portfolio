import { Link } from 'react-router-dom';
import { getIndustryRoute } from '../../utils/industries/industryHelpers';

/** Compact industry card used in the /industries index grid. */
export default function IndustryCard({ industry }) {
    if (!industry) return null;
    const Icon = industry.icon;
    const route = getIndustryRoute(industry.slug);

    return (
        <Link to={route} className="industry-card" aria-label={`Explore ${industry.name}`}>
            <div
                className="industry-card__media"
                style={{ backgroundImage: `linear-gradient(160deg, rgba(7,20,43,0.55), rgba(7,20,43,0.78)), url(${industry.bgImage})` }}
            >
                {Icon && <Icon className="industry-card__icon" />}
            </div>
            <div className="industry-card__body">
                <h3 className="industry-card__title">{industry.name}</h3>
                {industry.description && (
                    <p className="industry-card__desc">{industry.description}</p>
                )}
                <span className="industry-card__more">
                    Explore solutions
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
            </div>
        </Link>
    );
}
