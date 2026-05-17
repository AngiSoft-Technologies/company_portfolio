import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getNotifications, markNotificationRead, markAllRead, getUnreadCount } from '../services/notifications';

export default function notificationsRouter() {
    const router = Router();
    router.use(requireAuth);

    router.get('/', async (req: AuthRequest, res) => {
        const userId = req.user?.sub;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        const unreadOnly = req.query.unread === 'true';
        const notifications = await getNotifications(userId, unreadOnly);
        const unreadCount = await getUnreadCount(userId);
        res.json({ notifications, unreadCount });
    });

    router.post('/mark-read', async (req: AuthRequest, res) => {
        const userId = req.user?.sub;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        const { notificationId } = req.body;
        if (notificationId) {
            await markNotificationRead(notificationId, userId);
        } else {
            await markAllRead(userId);
        }
        res.json({ ok: true });
    });

    return router;
}
