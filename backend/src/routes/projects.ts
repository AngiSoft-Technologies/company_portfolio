import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { optionalAuth, requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles, isRole } from '../middleware/roles';
import { projectsController } from '../controllers/projectsController';

const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  type: z.string().optional(),
  images: z.array(z.string()).optional(),
  demoUrl: z.string().optional(),
  repoUrl: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  published: z.boolean().optional()
});

const updateSchema = createSchema.partial();

export default function projectsRouter() {
    const router = Router();

    router.get('/', optionalAuth, async (req: AuthRequest, res) => {
        try {
            const includeAll = isRole(req, ['ADMIN', 'MARKETING']);
            const isDeveloper = isRole(req, ['DEVELOPER']);
            const projects = await projectsController.list({
                where: includeAll ? {} : (isDeveloper ? { authorId: req.user?.sub } : { published: true }),
                include: {
                    author: { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true } }
                }
            });
            res.json(projects);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
        try {
            const includeAll = isRole(req, ['ADMIN', 'MARKETING']);
            const isDeveloper = isRole(req, ['DEVELOPER']);
            const project = await projectsController.get(req.params.id, {
                where: includeAll
                    ? { id: req.params.id }
                    : (isDeveloper ? { id: req.params.id, authorId: req.user?.sub } : { id: req.params.id, published: true }),
                include: {
                    author: { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true } }
                }
            });
            if (!project) return res.status(404).json({ error: 'Not found' });
            res.json(project);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/', requireAuth, requireRoles('ADMIN', 'MARKETING', 'DEVELOPER'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const created = await projectsController.create({
                ...parsed.data,
                authorId: req.user?.sub || undefined
            }, req.user);
            res.status(201).json(created);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const canManageAll = isRole(req, ['ADMIN', 'MARKETING']);
            if (!canManageAll) {
                const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
                if (!existing || existing.authorId !== req.user?.sub) {
                    return res.status(403).json({ error: 'Not authorized' });
                }
            }
            const updated = await projectsController.update(req.params.id, parsed.data, req.user);
            res.json(updated);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
        try {
            const canManageAll = isRole(req, ['ADMIN', 'MARKETING']);
            if (!canManageAll) {
                const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
                if (!existing || existing.authorId !== req.user?.sub) {
                    return res.status(403).json({ error: 'Not authorized' });
                }
            }
            await projectsController.delete(req.params.id, req.user);
            res.json({ ok: true });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
