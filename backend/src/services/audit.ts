import prisma from '../db';

export async function logAudit(entry: {
    actorId?: string | null;
    actorRole?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    meta?: any;
}) {
    try {
        if (!prisma || !prisma.auditLog) {
            console.warn('Audit logging unavailable');
            return null;
        }
        return prisma.auditLog.create({
            data: {
                actorId: entry.actorId || null,
                actorRole: entry.actorRole || null,
                action: entry.action,
                entity: entry.entity,
                entityId: entry.entityId || null,
                meta: entry.meta || null,
            },
        });
    } catch (err) {
        console.warn('Failed to log audit:', err);
        return null;
    }
}
