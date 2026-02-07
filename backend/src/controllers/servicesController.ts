import prisma from '../db';
import { logAudit } from '../services/audit';

export const servicesController = {
    async create(data: any, user: any) {
        const s = await prisma.service.create({ data });
        await logAudit({ action: 'create_service', entity: 'Service', entityId: s.id, actorId: user?.sub || null, actorRole: user?.role || null });
        return s;
    },
    async list(options: any = {}) { return prisma.service.findMany({ orderBy: { createdAt: 'desc' }, ...options }); },
    async get(id: string, options: any = {}) {
        const { where, ...rest } = options;
        const mergedWhere = where ? { ...where, id } : { id };
        return prisma.service.findFirst({ where: mergedWhere, ...rest });
    },
    async update(id: string, data: any, user: any) { const s = await prisma.service.update({ where: { id }, data }); await logAudit({ action: 'update_service', entity: 'Service', entityId: id, actorId: user?.sub || null, actorRole: user?.role || null }); return s; },
    async delete(id: string, user: any) { await prisma.service.delete({ where: { id } }); await logAudit({ action: 'delete_service', entity: 'Service', entityId: id, actorId: user?.sub || null, actorRole: user?.role || null }); },
};
