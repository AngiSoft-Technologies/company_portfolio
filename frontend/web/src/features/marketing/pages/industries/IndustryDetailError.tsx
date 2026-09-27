// @ts-nocheck
import { Link } from 'react-router-dom';
import { VisualState } from '@angisoft/ui';

export default function IndustryDetailError({ error, onRetry }) {
    if (error && error.message) {
        console.error('[IndustryDetail] request failed:', error);
    }
    return (
        <div className="industry-state">
            <div className="industry-state__panel">
                <VisualState variant="error" onRetry={onRetry} />
                <div className="industry-state__actions">
                    <Link to="/industries" className="btn btn--ghost">All industries</Link>
                </div>
            </div>
        </div>
    );
}
