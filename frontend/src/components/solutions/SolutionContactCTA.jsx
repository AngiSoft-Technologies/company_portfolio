import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';

export default function SolutionContactCTA({ solution }) {
    if (!solution) return null;
    return (
        <section className="solution-cta" aria-labelledby="solution-cta-title">
            <div className="solution-cta__panel">
                <h2 id="solution-cta-title" className="solution-cta__title">
                    Ready to build {solution.name.toLowerCase().includes('systems') || solution.name.toLowerCase().includes('management')
                        ? `your ${solution.name}`
                        : `for ${solution.name}`}?
                </h2>
                <p className="solution-cta__text">
                    Tell us about your workflow and we'll map a solution to it — with a clear quote and a realistic plan.
                </p>
                <div className="solution-cta__actions">
                    <Link to="/book" className="btn btn--primary">
                        Request a quote <FaArrowRight aria-hidden="true" />
                    </Link>
                    <Link to="/contact" className="btn btn--ghost">Talk to us</Link>
                </div>
            </div>
        </section>
    );
}
