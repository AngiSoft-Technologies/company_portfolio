import { captureMessage } from './monitoring/sentry';

export function suspiciousAuthEvent(details: { type: string; ip?: string; email?: string; count?: number }) {
    // Always log locally; forward to Sentry when configured so auth anomalies
    // surface as alerts rather than disappearing into container logs.
    console.warn('Suspicious auth event', details);
    try {
        captureMessage(`Suspicious auth event: ${details.type}`, 'warning');
    } catch {
        // Sentry not initialized — console.warn above is the fallback.
    }
}
