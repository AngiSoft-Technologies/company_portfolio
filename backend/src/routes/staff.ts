import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export default function staffRouter(prisma: PrismaClient) {
    const router = Router();

    // GET /api/staff - List all public staff members (only those who have accepted invites)
    router.get('/', async (req, res) => {
        try {
            const staff = await prisma.employee.findMany({
                where: {
                    acceptedAt: { not: null }, // Only show staff who have accepted their invite
                    passwordHash: { not: null } // Only show active accounts
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    bio: true,
                    avatarUrl: true,
                    role: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' }
            });
            res.json(staff);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/staff/:id - Get individual staff member details
    router.get('/:id', async (req, res) => {
        try {
            const staff = await prisma.employee.findUnique({
                where: { id: req.params.id },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    bio: true,
                    avatarUrl: true,
                    role: true,
                    createdAt: true,
                    acceptedAt: true,
                    passwordHash: true, // Check if exists but don't return it
                    posts: {
                        where: { published: true },
                        select: {
                            id: true,
                            title: true,
                            slug: true,
                            publishedAt: true,
                            createdAt: true
                        },
                        orderBy: { publishedAt: 'desc' },
                        take: 5
                    },
                    services: {
                        where: { published: true },
                        select: {
                            id: true,
                            title: true,
                            slug: true,
                            description: true,
                            images: true
                        },
                        take: 5
                    }
                }
            });
            if (!staff || !staff.passwordHash || !staff.acceptedAt) {
                return res.status(404).json({ error: 'Staff member not found' });
            }
            // Remove passwordHash from response
            const { passwordHash, ...staffPublic } = staff;
            res.json(staffPublic);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}

