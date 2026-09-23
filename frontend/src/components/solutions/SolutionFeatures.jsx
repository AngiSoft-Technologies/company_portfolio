import { FaCheckCircle } from 'react-icons/fa';

export default function SolutionFeatures({ solution }) {
    if (!solution?.features?.length) return null;
    return (
        <section className="industry-section-head" aria-labelledby="solution-features-title">
            <h2 id="solution-features-title" className="solution-section-title">
                What we deliver for {solution.name}
            </h2>
            <ul className="solution-capabilities__grid">
                {solution.features.map((f, i) => (
                    <li key={`${solution.slug}-feat-${i}`} className="solution-capabilities__item">
                        <span className="solution-capabilities__icon" aria-hidden="true"><FaCheckCircle /></span>
                        <span>{f}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
