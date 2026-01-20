import prisma from '../db';
import { logAudit } from '../services/audit';

export const projectsController = {
    async create(data: any, user: any) { const p = await prisma.project.create({ data }); await logAudit({ action: 'create_project', entity: 'Project', entityId: p.id, actorId: user?.sub || null, actorRole: user?.role || null }); return p; },
    async list() { return prisma.project.findMany({ orderBy: { createdAt: 'desc' } }); },
    async get(id: string) { return prisma.project.findUnique({ where: { id } }); },
    async update(id: string, data: any, user: any) { const p = await prisma.project.update({ where: { id }, data }); await logAudit({ action: 'update_project', entity: 'Project', entityId: id, actorId: user?.sub || null, actorRole: user?.role || null }); return p; },
    async delete(id: string, user: any) { await prisma.project.delete({ where: { id } }); await logAudit({ action: 'delete_project', entity: 'Project', entityId: id, actorId: user?.sub || null, actorRole: user?.role || null }); },
};
