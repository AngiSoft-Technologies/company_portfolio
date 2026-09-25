import prisma from '../../../db';
import { newId } from '../../../prisma/db';
import { emitToUser } from '../../../shared/services/realtime';

export async function createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    link?: string,
    meta?: object
) {
    const notification = await prisma.orm.public.Notification.create({
        id: newId(),
        userId,
        _type: type,
        title,
        message,
        link: link ?? null,
        meta: (meta ?? null) as any,
    });
    // Fire-and-forget realtime delivery to the recipient's connected sockets.
    setImmediate(() => {
        emitToUser(userId, 'notification:new', {
            id: notification.id,
            type: notification._type,
            title: notification.title,
            message: notification.message,
            link: notification.link,
            createdAt: notification.createdAt,
        });
    });
    return notification;
}

export async function getNotifications(userId: string, unreadOnly = false) {
    const collection = unreadOnly
        ? prisma.orm.public.Notification.where({ userId }).where({ read: false })
        : prisma.orm.public.Notification.where({ userId });
    return collection
        .orderBy((n) => n.createdAt.desc())
        .limit(50)
        .all();
}

export async function markNotificationRead(notificationId: string, userId: string) {
    return prisma.orm.public.Notification
        .where({ id: notificationId, userId })
        .updateAndCount({ read: true });
}

export async function markAllRead(userId: string) {
    return prisma.orm.public.Notification
        .where({ userId })
        .where({ read: false })
        .updateAndCount({ read: true });
}

export async function getUnreadCount(userId: string) {
    const result = await prisma.orm.public.Notification
        .where({ userId })
        .where({ read: false })
        .aggregate((a) => ({ n: a.count() }));
    return result.n;
}
