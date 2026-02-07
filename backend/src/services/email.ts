import nodemailer from 'nodemailer';
import { getQueue } from '../queue';

// ─── Zoho Mail SMTP Configuration ──────────────────────────────────
// All outbound email uses Zoho Mail via SMTP (port 465 / TLS).
// Configure the following in .env:
//   SMTP_HOST=smtp.zoho.com   SMTP_PORT=465   SMTP_SECURE=true
//   SMTP_USER=info@angisoft.co.ke   SMTP_PASS=<app-password>
//
// Dedicated "from" addresses (all routed through the same Zoho account):
//   EMAIL_FROM          = info@angisoft.co.ke      (general / default)
//   EMAIL_SUPPORT       = support@angisoft.co.ke   (booking / payment receipts)
//   EMAIL_NOREPLY       = no-reply@angisoft.co.ke  (password resets, invites)
//   EMAIL_UPDATES       = updates@angisoft.co.ke   (newsletter / subscriber updates)

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.zoho.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_SECURE = process.env.SMTP_SECURE !== 'false'; // default true for port 465

// Zoho "from" addresses
const EMAIL_FROM = process.env.EMAIL_FROM || 'info@angisoft.co.ke';
const EMAIL_SUPPORT = process.env.EMAIL_SUPPORT || 'support@angisoft.co.ke';
const EMAIL_NOREPLY = process.env.EMAIL_NOREPLY || 'no-reply@angisoft.co.ke';
const EMAIL_UPDATES = process.env.EMAIL_UPDATES || 'updates@angisoft.co.ke';

// Reusable transporter — single persistent connection pool
const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    pool: true,              // reuse connections
    maxConnections: 5,       // Zoho allows up to 10 concurrent
    maxMessages: 100,        // per connection before recycling
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
});

// Verify SMTP connection on startup (non-blocking)
transporter.verify()
    .then(() => console.log('📧 Zoho SMTP connection verified'))
    .catch((err) => console.warn('⚠️  Zoho SMTP verification failed:', err.message));

export type EmailPurpose = 'general' | 'support' | 'noreply' | 'updates';

/** Resolve the "from" address by purpose */
function resolveFrom(purpose: EmailPurpose = 'general'): string {
    switch (purpose) {
        case 'support': return `"AngiSoft Support" <${EMAIL_SUPPORT}>`;
        case 'noreply': return `"AngiSoft Technologies" <${EMAIL_NOREPLY}>`;
        case 'updates': return `"AngiSoft Updates" <${EMAIL_UPDATES}>`;
        case 'general':
        default:        return `"AngiSoft Technologies" <${EMAIL_FROM}>`;
    }
}

interface MailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
    /** Which Zoho address to send from (default: 'general' → info@) */
    purpose?: EmailPurpose;
}

/**
 * Queue an email for async delivery via the background worker.
 * Falls back to direct send if the queue is unavailable.
 */
export async function sendMail(opts: MailOptions) {
    try {
        const q = getQueue('emails');
        await q.add('send', opts);
        console.log(`📧 Email queued → ${opts.to}`);
        return { queued: true };
    } catch (err) {
        console.warn('Queue unavailable, sending directly:', err);
        return sendMailDirect(opts);
    }
}

/**
 * Send an email immediately via Zoho SMTP (used by the email worker
 * and as the direct-send fallback).
 */
export async function sendMailDirect(opts: MailOptions) {
    const from = resolveFrom(opts.purpose);
    const info = await transporter.sendMail({
        from,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
    });
    console.log(`✅ Email sent → ${opts.to} (messageId: ${info.messageId})`);
    return info;
}
