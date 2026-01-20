import prisma from '../db';
import { logAudit } from '../services/audit';

export const blogController = {
    async create(data: any, user: any) { const p = await prisma.blogPost.create({ data }); await logAudit({ action: 'create_blog', entity: 'BlogPost', entityId: p.id, actorId: user?.sub || null, actorRole: user?.role || null }); return p; },
    async list() { return prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } }); },
    async get(id: string) { return prisma.blogPost.findUnique({ where: { id } }); },
    async update(id: string, data: any, user: any) { const p = await prisma.blogPost.update({ where: { id }, data }); await logAudit({ action: 'update_blog', entity: 'BlogPost', entityId: id, actorId: user?.sub || null, actorRole: user?.role || null }); return p; },
    async delete(id: string, user: any) { await prisma.blogPost.delete({ where: { id } }); await logAudit({ action: 'delete_blog', entity: 'BlogPost', entityId: id, actorId: user?.sub || null, actorRole: user?.role || null }); },
};
