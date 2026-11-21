import { Router } from 'express';
import type { Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { escapeHtml, sendMail } from '../../../shared/services/email';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { publicFormLimiter } from '../../../shared/middleware/rateLimiter';

const subscribeSchema = z.object({
    email: z.string().email(),
    name: z.string().optional(),
});

const broadcastSchema = z.object({
    subject: z.string().min(1),
    html: z.string().min(1),
    text: z.string().optional(),
});

export default function newsletterRouter(prisma: Db) {
    const router = Router();

    // ─── Public: Subscribe ──────────────────────────────────────────
    router.post('/subscribe', publicFormLimiter, async (req, res) => {
        const parsed = subscribeSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

        const { email, name } = parsed.data;
        const existing = await prisma.orm.public.Subscriber.where({ email }).first();

        if (existing && existing.confirmed && !existing.unsubscribedAt) {
            return res.json({ message: 'You are already subscribed!' });
        }

        const confirmToken = uuidv4();
        const frontendUrl = process.env.FRONTEND_URL || 'https://angisoft.co.ke';

        if (existing) {
            // Re-subscribe or resend confirmation
            await prisma.orm.public.Subscriber.where({ email }).update({
                confirmToken,
                confirmed: false,
                unsubscribedAt: null,
                name: name || existing.name
            });
        } else {
            await prisma.orm.public.Subscriber.create({
                id: newId(),
                email,
                name: name ?? null,
                confirmToken,
                unsubToken: uuidv4()
            });
        }

        const confirmUrl = `${frontendUrl}/newsletter/confirm?token=${confirmToken}`;

        await sendMail({
            to: email,
            subject: 'Confirm your subscription — AngiSoft Technologies',
            title: `Welcome${name ? `, ${escapeHtml(name)}` : ''} to AngiSoft updates`,
            eyebrow: 'Newsletter Confirmation',
            preheader: 'One click confirms your subscription.',
            footerNote: 'You received this because you subscribed to AngiSoft updates.',
            cta: { label: 'Confirm Subscription', url: confirmUrl },
            html: `
                <p style="margin:0 0 16px">Thank you for subscribing to AngiSoft Technologies updates.</p>
                <p style="margin:0 0 8px">Please confirm your subscription using the button below. You'll get product news, company updates and practical engineering notes — no noise.</p>
                <p style="margin:0;color:#64748B;font-size:13px">If you didn't subscribe, simply ignore this email.</p>`,
            purpose: 'updates',
        });

        res.json({ message: 'Confirmation email sent! Please check your inbox.' });
    });

    // ─── Public: Confirm subscription ───────────────────────────────
    router.get('/confirm', async (req, res) => {
        const token = req.query.token as string;
        if (!token) return res.status(400).json({ error: 'Missing token' });

        const subscriber = await prisma.orm.public.Subscriber.where({ confirmToken: token }).first();
        if (!subscriber) return res.status(404).json({ error: 'Invalid or expired token' });

        await prisma.orm.public.Subscriber.where({ id: subscriber.id }).update({
            confirmed: true,
            confirmedAt: ts(),
            confirmToken: null
        });

        res.json({ message: 'Subscription confirmed! You will receive our latest updates.' });
    });

    // ─── Public: Unsubscribe ────────────────────────────────────────
    router.get('/unsubscribe', async (req, res) => {
        const token = req.query.token as string;
        if (!token) return res.status(400).json({ error: 'Missing token' });

        const subscriber = await prisma.orm.public.Subscriber.where({ unsubToken: token }).first();
        if (!subscriber) return res.status(404).json({ error: 'Invalid link' });

        await prisma.orm.public.Subscriber.where({ id: subscriber.id }).update({
            unsubscribedAt: ts()
        });

        res.json({ message: 'You have been unsubscribed. Sorry to see you go!' });
    });

    // ─── Admin: List subscribers ────────────────────────────────────
    router.get('/subscribers', requireAuth, requireAccess('newsletters.view', ['ADMIN', 'MARKETING']), async (req: any, res) => {
        const subscribers = await prisma.orm.public.Subscriber
            .where({ confirmed: true })
            .where((s: any) => s.unsubscribedAt.isNull())
            .orderBy((s: any) => s.subscribedAt.desc())
            .all();
        res.json(subscribers);
    });

    // ─── Admin: Broadcast to all confirmed subscribers ──────────────
    router.post('/broadcast', requireAuth, requireAccess('newsletters.send', ['ADMIN', 'MARKETING']), async (req: any, res) => {
        const parsed = broadcastSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

        const { subject, html, text } = parsed.data;
        const frontendUrl = process.env.FRONTEND_URL || 'https://angisoft.co.ke';

        const subscribers = await prisma.orm.public.Subscriber
            .where({ confirmed: true })
            .where((s: any) => s.unsubscribedAt.isNull())
            .all();

        let sent = 0;
        for (const sub of subscribers) {
            const unsubLink = `${frontendUrl}/newsletter/unsubscribe?token=${sub.unsubToken}`;
            try {
                await sendMail({
                    to: sub.email,
                    subject,
                    html,
                    text,
                    purpose: 'updates',
                    eyebrow: 'AngiSoft Updates',
                    footerNote: "You're receiving this because you subscribed to AngiSoft updates.",
                    unsubscribeUrl: unsubLink,
                });
                sent++;
            } catch (err: any) {
                console.warn(`Failed to send to ${sub.email}:`, err.message);
            }
        }

        await logAudit({
            action: 'newsletter_broadcast',
            entity: 'Subscriber',
            actorId: req.user.sub,
            actorRole: req.user.role,
            meta: { subject, recipientCount: sent },
        });

        res.json({ message: `Broadcast sent to ${sent} subscribers`, total: subscribers.length, sent });
    });

    return router;
}
