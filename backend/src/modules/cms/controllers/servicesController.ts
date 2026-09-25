import prisma from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { logAudit } from '../../../shared/services/audit';

const remapService = (s: any) => {
    const { categoryServiceCategory, ...rest } = s;
    return { ...rest, categoryRef: categoryServiceCategory };
};

const withIncludes = (query: any) => query
    .include('categoryServiceCategory')
    .include('author', (a: any) => a.select('id', 'firstName', 'lastName', 'role', 'avatarUrl'));

export const servicesController = {
    async create(data: any, user: any) {
        const s = await prisma.orm.public.Service.create({
            id: newId(),
            updatedAt: ts(),
            title: data.title,
            slug: data.slug,
            description: data.description ?? null,
            category: data.category ?? 'General',
            categoryId: data.categoryId ?? null,
            priceFrom: data.priceFrom ?? null,
            targetAudience: data.targetAudience ?? null,
            scope: data.scope ?? null,
            images: data.images ?? [],
            published: data.published ?? false,
            authorId: data.authorId ?? null,
            currency: data.currency ?? 'KES',
            features: data.features ?? [],
            seoTitle: data.seoTitle ?? null,
            seoDesc: data.seoDesc ?? null,
            featured: data.featured ?? false,
            pricing: data.pricing ?? null,
        });
        await logAudit({ action: 'create_service', entity: 'Service', entityId: s.id, actorId: user?.sub || null, actorRole: user?.role || null });
        return remapService(s);
    },
    async list(options: any = {}) {
        let query: any = prisma.orm.public.Service;
        if (options.where && Object.keys(options.where).length > 0) query = query.where(options.where);
        const rows = await withIncludes(query)
            .orderBy((s: any) => s.createdAt.desc())
            .all();
        return rows.map(remapService);
    },
    async get(idOrSlug: string, options: any = {}) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
        const mergedWhere: any = { ...(options.where || {}), ...(isUuid ? { id: idOrSlug } : { slug: idOrSlug }) };
        const row = await withIncludes(prisma.orm.public.Service.where(mergedWhere)).first();
        return row ? remapService(row) : null;
    },
    async update(id: string, data: any, user: any) {
        const payload: any = {};
        for (const [k, v] of Object.entries(data)) if (v !== undefined) payload[k] = v;
        const s = await prisma.orm.public.Service.where({ id }).update(payload);
        await logAudit({ action: 'update_service', entity: 'Service', entityId: id, actorId: user?.sub || null, actorRole: user?.role || null });
        return s ? remapService(s) : null;
    },
    async delete(id: string, user: any) {
        await prisma.orm.public.Service.where({ id }).delete();
        await logAudit({ action: 'delete_service', entity: 'Service', entityId: id, actorId: user?.sub || null, actorRole: user?.role || null });
    },
};
