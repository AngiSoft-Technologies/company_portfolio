import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const publicProfileSelect = {
    id: true,
    username: true,
    firstName: true,
    lastName: true,
    role: true,
    publicTitle: true,
    publicSummary: true,
    bio: true,
    avatarUrl: true,
    location: true,
    websiteUrl: true,
    linkedinUrl: true,
    twitterUrl: true,
    githubUrl: true,
    skills: true,
    specialties: true,
    publicEmail: true,
    publicPhone: true,
    profileOrder: true,
    createdAt: true,
};

export default function staffRouter(prisma: PrismaClient) {
    const router = Router();

    router.get('/', async (req, res) => {
        try {
            const staff = await prisma.employee.findMany({
                where: {
                    acceptedAt: { not: null },
                    passwordHash: { not: null },
                    profilePublished: true,
                },
                select: publicProfileSelect,
                orderBy: [{ profileOrder: 'asc' }, { createdAt: 'desc' }],
            });
            res.json(staff);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/:usernameOrId', async (req, res) => {
        try {
            const { usernameOrId } = req.params;
            const staff = await prisma.employee.findFirst({
                where: {
                    OR: [{ username: usernameOrId }, { id: usernameOrId }],
                    acceptedAt: { not: null },
                    passwordHash: { not: null },
                    profilePublished: true,
                },
                select: {
                    ...publicProfileSelect,
                    posts: {
                        where: { published: true },
                        select: {
                            id: true,
                            title: true,
                            slug: true,
                            publishedAt: true,
                            createdAt: true,
                        },
                        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
                        take: 5,
                    },
                    services: {
                        where: { published: true },
                        select: {
                            id: true,
                            title: true,
                            slug: true,
                            description: true,
                            images: true,
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                    },
                    projectsAuthored: {
                        where: { published: true },
                        select: {
                            id: true,
                            title: true,
                            slug: true,
                            description: true,
                            images: true,
                            techStack: true,
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                    },
                },
            });

            if (!staff) {
                return res.status(404).json({ error: 'Staff member not found' });
            }

            const documents = await prisma.file.findMany({
                where: {
                    ownerType: 'employee_document',
                    ownerId: staff.id,
                    metadata: {
                        path: ['public'],
                        equals: true,
                    },
                },
                select: {
                    id: true,
                    filename: true,
                    url: true,
                    mime: true,
                    metadata: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
            });

            const { projectsAuthored, ...staffPublic } = staff;
            res.json({ ...staffPublic, projects: projectsAuthored, documents });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
