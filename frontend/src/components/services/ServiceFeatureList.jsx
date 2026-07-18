import { FaCheckCircle } from 'react-icons/fa';

/**
 * "What's Included" — feature checklist built from the service's features
 * array. Renders only when features exist. We never invent features.
 */
export default function ServiceFeatureList({ features = [], title = "What's Included" }) {
    if (!Array.isArray(features) || !features.length) return null;

    return (
        <section className="service-feature-list" aria-labelledby="service-feature-list-heading">
            <header className="service-section-head">
                <h2 id="service-feature-list-heading" className="service-section-title">{title}</h2>
            </header>
            <ul className="service-feature-list__grid">
                {features.map((item, i) => (
                    <li className="service-feature-list__item" key={i}>
                        <span className="service-feature-list__check" aria-hidden="true"><FaCheckCircle /></span>
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
