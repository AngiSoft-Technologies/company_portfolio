// @ts-nocheck
import { Link } from 'react-router-dom';
import { VisualState } from '@angisoft/ui';

export default function ServiceDetailError({ error, onRetry }) {
    if (error && error.message) {
        console.error('[ServiceDetail] request failed:', error);
    }
    return (
        <div className="service-detail service-state">
            <div className="service-container">
                <div className="service-state__panel">
                    <VisualState variant="error" onRetry={onRetry} />
                    <div className="service-state__actions">
                        <Link to="/services" className="btn btn--ghost">Back to Services</Link>
                        <Link to="/contact" className="btn btn--link">Contact AngiSoft</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
