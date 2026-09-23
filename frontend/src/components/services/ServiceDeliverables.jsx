import { FaBoxOpen } from 'react-icons/fa';

/**
 * "What you receive" — concrete deliverables the client gets.
 * Renders only when deliverables data exists; never shows a universal list.
 */
export default function ServiceDeliverables({ deliverables = [] }) {
    if (!Array.isArray(deliverables) || !deliverables.length) return null;

    return (
        <section className="service-deliverables" aria-labelledby="service-deliverables-heading">
            <header className="service-section-head">
                <h2 id="service-deliverables-heading" className="service-section-title">What You Receive</h2>
                <p className="service-section-sub">The tangible items delivered when the work is complete.</p>
            </header>
            <ul className="service-deliverables__grid">
                {deliverables.map((item, i) => (
                    <li className="service-deliverables__card" key={i}>
                        <span className="service-deliverables__icon" aria-hidden="true"><FaBoxOpen /></span>
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
