// @ts-nocheck
import { Link } from 'react-router-dom';
import { VisualState } from '@angisoft/ui';

export default function PricingError({ onRetry }) {
    return (
        <section className="solution-state">
            <div className="solution-state__panel">
                <VisualState variant="error" onRetry={onRetry} />
                <div className="solution-state__actions">
                    <Link to="/services" className="btn btn--ghost">All services</Link>
                </div>
            </div>
        </section>
    );
}
