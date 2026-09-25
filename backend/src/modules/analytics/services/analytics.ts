import prisma from '../../../db';
import { ts, newId } from '../../../prisma/db';

export async function trackPageView(path: string, req: { ip?: string; get: (h: string) => string | undefined }) {
    return prisma.orm.public.PageView.create({
        id: newId(),
        path,
        referrer: req.get('referer') || null,
        userAgent: req.get('user-agent') ?? null,
        ip: req.ip ?? null,
        sessionId: null,
    });
}

export async function trackEvent(type: string, entity?: string, entityId?: string, meta?: object) {
    return prisma.orm.public.AnalyticsEvent.create({
        id: newId(),
        _type: type,
        entity: entity ?? null,
        entityId: entityId ?? null,
        meta: (meta ?? null) as any,
    });
}

export async function getPageViewStats(days = 30) {
    const since = ts(Date.now() - days * 24 * 60 * 60 * 1000);
    const totalRow = await prisma.orm.public.PageView
        .where((v) => v.createdAt.gte(since))
        .aggregate((a) => ({ n: a.count() }));
    const total = totalRow.n;
    // P7 groupBy ordered by per-path count desc with a take — the P8 groupBy
    // surface cannot order by an aggregate, so this stays a raw aggregate query.
    const plan = prisma.raw.sql`
        SELECT "path" AS "path", COUNT(*)::int AS "count" FROM "PageView"
        WHERE "createdAt" >= ${since}
        GROUP BY "path" ORDER BY "count" DESC LIMIT 20`
        .returnsRow({
            path: prisma.sql.public.PageView.columns.path,
            count: prisma.sql.public.CompanyStat.columns.value,
        })
        .build();
    const rows = (await prisma.runtime().query(plan)) as Array<{ path: string; count: number }>;
    const byPath = rows.map((r) => ({ path: r.path, _count: { path: Number(r.count) } }));
    return { total, byPath };
}

export async function getEventStats(days = 30) {
    const since = ts(Date.now() - days * 24 * 60 * 60 * 1000);
    const totalRow = await prisma.orm.public.AnalyticsEvent
        .where((e) => e.createdAt.gte(since))
        .aggregate((a) => ({ n: a.count() }));
    const total = totalRow.n;
    const plan = prisma.raw.sql`
        SELECT "type" AS "type", COUNT(*)::int AS "count" FROM "AnalyticsEvent"
        WHERE "createdAt" >= ${since}
        GROUP BY "type" ORDER BY "count" DESC`
        .returnsRow({
            type: prisma.sql.public.AnalyticsEvent.columns.type,
            count: prisma.sql.public.CompanyStat.columns.value,
        })
        .build();
    const rows = (await prisma.runtime().query(plan)) as Array<{ type: string; count: number }>;
    const byType = rows.map((r) => ({ type: r.type, _count: { type: Number(r.count) } }));
    return { total, byType };
}
