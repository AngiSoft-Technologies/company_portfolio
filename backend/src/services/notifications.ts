import prisma from '../db';

export async function createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    link?: string,
    meta?: object
) {
    return prisma.notification.create({
        data: { userId, type, title, message, link, meta }
    });
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
