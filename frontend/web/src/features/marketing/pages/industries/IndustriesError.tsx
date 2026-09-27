// @ts-nocheck
import { Link } from 'react-router-dom';
import { VisualState } from '@angisoft/ui';

export default function IndustriesError({ error, onRetry }) {
    if (error && error.message) {
        console.error('[Industries] request failed:', error);
    }
    return (
        <div className="industry-state">
            <div className="industry-state__panel">
                <VisualState variant="error" onRetry={onRetry} />
                <div className="industry-state__actions">
                    <Link to="/contact" className="btn btn--ghost">Contact us</Link>
                </div>
            </div>
        </div>
    );
}
