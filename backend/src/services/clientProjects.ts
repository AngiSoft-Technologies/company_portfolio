import { Prisma, PrismaClient } from '@prisma/client';

const defaultMilestones = [
    'Discovery / Scope Confirmation',
    'Implementation',
    'Review / QA',
    'Delivery'
];

type PrismaTransaction = Prisma.TransactionClient;

export async function createClientProjectFromBooking(
    prisma: PrismaClient | PrismaTransaction,
    bookingId: string,
    actorId?: string | null
) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { client: true, clientProject: true }
    });

    if (!booking) throw new Error('Booking not found');
    if (booking.clientProject) return booking.clientProject;

    const ownerId = booking.assignedToId || actorId || null;

    return prisma.clientProject.create({
        data: {
            bookingId: booking.id,
            clientId: booking.clientId,
            title: booking.title,
            description: booking.description || '',
            ownerId,
            milestones: {
                create: defaultMilestones.map((title, index) => ({
                    title,
                    sortOrder: index + 1
                }))
            },
            activities: {
                create: {
                    actorId: actorId || null,
                    type: 'PROJECT_CREATED',
                    message: `Project tracker created for ${booking.title}`,
                    visibleToClient: true
                }
            }
        },
        include: {
            milestones: { orderBy: { sortOrder: 'asc' } },
            activities: { orderBy: { createdAt: 'desc' } },
            owner: { select: { id: true, firstName: true, lastName: true, publicTitle: true } }
        }
    });
}
