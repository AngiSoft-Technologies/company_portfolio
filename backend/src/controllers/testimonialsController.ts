import prisma from '../db';
import { logAudit } from '../services/audit';

export const testimonialsController = {
    async create(data: any, user: any) {
        const t = await prisma.testimonial?.create({ data }) || null;
        if (t) await logAudit({ action: 'create_testimonial', entity: 'Testimonial', entityId: t.id, actorId: user?.sub || null, actorRole: user?.role || null });
        return t;
    },
    async list(options: any = {}) {
        return prisma.testimonial?.findMany({ orderBy: { createdAt: 'desc' }, ...options }) || [];
    },
    async get(id: string, options: any = {}) {
        const { where, ...rest } = options;
        const mergedWhere = where ? { ...where, id } : { id };
        return prisma.testimonial?.findFirst({ where: mergedWhere, ...rest }) || null;
    },
    async update(id: string, data: any, user: any) {
        const t = await prisma.testimonial?.update({ where: { id }, data }) || null;
        if (t) await logAudit({ action: 'update_testimonial', entity: 'Testimonial', entityId: id, actorId: user?.sub || null, actorRole: user?.role || null });
        return t;
    },
    async delete(id: string, user: any) {
        await prisma.testimonial?.delete({ where: { id } });
        await logAudit({ action: 'delete_testimonial', entity: 'Testimonial', entityId: id, actorId: user?.sub || null, actorRole: user?.role || null });
    },
};
