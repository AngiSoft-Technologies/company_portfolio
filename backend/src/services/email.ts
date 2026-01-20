import nodemailer from 'nodemailer';
import sendgrid from '@sendgrid/mail';
import { getQueue } from '../queue';

const SENDGRID_KEY = process.env.SENDGRID_API_KEY || '';
if (SENDGRID_KEY) sendgrid.setApiKey(SENDGRID_KEY);

const SMTP_HOST = process.env.SMTP_HOST || 'localhost';
const SMTP_PORT = Number(process.env.SMTP_PORT || 1025);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    auth: SMTP_USER || SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

export async function sendMail(opts: { to: string; subject: string; html: string; text?: string }) {
    // if REDIS_URL present, enqueue job instead of sending inline
    try {
        const q = getQueue('emails');
        await q.add('send', opts);
        return { queued: true };
    } catch (err) {
        // fall through to direct send
    }
    if (SENDGRID_KEY) {
        const msg: any = {
            to: opts.to,
            from: process.env.EMAIL_FROM || 'no-reply@angisoft-technologies.com',
            subject: opts.subject,
            html: opts.html,
        };
        if (opts.text) msg.text = opts.text;
        return sendgrid.send(msg);
    }

    const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'no-reply@angisoft-technologies.com',
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
    });
    return info;
}

// low-level send function used by workers
export async function sendMailDirect(opts: { to: string; subject: string; html: string; text?: string }) {
    if (SENDGRID_KEY) {
        const msg: any = { to: opts.to, from: process.env.EMAIL_FROM || 'no-reply@angisoft-technologies.com', subject: opts.subject, html: opts.html };
        if (opts.text) msg.text = opts.text;
        return sendgrid.send(msg);
    }
    return transporter.sendMail({ from: process.env.EMAIL_FROM || 'no-reply@angisoft-technologies.com', to: opts.to, subject: opts.subject, text: opts.text, html: opts.html });
}
