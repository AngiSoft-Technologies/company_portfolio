import { Link } from 'react-router-dom';
import { getIndustryRoute } from '../../utils/industries/industryHelpers';

/** "Other industries" strip, excluding the current one. */
export default function RelatedIndustries({ industries = [], currentSlug }) {
    const others = industries.filter((i) => i.slug !== currentSlug).slice(0, 4);
    if (!others.length) return null;

    return (
        <section className="industry-related" aria-labelledby="industry-related-heading">
            <header className="industry-section-head">
                <h2 id="industry-related-heading" className="industry-section-title">
                    Explore other industries
                </h2>
            </header>
            <ul className="industry-related__grid">
                {others.map((ind) => {
                    const Icon = ind.icon;
                    return (
                        <li key={ind.slug}>
                            <Link to={getIndustryRoute(ind.slug)} className="industry-related__card">
                                {Icon && <Icon className="industry-related__icon" />}
                                <span className="industry-related__name">{ind.name}</span>
                                <span className="industry-related__more">View →</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
