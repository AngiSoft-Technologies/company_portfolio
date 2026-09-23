import prisma from '../db';
import { emitToUser } from './realtime';

export async function createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    link?: string,
    meta?: object
) {
    const notification = await prisma.notification.create({
        data: { userId, type, title, message, link, meta }
    });
    // Fire-and-forget realtime delivery to the recipient's connected sockets.
    setImmediate(() => {
        emitToUser(userId, 'notification:new', {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            link: notification.link,
            createdAt: notification.createdAt,
        });
    });
    return notification;
}

export async function getNotifications(userId: string, unreadOnly = false) {
    return prisma.notification.findMany({
        where: { userId, ...(unreadOnly ? { read: false } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 50
    });
}

export async function markNotificationRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { read: true }
    });
}

export async function markAllRead(userId: string) {
    return prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true }
    });
}

export async function getUnreadCount(userId: string) {
    return prisma.notification.count({
        where: { userId, read: false }
    });
}
