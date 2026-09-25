import type { Db, Tx } from '../../../db';
import { ts, newId } from '../../../prisma/db';

const defaultMilestones = [
    'Discovery / Scope Confirmation',
    'Implementation',
    'Review / QA',
    'Delivery'
];

export async function createClientProjectFromBooking(
    prisma: Db | Tx,
    bookingId: string,
    actorId?: string | null
) {
    const run = async (db: Db | Tx): Promise<any> => {
        const booking = await db.orm.public.Booking
            .where({ id: bookingId })
            .include('client')
            .include('clientProject')
            .first();

        if (!booking) throw new Error('Booking not found');
        const existingProjects = (booking as any).clientProject as any[] | undefined;
        if (existingProjects && existingProjects.length) return existingProjects[0];

        const ownerId = booking.assignedToId || actorId || null;

        const project = await db.orm.public.ClientProject.create({
            id: newId(),
            updatedAt: ts(),
            bookingId: booking.id,
            clientId: booking.clientId,
            title: booking.title,
            description: booking.description || '',
            ownerId,
            startedAt: null,
            dueAt: null,
            deliveredAt: null,
            completedAt: null,
        });

        for (const [index, title] of defaultMilestones.entries()) {
            await db.orm.public.ProjectMilestone.create({
                id: newId(),
                updatedAt: ts(),
                projectId: project.id,
                title,
                description: null,
                sortOrder: index + 1,
                dueAt: null,
                completedAt: null,
            });
        }

        await db.orm.public.ProjectActivity.create({
            id: newId(),
            clientProjectId: project.id,
            portfolioProjectId: null,
            actorId: actorId || null,
            _type: 'PROJECT_CREATED',
            message: `Project tracker created for ${booking.title}`,
            visibleToClient: true,
            meta: null,
        });

        return db.orm.public.ClientProject
            .where({ id: project.id })
            .include('projectMilestones', (m) => m.orderBy((x) => x.sortOrder.asc()))
            .include('projectActivities', (a) => a.orderBy((x) => x.createdAt.desc()))
            .include('owner', (o) => o.select('id', 'firstName', 'lastName', 'publicTitle'))
            .first();
    };

    // Atomicity mirror of P7's nested create: when handed the root client, run
    // the seed writes in one transaction; when handed a transaction handle the
    // caller already opened, join it directly.
    if ('transaction' in prisma) {
        return prisma.transaction(async (tx) => run(tx));
    }
    return run(prisma);
}
