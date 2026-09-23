import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roles';
import prisma from '../db';

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

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function careersRouter() {
  const router = Router();

  // Public: only open roles. The frontend derives `isOpen` from `status`
  // plus `applicationDeadline`, so we just filter on status here.
  router.get('/', async (_req, res) => {
    const jobs = await prisma.jobPosting.findMany({
      where: { status: 'OPEN' },
      orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }]
    });
    res.json(jobs);
  });

  router.get('/admin', requireAuth, requireRoles('ADMIN', 'HR', 'MANAGER'), async (_req: AuthRequest, res) => {
    const jobs = await prisma.jobPosting.findMany({
      orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }]
    });
    res.json(jobs);
  });

  router.get('/:slug', async (req, res) => {
    const job = await prisma.jobPosting.findUnique({ where: { slug: req.params.slug } });
    if (!job || job.status !== 'OPEN') return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  });

  router.post('/', requireAuth, requireRoles('ADMIN', 'HR', 'MANAGER'), async (req: AuthRequest, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const data = parsed.data;
    const job = await prisma.jobPosting.create({
      data: {
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
        applicationDeadline: toDate(data.applicationDeadline),
        publishedAt: toDate(data.publishedAt),
        benefits: data.benefits,
        salaryRange: data.salaryRange ?? null,
        published: data.published,
        expiresAt: toDate(data.expiresAt)
      }
    });
    res.status(201).json(job);
  });

  router.put('/:id', requireAuth, requireRoles('ADMIN', 'HR', 'MANAGER'), async (req: AuthRequest, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const data = parsed.data;
    const job = await prisma.jobPosting.update({
      where: { id: req.params.id },
      data: {
        ...data,
        ...(data.title ? { slug: slugify(data.title) } : {}),
        ...(data.applicationDeadline !== undefined ? { applicationDeadline: toDate(data.applicationDeadline) } : {}),
        ...(data.publishedAt !== undefined ? { publishedAt: toDate(data.publishedAt) } : {}),
        ...(data.expiresAt !== undefined ? { expiresAt: toDate(data.expiresAt) } : {})
      }
    });
    res.json(job);
  });

  router.delete('/:id', requireAuth, requireRoles('ADMIN', 'HR'), async (req: AuthRequest, res) => {
    await prisma.jobPosting.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  });

  return router;
}
