import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import { getSolutionRoute } from '../../utils/solutions/solutionData';

export default function SolutionCard({ solution }) {
    if (!solution) return null;
    const href = getSolutionRoute(solution.slug);
    return (
        <li className="solution-card__wrap">
            <Link to={href} className="solution-card">
                <div
                    className="solution-card__media"
                    style={{
                        backgroundImage: `linear-gradient(135deg, rgba(0,175,255,0.35), rgba(39,217,75,0.25)), url(${solution.bgImage})`,
                    }}
                >
                    <span className="solution-card__icon">{solution.icon}</span>
                </div>
                <div className="solution-card__body">
                    <h3 className="solution-card__title">{solution.name}</h3>
                    <p className="solution-card__desc">{solution.description}</p>
                    <span className="solution-card__more">
                        Explore <FaArrowRight aria-hidden="true" />
                    </span>
                </div>
            </Link>
        </li>
    );
}
