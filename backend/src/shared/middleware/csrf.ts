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
 *  - **Cookieless requests pass through.** A CSRF attack requires the victim's
 *    browser to attach ambient credentials (the refresh cookie). A request that
 *    carries no cookies at all has no ambient authority to abuse, so demanding
 *    a double-submit token would only break legitimate first-contact flows
 *    (forgot-password, 2FA verification from a cold browser).
 *  - Once ANY cookie is present, the `x-csrf-token` header must match.
 */

const CSRF_COOKIE = 'csrfToken';
const CSRF_HEADER = 'x-csrf-token';
// Outlive the refresh cookie (30 days) so a long-lived session never hits a
// state where the browser still sends `refreshToken` but no `csrfToken`.
const CSRF_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30d

// Paths that are public/anonymous and must not require the CSRF header.
const CSRF_BYPASS_PATHS: RegExp[] = [
  /^\/api\/bookings\/?$/,                 // public booking submission (POST)
  /^\/api\/contact-enquiries\/?$/,        // public contact form
  /^\/api\/product-inquiries\/?$/,        // public product inquiry
  /^\/api\/newsletter\/subscribe\/?$/,    // public newsletter signup
  /^\/api\/invite\/accept\/?$/,           // invite acceptance
  /^\/api\/payments\/webhook\/?$/,        // Stripe webhook (signature-verified)
  /^\/api\/payments\/paystack\/webhook\/?$/, // Paystack webhook (HMAC-verified)
  /^\/api\/communications\/webhooks\/.*$/, // Provider webhooks (signature/verify-token checked)
  /^\/api\/chatbot\/?$/,                  // public chatbot
  /^\/api\/consent\/?$/,                  // privacy + terms acceptance (rate-limited)
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

/**
 * Ensure every response carries a CSRF cookie so the client can echo it back.
 * Issues a fresh token only when absent, so an existing token is preserved
 * (a rotating token would break in-flight requests in other tabs).
 */
export function csrfInit(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies || !req.cookies[CSRF_COOKIE]) {
    issueCsrfCookie(res);
  }
  return next();
}

export function csrfProtect(req: Request, res: Response, next: NextFunction) {
  const method = (req.method || 'GET').toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return next();

  // Public/anonymous carve-out (rate-limited or signature-verified instead).
  if (CSRF_BYPASS_PATHS.some((re) => re.test(req.path))) return next();

  // No ambient credentials → nothing to protect against CSRF.
  const hasCookies = !!req.cookies && Object.keys(req.cookies).length > 0;
  if (!hasCookies) return next();

  const cookieToken = req.cookies[CSRF_COOKIE] || '';
  const headerToken = (req.headers[CSRF_HEADER] as string) || '';

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'CSRF token missing or invalid' });
  }
  return next();
}

export { CSRF_COOKIE, CSRF_HEADER };
