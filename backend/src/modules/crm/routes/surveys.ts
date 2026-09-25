import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireRoles } from '../../../shared/middleware/roles';
import db, { type Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';

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

const withResponseCount = (query: any) => query
    .include('surveyResponses', (r: any) => r.count());

const toSurveyRow = (s: any) => {
    const { surveyResponses, ...rest } = s;
    return { ...rest, _count: { responses: surveyResponses } };
};

export default function surveysRouter(prisma: Db = db) {
    const router = Router();

    router.get('/', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const surveys = await withResponseCount(prisma.orm.public.Survey)
            .orderBy((s: any) => s.createdAt.desc())
            .all();
        res.json(surveys.map(toSurveyRow));
    });

    router.get('/active', async (req, res) => {
        const surveys = await prisma.orm.public.Survey
            .where({ status: 'active' })
            .orderBy((s: any) => s.createdAt.desc())
            .all();
        res.json(surveys);
    });

    router.get('/:id', async (req, res) => {
        const survey = await withResponseCount(prisma.orm.public.Survey.where({ id: req.params.id })).first();
        if (!survey) return res.status(404).json({ error: 'Not found' });
        res.json(toSurveyRow(survey));
    });

    router.get('/:id/responses', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const responses = await prisma.orm.public.SurveyResponse
            .where({ surveyId: req.params.id })
            .orderBy((r: any) => r.createdAt.desc())
            .all();
        res.json(responses);
    });

    router.post('/', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const survey = await prisma.orm.public.Survey.create({
            id: newId(),
            title: parsed.data.title,
            description: parsed.data.description ?? null,
            audience: parsed.data.audience,
            status: parsed.data.status,
            questions: parsed.data.questions
        });
        res.status(201).json(survey);
    });

    router.put('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = createSchema.partial().safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const payload: any = {};
        for (const [k, v] of Object.entries(parsed.data)) {
            if (v === undefined) continue;
            payload[k] = v;
        }
        if (parsed.data.status === 'active') payload.publishedAt = ts();
        if (parsed.data.status === 'closed') payload.closedAt = ts();
        const survey = await prisma.orm.public.Survey.where({ id: req.params.id }).update(payload);
        res.json(survey);
    });

    router.post('/:id/respond', async (req, res) => {
        const { answers, respondentId } = req.body;
        if (!answers) return res.status(400).json({ error: 'Answers required' });
        const survey = await prisma.orm.public.Survey.where({ id: req.params.id }).first();
        if (!survey || survey.status !== 'active') return res.status(400).json({ error: 'Survey not active' });
        const response = await prisma.orm.public.SurveyResponse.create({
            id: newId(),
            surveyId: req.params.id,
            respondentId: respondentId ?? null,
            answers
        });
        res.status(201).json(response);
    });

    router.delete('/:id', requireAuth, requireRoles('ADMIN'), async (req: AuthRequest, res) => {
        await prisma.orm.public.Survey.where({ id: req.params.id }).delete();
        res.json({ ok: true });
    });

    return router;
}
