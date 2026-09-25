import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireRoles } from '../../../shared/middleware/roles';
import db, { type Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';

const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'FILLED', 'ON_HOLD', 'ARCHIVED']).default('DRAFT'),
  department: z.string().nullable().optional(),
  location: z.string().default('Nairobi, Kenya'),
  employmentType: z.string().nullable().optional(),
  workplaceType: z.string().nullable().optional(),
  experienceLevel: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  description: z.string().min(1),
  responsibilities: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  preferredQualifications: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  salaryMin: z.number().int().nullable().optional(),
  salaryMax: z.number().int().nullable().optional(),
  salaryCurrency: z.string().default('KES'),
  salaryVisibility: z.enum(['HIDDEN', 'RANGE', 'EXACT']).default('RANGE'),
  openings: z.number().int().nullable().optional(),
  featured: z.boolean().default(false),
  applicationDeadline: z.string().datetime().nullable().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  benefits: z.array(z.string()).default([]),
  salaryRange: z.string().nullable().optional(),
  published: z.boolean().default(false),
  expiresAt: z.string().datetime().nullable().optional()
});

const updateSchema = createSchema.partial();

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function toTs(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : ts(parsed);
}

const remapJob = (j: any) => {
  const { _type, ...rest } = j;
  return { ...rest, type: _type };
};

export default function careersRouter(prisma: Db = db) {
  const router = Router();

  // Public: only open roles. The frontend derives `isOpen` from `status`
  // plus `applicationDeadline`, so we just filter on status here.
  router.get('/', async (_req, res) => {
    const jobs = await prisma.orm.public.JobPosting
      .where({ status: 'OPEN' })
      .orderBy([
        (j: any) => j.featured.desc(),
        (j: any) => j.publishedAt.desc(),
        (j: any) => j.createdAt.desc()
      ])
      .all();
    res.json(jobs.map(remapJob));
  });

  router.get('/admin', requireAuth, requireRoles('ADMIN', 'HR', 'MANAGER'), async (_req: AuthRequest, res) => {
    const jobs = await prisma.orm.public.JobPosting
      .orderBy([
        (j: any) => j.featured.desc(),
        (j: any) => j.publishedAt.desc(),
        (j: any) => j.createdAt.desc()
      ])
      .all();
    res.json(jobs.map(remapJob));
  });

  router.get('/:slug', async (req, res) => {
    const job = await prisma.orm.public.JobPosting.where({ slug: req.params.slug }).first();
    if (!job || job.status !== 'OPEN') return res.status(404).json({ error: 'Job not found' });
    res.json(remapJob(job));
  });

  router.post('/', requireAuth, requireRoles('ADMIN', 'HR', 'MANAGER'), async (req: AuthRequest, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const data = parsed.data;
    const job = await prisma.orm.public.JobPosting.create({
      id: newId(),
      updatedAt: ts(),
      title: data.title,
      slug: data.slug || slugify(data.title),
      status: data.status,
      department: data.department ?? null,
      location: data.location,
      employmentType: data.employmentType ?? null,
      workplaceType: data.workplaceType ?? null,
      experienceLevel: data.experienceLevel ?? null,
      summary: data.summary ?? null,
      description: data.description,
      responsibilities: data.responsibilities,
      requirements: data.requirements,
      preferredQualifications: data.preferredQualifications,
      technologies: data.technologies,
      salaryMin: data.salaryMin ?? null,
      salaryMax: data.salaryMax ?? null,
      salaryCurrency: data.salaryCurrency,
      salaryVisibility: data.salaryVisibility,
      openings: data.openings ?? null,
      featured: data.featured,
      applicationDeadline: toTs(data.applicationDeadline),
      publishedAt: toTs(data.publishedAt),
      benefits: data.benefits,
      salaryRange: data.salaryRange ?? null,
      published: data.published,
      expiresAt: toTs(data.expiresAt)
    });
    res.status(201).json(remapJob(job));
  });

  router.put('/:id', requireAuth, requireRoles('ADMIN', 'HR', 'MANAGER'), async (req: AuthRequest, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const data = parsed.data;
    const payload: any = {};
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue;
      if (k === 'applicationDeadline' || k === 'publishedAt' || k === 'expiresAt') payload[k] = toTs(v as string | null);
      else payload[k] = v;
    }
    if (data.title) payload.slug = slugify(data.title);
    const job = await prisma.orm.public.JobPosting.where({ id: req.params.id }).update(payload);
    res.json(job ? remapJob(job) : null);
  });

  router.delete('/:id', requireAuth, requireRoles('ADMIN', 'HR'), async (req: AuthRequest, res) => {
    await prisma.orm.public.JobPosting.where({ id: req.params.id }).delete();
    res.json({ ok: true });
  });

  return router;
}
