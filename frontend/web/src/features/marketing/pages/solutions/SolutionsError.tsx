// @ts-nocheck
import { Link } from 'react-router-dom';
import { VisualState } from '@angisoft/ui';

export default function SolutionsError({ onRetry }) {
    return (
        <section className="solution-state">
            <div className="solution-state__panel">
                <VisualState variant="error" onRetry={onRetry} />
                <div className="solution-state__actions">
                    <Link to="/contact" className="btn btn--ghost">Contact us</Link>
                </div>
            </div>
        </section>
    );
}
