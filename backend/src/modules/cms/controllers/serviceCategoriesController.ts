import prisma from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { logAudit } from '../../../shared/services/audit';

export const serviceCategoriesController = {
    async create(data: any, user: any) {
        const c = await prisma.orm.public.ServiceCategory.create({
            id: newId(),
            updatedAt: ts(),
            name: data.name,
            slug: data.slug,
            description: data.description ?? null,
            icon: data.icon ?? null,
            order: data.order ?? 0,
            published: data.published ?? true,
        });
        await logAudit({
            action: 'create_service_category',
            entity: 'ServiceCategory',
            entityId: c.id,
            actorId: user?.sub || null,
            actorRole: user?.role || null
        });
        return c;
    },
    async list(options: any = {}) {
        let query: any = prisma.orm.public.ServiceCategory;
        if (options.where && Object.keys(options.where).length > 0) query = query.where(options.where);
        return query
            .orderBy([(c: any) => c.order.asc(), (c: any) => c.createdAt.desc()])
            .all();
    },
    async get(id: string, options: any = {}) {
        const mergedWhere: any = { ...(options.where || {}), id };
        return prisma.orm.public.ServiceCategory.where(mergedWhere).first();
    },
    async update(id: string, data: any, user: any) {
        const payload: any = {};
        for (const [k, v] of Object.entries(data)) if (v !== undefined) payload[k] = v;
        const c = await prisma.orm.public.ServiceCategory.where({ id }).update(payload);
        await logAudit({
            action: 'update_service_category',
            entity: 'ServiceCategory',
            entityId: id,
            actorId: user?.sub || null,
            actorRole: user?.role || null
        });
        return c ?? null;
    },
    async delete(id: string, user: any) {
        await prisma.orm.public.ServiceCategory.where({ id }).delete();
        await logAudit({
            action: 'delete_service_category',
            entity: 'ServiceCategory',
            entityId: id,
            actorId: user?.sub || null,
            actorRole: user?.role || null
        });
    }
};
