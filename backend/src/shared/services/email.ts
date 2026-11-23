import nodemailer, { type Transporter } from 'nodemailer';
import { getQueue } from '../../queue';
import { getConfig } from './runtimeConfig';
import { renderBrandedEmail, type EmailCta } from './emailTemplate';

export {
    ANGISOFT_BRAND,
    emailButton,
    escapeHtml,
    renderBrandedDocument,
    renderBrandedEmail,
    safeUrl,
    sanitizeEmailHtml,
} from './emailTemplate';
export type { BrandedDocumentInput, BrandedEmailInput, EmailCta } from './emailTemplate';

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

// SMTP settings are DB-backed so a SUPER_ADMIN can rotate them without a
// redeploy. The transporter is rebuilt lazily whenever the settings change.
function smtpConfig() {
    const host = getConfig('SMTP_HOST', 'smtp.zoho.com');
    const port = Number(getConfig('SMTP_PORT', '465'));
    const user = getConfig('SMTP_USER');
    const pass = getConfig('SMTP_PASS');
    const secure = getConfig('SMTP_SECURE', 'true') !== 'false';
    return { host, port, user, pass, secure };
}

let transporterCache: { key: string; value: Transporter } | null = null;

function getTransporter(): Transporter {
    const config = smtpConfig();
    const key = JSON.stringify(config);
    if (transporterCache?.key === key) return transporterCache.value;
    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 30_000,
    });
    transporterCache = { key, value: transporter };
    // Non-blocking verification; tests and CI must not open a socket at import.
    if (process.env.NODE_ENV !== 'test' && process.env.DISABLE_SMTP_VERIFY !== '1') {
        void transporter.verify()
            .then(() => console.log('📧 Zoho SMTP connection verified'))
            .catch((err) => console.warn('⚠️  Zoho SMTP verification failed:', err.message));
    }
    return transporter;
}

const fromAddress = (key: string, fallback: string) => getConfig(key, fallback);

export type EmailPurpose = 'general' | 'support' | 'noreply' | 'updates';

/** Resolve the "from" address by purpose */
function resolveFrom(purpose: EmailPurpose = 'general'): string {
    switch (purpose) {
        case 'support': return `"AngiSoft Support" <${fromAddress('EMAIL_SUPPORT', 'support@angisoft.co.ke')}>`;
        case 'noreply': return `"AngiSoft Technologies" <${fromAddress('EMAIL_NOREPLY', 'no-reply@angisoft.co.ke')}>`;
        case 'updates': return `"AngiSoft Updates" <${fromAddress('EMAIL_UPDATES', 'updates@angisoft.co.ke')}>`;
        case 'general':
        default:        return `"AngiSoft Technologies" <${fromAddress('EMAIL_FROM', 'info@angisoft.co.ke')}>`;
    }
}

interface MailOptions {
    to: string;
    subject: string;
    /** Body fragment. Wrapped in the branded email shell unless `layout: 'raw'`. */
    html: string;
    text?: string;
    /** Which Zoho address to send from (default: 'general' → info@) */
    purpose?: EmailPurpose;
    /** Full From override (e.g. '"AngiSoft Sales" <sales@angisoft.co.ke>') —
     *  requires the address to be a verified send-as alias in Zoho. */
    from?: string;
    /** Override the display name while keeping the verified From address,
     *  e.g. senderName 'AngiSoft Sales' → "AngiSoft Sales" <info@...> */
    senderName?: string;
    /** Where replies should land (e.g. the department mailbox). */
    replyTo?: string;
    /** Branded heading/preheader/CTA. Title defaults to the subject. */
    title?: string;
    eyebrow?: string;
    preheader?: string;
    cta?: EmailCta;
    footerNote?: string;
    unsubscribeUrl?: string;
    /** Escape hatch for already-complete HTML. Branded is the default. */
    layout?: 'branded' | 'raw';
    /** Nodemailer attachments, e.g. a branded HTML contract draft. */
    attachments?: any[];
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
    const base = opts.from ?? resolveFrom(opts.purpose);
    const from = !opts.from && opts.senderName ? base.replace(/"[^"]*"/, `"${opts.senderName.replace(/"/g, '')}"`) : base;
    // Templates that already called renderBrandedEmail carry a marker; never
    // wrap them twice. Everything else gets the standard AngiSoft shell.
    const alreadyBranded = /data-angi-brand=["']1["']/i.test(opts.html);
    const html = opts.layout === 'raw' || alreadyBranded
        ? opts.html
        : renderBrandedEmail({
            title: opts.title ?? opts.subject,
            eyebrow: opts.eyebrow,
            preheader: opts.preheader,
            bodyHtml: opts.html,
            cta: opts.cta,
            footerNote: opts.footerNote,
            unsubscribeUrl: opts.unsubscribeUrl,
        });
    const info = await getTransporter().sendMail({
        from,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html,
        ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
        ...(opts.attachments?.length ? { attachments: opts.attachments } : {}),
    });
    console.log(`✅ Email sent → ${opts.to} (messageId: ${info.messageId})`);
    return info;
}
