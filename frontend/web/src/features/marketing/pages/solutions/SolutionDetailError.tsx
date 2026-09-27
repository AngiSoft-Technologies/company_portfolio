// @ts-nocheck
import { Link } from 'react-router-dom';
import { VisualState } from '@angisoft/ui';

export default function SolutionDetailError({ onRetry }) {
    return (
        <section className="solution-state">
            <div className="solution-state__panel">
                <VisualState variant="error" onRetry={onRetry} />
                <div className="solution-state__actions">
                    <Link to="/solutions" className="btn btn--ghost">All solutions</Link>
                </div>
            </div>
        </section>
    );
}
