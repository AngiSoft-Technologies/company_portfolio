import * as Sentry from '@sentry/node';

export function initSentry() {
    const dsn = process.env.SENTRY_DSN || '';
    if (!dsn) {
        console.warn('SENTRY_DSN not configured');
        return;
    }
    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: 0.1,
    });
    console.log('Sentry initialized');
}

export function captureException(err: any) {
    Sentry.captureException(err);
}

export function captureMessage(msg: string, level: 'info' | 'warning' | 'error' = 'info') {
    Sentry.captureMessage(msg, level);
}
