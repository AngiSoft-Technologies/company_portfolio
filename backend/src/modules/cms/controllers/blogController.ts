import prisma from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { or } from '@prisma/orm-postgres/orm-client';
import { logAudit } from '../../../shared/services/audit';

const withAuthor = (query: any) => query
    .include('author', (a: any) => a.select('id', 'firstName', 'lastName', 'role', 'avatarUrl'));

export const blogController = {
    async create(data: any, user: any) {
        const p = await prisma.orm.public.BlogPost.create({
            id: newId(),
            updatedAt: ts(),
            title: data.title,
            slug: data.slug,
            content: data.content,
            authorId: data.authorId,
            tags: data.tags ?? null,
            published: data.published ?? false,
            publishedAt: data.publishedAt ? ts(data.publishedAt) : null,
            coverImage: data.coverImage ?? null,
            excerpt: data.excerpt ?? null,
            subtitle: data.subtitle ?? null,
            contentType: data.contentType ?? 'article',
            mediaUrl: data.mediaUrl ?? null,
            transcript: data.transcript ?? null,
            visibilityType: data.visibilityType ?? 'permanent',
            visibleUntil: data.visibleUntil ? ts(data.visibleUntil) : null,
            resourceLinks: data.resourceLinks ?? null,
            categoryId: data.categoryId ?? null,
            featured: data.featured ?? false,
            seoTitle: data.seoTitle ?? null,
            seoDescription: data.seoDescription ?? null,
        });
        await logAudit({ action: 'create_blog', entity: 'BlogPost', entityId: p.id, actorId: user?.sub || null, actorRole: user?.role || null });
        return p;
    },
    async list(options: any = {}) {
        let query: any = prisma.orm.public.BlogPost;
        if (options.where && Object.keys(options.where).length > 0) query = query.where(options.where);
        return withAuthor(query)
            .orderBy((p: any) => p.createdAt.desc())
            .all();
    },
    async get(identifier: string, options: any = {}) {
        let query: any = prisma.orm.public.BlogPost;
        if (options.where && Object.keys(options.where).length > 0) query = query.where(options.where);
        query = query.where((p: any) => or(p.id.eq(identifier), p.slug.eq(identifier)));
        return withAuthor(query).first();
    },
    async update(id: string, data: any, user: any) {
        const payload: any = {};
        for (const [k, v] of Object.entries(data)) {
            if (v === undefined) continue;
            if (k === 'visibleUntil') payload.visibleUntil = v ? ts(v as any) : null;
            else payload[k] = v;
        }
        const p = await prisma.orm.public.BlogPost.where({ id }).update(payload);
        await logAudit({ action: 'update_blog', entity: 'BlogPost', entityId: id, actorId: user?.sub || null, actorRole: user?.role || null });
        return p ?? null;
    },
    async delete(id: string, user: any) {
        await prisma.orm.public.BlogPost.where({ id }).delete();
        await logAudit({ action: 'delete_blog', entity: 'BlogPost', entityId: id, actorId: user?.sub || null, actorRole: user?.role || null });
    },
};
