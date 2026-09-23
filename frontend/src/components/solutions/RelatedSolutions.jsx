import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import { getSolutionRoute } from '../../utils/solutions/solutionData';

export default function RelatedSolutions({ solutions = [], currentSlug }) {
    const related = solutions.filter((s) => s.slug !== currentSlug).slice(0, 4);
    if (!related.length) return null;
    return (
        <section className="industry-section-head" aria-labelledby="related-solutions-title">
            <h2 id="related-solutions-title" className="solution-section-title">More solutions</h2>
            <ul className="solution-related__grid">
                {related.map((s) => (
                    <li key={s.id || s.slug}>
                        <Link to={getSolutionRoute(s.slug)} className="solution-related__card">
                            <span className="solution-related__icon" aria-hidden="true">{s.icon}</span>
                            <span className="solution-related__name">{s.name}</span>
                            <span className="solution-related__more">
                                Explore <FaArrowRight aria-hidden="true" />
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
