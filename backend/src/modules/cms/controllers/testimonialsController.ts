import prisma from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { logAudit } from '../../../shared/services/audit';

export const testimonialsController = {
    async create(data: any, user: any) {
        const t = await prisma.orm.public.Testimonial.create({
            id: newId(),
            updatedAt: ts(),
            ...data,
        }).catch(() => null);
        if (t) await logAudit({ action: 'create_testimonial', entity: 'Testimonial', entityId: t.id, actorId: user?.sub || null, actorRole: user?.role || null });
        return t;
    },
    async list(options: any = {}) {
        const { where, take, skip, ...rest } = options;
        let query = prisma.orm.public.Testimonial.orderBy((t) => t.createdAt.desc());
        if (where) query = query.where((t) => where(t));
        if (skip) query = query.offset(Number(skip));
        if (take) query = query.limit(Number(take));
        let rows: Awaited<ReturnType<typeof query.all>> = [];
        try {
            rows = await query.all();
        } catch {
            rows = [];
        }
        void rest;
        return rows;
    },
    async get(id: string, options: any = {}) {
        const { where, ...rest } = options;
        let query = prisma.orm.public.Testimonial.where({ id });
        if (where) query = query.where((t) => where(t));
        void rest;
        try {
            return await query.first();
        } catch {
            return null;
        }
    },
    async update(id: string, data: any, user: any) {
        const t = await prisma.orm.public.Testimonial.where({ id }).update({
            updatedAt: ts(),
            ...data,
        }).catch(() => null);
        if (t) await logAudit({ action: 'update_testimonial', entity: 'Testimonial', entityId: id, actorId: user?.sub || null, actorRole: user?.role || null });
        return t;
    },
    async delete(id: string, user: any) {
        await prisma.orm.public.Testimonial.where({ id }).delete();
        await logAudit({ action: 'delete_testimonial', entity: 'Testimonial', entityId: id, actorId: user?.sub || null, actorRole: user?.role || null });
    },
};