/**
 * Bounded, in-memory slow-request store (Phase 5.4 observability).
 *
 * The structured `slow_request` log line remains the durable signal in Fly
 * logs. This store is only a short-lived ring buffer so an authenticated admin
 * can see recent latency samples without an external APM. Nothing here is
 * persisted, shared between processes, or written to the database.
 *
 * Safety rule: callers may pass raw request context (`url`, `headers`, `body`,
 * `query`) but only fixed, sanitized scalar fields are ever retained. Query
 * strings, bodies, headers, emails, phone numbers and token-like path segments
 * are stripped before a sample is allocated.
 */

/** Hard upper bound; old samples are evicted rather than growing without limit. */
export const SLOW_REQUEST_STORE_CAP = 250;
const REDACTED = '[redacted]';
const MAX_PATH_LENGTH = 512;

export interface SlowRequestSample {
    id: string;
    recordedAt: string;
    method: string;
    path: string;
    status: number;
    durationMs: number;
    thresholdMs: number;
}

/**
 * Deliberately permissive input type: it is safe to hand over a raw Express
 * request's fields because every value is sanitized or discarded below.
 */
export interface SlowRequestInput {
    method?: unknown;
    url?: unknown;
    path?: unknown;
    status?: unknown;
    durationMs?: unknown;
    thresholdMs?: unknown;
    headers?: unknown;
    body?: unknown;
    query?: unknown;
}

export interface SlowRequestSnapshot {
    samples: SlowRequestSample[];
    cap: number;
    totalRecorded: number;
    dropped: number;
    generatedAt: string;
}

const samples: SlowRequestSample[] = [];
let sequence = 0;
let totalRecorded = 0;
let dropped = 0;

function isTokenLike(segment: string): boolean {
    return /^eyJ[A-Za-z0-9_-]{8,}$/.test(segment) // JWT
        || /^(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9_-]+$/i.test(segment) // provider keys
        || /^[a-f0-9]{16,}$/i.test(segment) // hashes / opaque hex ids
        || /^[A-Za-z0-9_-]{32,}$/.test(segment) // long opaque tokens
        || /^Bearer[.:]/i.test(segment);
}

/**
 * Keep only a route-shaped path. Query strings and fragments are dropped
 * entirely; credentialed path segments, emails and long numeric identifiers
 * are replaced. Idempotent, so it can be applied at the log and store boundary.
 */
export function redactRequestPath(input: unknown): string {
    const raw = typeof input === 'string' ? input : '';
    const withoutQuery = (raw.split(/[?#]/, 1)[0] || '').slice(0, MAX_PATH_LENGTH);
    let decoded = withoutQuery;
    try {
        decoded = decodeURIComponent(withoutQuery);
    } catch {
        // Malformed percent-encoding: keep the raw path and let the segment
        // filters below do the redaction.
    }

    const safe = decoded.split('/').map((segment) => {
        if (!segment || isTokenLike(segment)) return segment ? REDACTED : '';
        return segment
            .replace(/(token|secret|api[_-]?key|authorization|password|signature|sig|key)=[^/;&]+/gi, `$1=${REDACTED}`)
            .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, REDACTED)
            .replace(/\+?\d{9,}/g, REDACTED);
    }).join('/');

    return safe || '/';
}

function finiteNumber(value: unknown, fallback = 0): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

/** Record one slow request. Returns the exact sample retained (for tests). */
export function recordSlowRequest(input: SlowRequestInput): SlowRequestSample {
    const sample: SlowRequestSample = {
        id: `slow-${++sequence}`,
        recordedAt: new Date().toISOString(),
        method: typeof input.method === 'string' && input.method.trim()
            ? input.method.trim().toUpperCase().slice(0, 16)
            : 'UNKNOWN',
        path: redactRequestPath(input.url ?? input.path),
        status: Math.trunc(finiteNumber(input.status)) || 0,
        durationMs: Math.max(0, Math.round(finiteNumber(input.durationMs))),
        thresholdMs: Math.max(0, Math.round(finiteNumber(input.thresholdMs))),
    };
    // `headers`, `body` and `query` are intentionally never read.

    samples.push(sample);
    totalRecorded += 1;
    if (samples.length > SLOW_REQUEST_STORE_CAP) {
        samples.shift();
        dropped += 1;
    }
    return sample;
}

/** Read-only snapshot, newest first. Never returns references into the store. */
export function listSlowRequests(limit = 50): SlowRequestSnapshot {
    const take = Math.min(Math.max(Math.trunc(finiteNumber(limit, 50)) || 50, 1), SLOW_REQUEST_STORE_CAP);
    return {
        samples: samples.slice(-take).reverse().map((sample) => ({ ...sample })),
        cap: SLOW_REQUEST_STORE_CAP,
        totalRecorded,
        dropped,
        generatedAt: new Date().toISOString(),
    };
}

/** Test-only reset; no admin route exposes mutation or clearing. */
export function clearSlowRequests(): void {
    samples.length = 0;
    sequence = 0;
    totalRecorded = 0;
    dropped = 0;
}
