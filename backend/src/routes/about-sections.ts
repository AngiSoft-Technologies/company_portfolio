import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roles';
import { asyncHandler } from '../middleware/errorHandler';
import prisma from '../db';

// About sections are composed marketing blocks. Each row has a stable `key`
// the frontend looks up (hero, intro, numberStories, geography, timeline,
// industries, clients, clientStats, clientHighlights, serviceGallery,
// solutionTypes, whyGuarantee, fullServices, pricing, merchandise,
// technologies, quotation, cta). `content` is a free-form JSON payload whose
// shape varies per section.
const createSchema = z.object({
    key: z.string().min(1),
    title: z.string().min(1),
    order: z.number().int().default(0),
    published: z.boolean().default(true),
    content: z.any().default({})
});

const updateSchema = createSchema.partial();

export default function aboutSectionsRouter() {
    const router = Router();

    // Public list — only published sections, ordered for the page composer.
    router.get('/', asyncHandler(async (_req, res) => {
        const sections = await prisma.aboutSection.findMany({
            where: { published: true },
            orderBy: { order: 'asc' }
        });
        res.json(sections);
    }));

    // Admin list — all sections regardless of publish state.
    router.get('/admin', requireAuth, requireRoles('ADMIN', 'MARKETING', 'CONTENT_CREATOR'), asyncHandler(async (_req: AuthRequest, res) => {
        const sections = await prisma.aboutSection.findMany({
            orderBy: { order: 'asc' }
        });
        res.json(sections);
    }));

    router.post('/', requireAuth, requireRoles('ADMIN', 'MARKETING', 'CONTENT_CREATOR'), asyncHandler(async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const section = await prisma.aboutSection.create({
            data: {
                key: parsed.data.key,
                title: parsed.data.title,
                order: parsed.data.order,
                published: parsed.data.published,
                content: parsed.data.content ?? {}
            }
        });
        res.status(201).json(section);
    }));

    router.put('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING', 'CONTENT_CREATOR'), asyncHandler(async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const section = await prisma.aboutSection.update({
            where: { id: req.params.id },
            data: parsed.data
        });
        res.json(section);
    }));

    // Upsert by key — convenient for the CMS "save this section by key" flow.
    router.put('/key/:key', requireAuth, requireRoles('ADMIN', 'MARKETING', 'CONTENT_CREATOR'), asyncHandler(async (req: AuthRequest, res) => {
        const { key } = req.params;
        const parsed = updateSchema.omit({ key: true }).safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const existing = await prisma.aboutSection.findUnique({ where: { key } });
        const section = existing
            ? await prisma.aboutSection.update({ where: { key }, data: parsed.data })
            : await prisma.aboutSection.create({ data: { key, ...parsed.data } as any });
        res.json(section);
    }));

    router.delete('/:id', requireAuth, requireRoles('ADMIN'), asyncHandler(async (req: AuthRequest, res) => {
        await prisma.aboutSection.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }));

    return router;
}
