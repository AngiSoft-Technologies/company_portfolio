import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * CSRF double-submit protection.
 *
 * Pattern:
 *  - On first visit, the server sets a `csrfToken` cookie containing a random
 *    value (base64url). The client reads it and sends it back in the
 *    `x-csrf-token` header on state-changing requests.
 *  - The middleware compares header vs. cookie. If they differ (or the header
 *    is missing), the request is rejected with 403.
 *
 * This defeats CSRF because an attacker's site cannot read the victim's
 * `csrfToken` cookie (same-origin policy), so it cannot forge the header.
 *
 * Enforcement rules (fail-safe, minimal friction):
 *  - Only state-changing methods (POST/PUT/PATCH/DELETE) are checked.
 *  - Public, anonymous endpoints (booking submission, contact enquiries,
 *    newsletter, invite acceptance, Stripe webhook) are excluded because they
 *    are rate-limited and/or signature-verified instead. Without this carve-out
 *    every public form would break.
 *  - `/api/auth/*` is always enforced for state-changing methods, because the
 *    refresh/logout flow is cookie-based and is the classic CSRF target.
 *  - Authenticated requests (Bearer token present) are enforced too — a valid
 *    session should still require the token so a cross-site request that piggy-
 *    backs on cookies cannot mutate state.
 */

const CSRF_COOKIE = 'csrfToken';
const CSRF_HEADER = 'x-csrf-token';
const CSRF_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

// Paths that are public/anonymous and must not require the CSRF header.
const CSRF_BYPASS_PATHS: RegExp[] = [
  /^\/api\/bookings\/?$/,                 // public booking submission (POST)
  /^\/api\/contact-enquiries\/?$/,        // public contact form
  /^\/api\/product-inquiries\/?$/,        // public product inquiry
  /^\/api\/newsletter\/subscribe\/?$/,    // public newsletter signup
  /^\/api\/invite\/accept\/?$/,           // invite acceptance
  /^\/api\/payments\/webhook\/?$/,        // Stripe webhook (signature-verified)
  /^\/api\/chatbot\/?$/,                  // public chatbot
  /^\/api\/surveys\/active\/?$/,          // public survey responses
  /^\/api\/leads\/?$/,                    // public lead capture (already role-gated server-side)
];

export function issueCsrfCookie(res: Response): string {
  const token = crypto.randomBytes(24).toString('base64url');
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // client JS must read it to echo back in the header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: CSRF_MAX_AGE_MS,
  });
  return token;
}

export function csrfProtect(req: Request, res: Response, next: NextFunction) {
  const method = (req.method || 'GET').toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return next();

  // Public/anonymous carve-out (rate-limited or signature-verified instead).
  if (CSRF_BYPASS_PATHS.some((re) => re.test(req.path))) return next();

  const cookieToken = (req.cookies && req.cookies[CSRF_COOKIE]) || '';
  const headerToken = (req.headers[CSRF_HEADER] as string) || '';

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'CSRF token missing or invalid' });
  }
  return next();
}

export { CSRF_COOKIE, CSRF_HEADER };
