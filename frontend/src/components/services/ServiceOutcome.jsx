/**
 * "What you can achieve" — outcomes the client can expect.
 * Renders only when outcome data exists. We never invent outcomes.
 */
export default function ServiceOutcome({ outcomes = [] }) {
    if (!Array.isArray(outcomes) || !outcomes.length) return null;

    return (
        <section className="service-outcome" aria-labelledby="service-outcome-heading">
            <header className="service-section-head">
                <h2 id="service-outcome-heading" className="service-section-title">What You Can Achieve</h2>
                <p className="service-section-sub">Practical results clients typically gain from this service.</p>
            </header>
            <ul className="service-outcome__grid">
                {outcomes.map((item, i) => (
                    <li className="service-outcome__card" key={i}>
                        <span className="service-outcome__bullet" aria-hidden="true" />
                        <span className="service-outcome__text">{item}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
