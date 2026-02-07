import prisma from '../db';
import { logAudit } from '../services/audit';

export const serviceCategoriesController = {
    async create(data: any, user: any) {
        const c = await prisma.serviceCategory.create({ data });
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
        return prisma.serviceCategory.findMany({
            orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
            ...options
        });
    },
    async get(id: string, options: any = {}) {
        const { where, ...rest } = options;
        const mergedWhere = where ? { ...where, id } : { id };
        return prisma.serviceCategory.findFirst({ where: mergedWhere, ...rest });
    },
    async update(id: string, data: any, user: any) {
        const c = await prisma.serviceCategory.update({ where: { id }, data });
        await logAudit({
            action: 'update_service_category',
            entity: 'ServiceCategory',
            entityId: id,
            actorId: user?.sub || null,
            actorRole: user?.role || null
        });
        return c;
    },
    async delete(id: string, user: any) {
        await prisma.serviceCategory.delete({ where: { id } });
        await logAudit({
            action: 'delete_service_category',
            entity: 'ServiceCategory',
            entityId: id,
            actorId: user?.sub || null,
            actorRole: user?.role || null
        });
    }
};
