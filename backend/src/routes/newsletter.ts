import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { sendMail } from '../services/email';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/audit';

const subscribeSchema = z.object({
    email: z.string().email(),
    name: z.string().optional(),
});

const broadcastSchema = z.object({
    subject: z.string().min(1),
    html: z.string().min(1),
    text: z.string().optional(),
});

export default function newsletterRouter(prisma: PrismaClient) {
    const router = Router();

    // ─── Public: Subscribe ──────────────────────────────────────────
    router.post('/subscribe', async (req, res) => {
        const parsed = subscribeSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

        const { email, name } = parsed.data;
        const existing = await prisma.subscriber.findUnique({ where: { email } });

        if (existing && existing.confirmed && !existing.unsubscribedAt) {
            return res.json({ message: 'You are already subscribed!' });
        }

        const confirmToken = uuidv4();
        const frontendUrl = process.env.FRONTEND_URL || 'https://angisoft.co.ke';

        if (existing) {
            // Re-subscribe or resend confirmation
            await prisma.subscriber.update({
                where: { email },
                data: { confirmToken, confirmed: false, unsubscribedAt: null, name: name || existing.name },
            });
        } else {
            await prisma.subscriber.create({
                data: { email, name, confirmToken },
            });
        }

        const confirmUrl = `${frontendUrl}/newsletter/confirm?token=${confirmToken}`;

        await sendMail({
            to: email,
            subject: 'Confirm your subscription — AngiSoft Technologies',
            html: `
                <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">
                    <h2>Welcome${name ? `, ${name}` : ''}! 🎉</h2>
                    <p>Thank you for subscribing to AngiSoft Technologies updates.</p>
                    <p>Please confirm your subscription by clicking the button below:</p>
                    <p style="text-align:center;margin:24px 0;">
                        <a href="${confirmUrl}" 
                           style="background:#0891b2;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">
                            Confirm Subscription
                        </a>
                    </p>
                    <p style="color:#666;font-size:13px;">If you didn't subscribe, simply ignore this email.</p>
                </div>
            `,
            purpose: 'updates',
        });

        res.json({ message: 'Confirmation email sent! Please check your inbox.' });
    });

    // ─── Public: Confirm subscription ───────────────────────────────
    router.get('/confirm', async (req, res) => {
        const token = req.query.token as string;
        if (!token) return res.status(400).json({ error: 'Missing token' });

        const subscriber = await prisma.subscriber.findUnique({ where: { confirmToken: token } });
        if (!subscriber) return res.status(404).json({ error: 'Invalid or expired token' });

        await prisma.subscriber.update({
            where: { id: subscriber.id },
            data: { confirmed: true, confirmedAt: new Date(), confirmToken: null },
        });

        res.json({ message: 'Subscription confirmed! You will receive our latest updates.' });
    });

    // ─── Public: Unsubscribe ────────────────────────────────────────
    router.get('/unsubscribe', async (req, res) => {
        const token = req.query.token as string;
        if (!token) return res.status(400).json({ error: 'Missing token' });

        const subscriber = await prisma.subscriber.findUnique({ where: { unsubToken: token } });
        if (!subscriber) return res.status(404).json({ error: 'Invalid link' });

        await prisma.subscriber.update({
            where: { id: subscriber.id },
            data: { unsubscribedAt: new Date() },
        });

        res.json({ message: 'You have been unsubscribed. Sorry to see you go!' });
    });

    // ─── Admin: List subscribers ────────────────────────────────────
    router.get('/subscribers', requireAuth, async (req: any, res) => {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });

        const subscribers = await prisma.subscriber.findMany({
            where: { confirmed: true, unsubscribedAt: null },
            orderBy: { subscribedAt: 'desc' },
        });
        res.json(subscribers);
    });

    // ─── Admin: Broadcast to all confirmed subscribers ──────────────
    router.post('/broadcast', requireAuth, async (req: any, res) => {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });

        const parsed = broadcastSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

        const { subject, html, text } = parsed.data;
        const frontendUrl = process.env.FRONTEND_URL || 'https://angisoft.co.ke';

        const subscribers = await prisma.subscriber.findMany({
            where: { confirmed: true, unsubscribedAt: null },
        });

        let sent = 0;
        for (const sub of subscribers) {
            const unsubLink = `${frontendUrl}/newsletter/unsubscribe?token=${sub.unsubToken}`;
            const personalizedHtml = `
                ${html}
                <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />
                <p style="color:#999;font-size:12px;text-align:center;">
                    You're receiving this because you subscribed to AngiSoft updates.<br/>
                    <a href="${unsubLink}" style="color:#0891b2;">Unsubscribe</a>
                </p>
            `;
            try {
                await sendMail({ to: sub.email, subject, html: personalizedHtml, text, purpose: 'updates' });
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
