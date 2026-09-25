import prisma from '../../db';
import { newId } from '../../prisma/db';

export async function logAudit(entry: {
    actorId?: string | null;
    actorRole?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    meta?: any;
}) {
    try {
        if (!prisma) {
            console.warn('Audit logging unavailable');
            return null;
        }
        return await prisma.orm.public.AuditLog.create({
            id: newId(),
            actorId: entry.actorId || null,
            actorRole: (entry.actorRole || null) as any,
            action: entry.action,
            entity: entry.entity,
            entityId: entry.entityId || null,
            meta: (entry.meta || null) as any,
        });
    } catch (err) {
        console.warn('Failed to log audit:', err);
        return null;
    }
}
