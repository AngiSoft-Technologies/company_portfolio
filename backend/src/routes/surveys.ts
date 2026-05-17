import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roles';
import prisma from '../db';

const createSchema = z.object({
    title: z.string().min(1),
    description: z.string().nullable().optional(),
    audience: z.string().default('clients'),
    status: z.string().default('draft'),
    questions: z.array(z.object({
        id: z.string().optional(),
        type: z.string(),
        label: z.string(),
        options: z.array(z.string()).optional(),
        required: z.boolean().optional()
    }))
});

export default function surveysRouter() {
    const router = Router();

    router.get('/', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const surveys = await prisma.survey.findMany({
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { responses: true } } }
        });
        res.json(surveys);
    });

    router.get('/active', async (req, res) => {
        const surveys = await prisma.survey.findMany({
            where: { status: 'active' },
            orderBy: { createdAt: 'desc' }
        });
        res.json(surveys);
    });

    router.get('/:id', async (req, res) => {
        const survey = await prisma.survey.findUnique({
            where: { id: req.params.id },
            include: { _count: { select: { responses: true } } }
        });
        if (!survey) return res.status(404).json({ error: 'Not found' });
        res.json(survey);
    });

    router.get('/:id/responses', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const responses = await prisma.surveyResponse.findMany({
            where: { surveyId: req.params.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(responses);
    });

    router.post('/', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const survey = await prisma.survey.create({ data: parsed.data });
        res.status(201).json(survey);
    });

    router.put('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = createSchema.partial().safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const survey = await prisma.survey.update({
            where: { id: req.params.id },
            data: {
                ...parsed.data,
                publishedAt: parsed.data.status === 'active' ? new Date() : undefined,
                closedAt: parsed.data.status === 'closed' ? new Date() : undefined
            }
        });
        res.json(survey);
    });

    router.post('/:id/respond', async (req, res) => {
        const { answers, respondentId } = req.body;
        if (!answers) return res.status(400).json({ error: 'Answers required' });
        const survey = await prisma.survey.findUnique({ where: { id: req.params.id } });
        if (!survey || survey.status !== 'active') return res.status(400).json({ error: 'Survey not active' });
        const response = await prisma.surveyResponse.create({
            data: { surveyId: req.params.id, respondentId, answers }
        });
        res.status(201).json(response);
    });

    router.delete('/:id', requireAuth, requireRoles('ADMIN'), async (req: AuthRequest, res) => {
        await prisma.survey.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    });

    return router;
}
