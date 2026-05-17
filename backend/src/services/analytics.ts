import prisma from '../db';

export async function trackPageView(path: string, req: { ip?: string; get: (h: string) => string | undefined }) {
    return prisma.pageView.create({
        data: {
            path,
            referrer: req.get('referer') || undefined,
            userAgent: req.get('user-agent'),
            ip: req.ip
        }
    });
}

export async function trackEvent(type: string, entity?: string, entityId?: string, meta?: object) {
    return prisma.analyticsEvent.create({
        data: { type, entity, entityId, meta }
    });
}

export async function getPageViewStats(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const total = await prisma.pageView.count({ where: { createdAt: { gte: since } } });
    const byPath = await prisma.pageView.groupBy({
        by: ['path'],
        _count: { path: true },
        where: { createdAt: { gte: since } },
        orderBy: { _count: { path: 'desc' } },
        take: 20
    });
    return { total, byPath };
}

export async function getEventStats(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const total = await prisma.analyticsEvent.count({ where: { createdAt: { gte: since } } });
    const byType = await prisma.analyticsEvent.groupBy({
        by: ['type'],
        _count: { type: true },
        where: { createdAt: { gte: since } },
        orderBy: { _count: { type: 'desc' } }
    });
    return { total, byType };
}
