export function suspiciousAuthEvent(details: { type: string; ip?: string; email?: string; count?: number }) {
    // Placeholder: integrate with Sentry/alerting system in production
    console.warn('Suspicious auth event', details);
}
