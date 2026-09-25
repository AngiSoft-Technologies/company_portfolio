import { Router } from 'express';
import { z } from 'zod';
import db, { type Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { asyncHandler } from '../../../shared/middleware/errorHandler';
import { requireAuth } from '../../../shared/middleware/auth';
import { requireRoles } from '../../../shared/middleware/roles';

/*
|--------------------------------------------------------------------------
| About page sections (headless CMS)
|--------------------------------------------------------------------------
|
| Each row is one editorial section. The frontend hook
| (useAboutPage.buildAboutFromSections) reads a list of rows and expects
| exactly these fields per row:
|   {
|     id:        string,
|     key:       string,   // one of the 26 canonical ABOUT_SECTION_KEYS
|     enabled:   boolean,  // drives the `enabled !== false` filter
|     sortOrder: number,   // drives the page composer ordering
|     content:   object    // section-specific payload
|   }
|
| Public consumers receive only enabled sections, ordered by sortOrder.
|
*/

// Serializer: maps a Prisma AboutSection row to the shape the frontend needs.
const serializeSection = (row: any) => ({
  id: row.id,
  key: row.key,
  enabled: row.enabled,
  sortOrder: row.sortOrder,
  content: row.content,
});

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/

const sectionKeySchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9_-]+$/, 'key must be alphanumeric with optional dashes/underscores');

const createSectionSchema = z.object({
  key: sectionKeySchema,
  title: z.string().min(1).max(200),
  enabled: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).max(9999).optional().default(0),
  content: z.any().default({}),
});

const updateSectionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  content: z.any().optional(),
});

const reorderSchema = z.array(
  z.object({
    key: sectionKeySchema,
    sortOrder: z.number().int().min(0).max(9999),
  })
);

/*
|--------------------------------------------------------------------------
| Public access — no auth required, enabled sections only
|--------------------------------------------------------------------------
*/

export const aboutSectionsRouter = (prisma: Db = db) => {
  const router = Router();

  // GET /api/about-sections
  // Returns the enabled, ordered section list used to compose the About page.
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const sections = await prisma.orm.public.AboutSection
        .where({ enabled: true })
        .orderBy((s: any) => s.sortOrder.asc())
        .all();

      const payload = sections.map(serializeSection);

      // Support both an array response and a wrapped { data: [...] } response
      // so older frontend integrations keep working.
      res.json({ data: payload });
    })
  );

  /*
  |------------------------------------------------------------------------
  | Admin access — full CRUD behind authentication + RBAC
  |------------------------------------------------------------------------
  */

  const admin = Router();
  admin.use(requireAuth, requireRoles('ADMIN', 'MARKETING', 'CONTENT_CREATOR'));

  // List all sections (including disabled) for the CMS.
  admin.get(
    '/',
    asyncHandler(async (_req, res) => {
      const sections = await prisma.orm.public.AboutSection
        .orderBy((s: any) => s.sortOrder.asc())
        .all();
      res.json({ data: sections.map(serializeSection) });
    })
  );

  // Create a new section.
  admin.post(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = createSectionSchema.parse(req.body);
      const existing = await prisma.orm.public.AboutSection.where({ key: parsed.key }).first();
      if (existing) {
        throw Object.assign(new Error(`A section with key "${parsed.key}" already exists`), { statusCode: 409 });
      }
      const created = await prisma.orm.public.AboutSection.create({
        id: newId(),
        updatedAt: ts(),
        key: parsed.key,
        title: parsed.title,
        enabled: parsed.enabled,
        sortOrder: parsed.sortOrder,
        content: parsed.content
      });
      res.status(201).json(serializeSection(created));
    })
  );

  // Update a section by key.
  admin.patch(
    '/:key',
    asyncHandler(async (req, res) => {
      const { key } = req.params;
      const parsed = updateSectionSchema.parse(req.body);
      const existing = await prisma.orm.public.AboutSection.where({ key }).first();
      if (!existing) {
        throw Object.assign(new Error(`Section "${key}" not found`), { statusCode: 404 });
      }
      const payload: any = {};
      for (const [k, v] of Object.entries(parsed)) if (v !== undefined) payload[k] = v;
      const updated = await prisma.orm.public.AboutSection.where({ key }).update(payload);
      res.json(serializeSection(updated));
    })
  );

  // Replace a section's content by key (used by the CMS editor).
  admin.put(
    '/:key',
    asyncHandler(async (req, res) => {
      const { key } = req.params;
      const existing = await prisma.orm.public.AboutSection.where({ key }).first();
      if (!existing) {
        throw Object.assign(new Error(`Section "${key}" not found`), { statusCode: 404 });
      }
      const data = updateSectionSchema.parse(req.body);
      const payload: any = {};
      for (const [k, v] of Object.entries(data)) if (v !== undefined) payload[k] = v;
      const updated = await prisma.orm.public.AboutSection.where({ key }).update(payload);
      res.json(serializeSection(updated));
    })
  );

  // Delete a section by key.
  admin.delete(
    '/:key',
    asyncHandler(async (req, res) => {
      const { key } = req.params;
      const existing = await prisma.orm.public.AboutSection.where({ key }).first();
      if (!existing) {
        throw Object.assign(new Error(`Section "${key}" not found`), { statusCode: 404 });
      }
      await prisma.orm.public.AboutSection.where({ key }).delete();
      res.status(204).end();
    })
  );

  // Bulk reorder by keys.
  admin.post(
    '/reorder',
    asyncHandler(async (req, res) => {
      const order = reorderSchema.parse(req.body);
      await prisma.transaction(async (tx) => {
        for (const { key, sortOrder } of order) {
          await tx.orm.public.AboutSection.where({ key }).update({ sortOrder });
        }
      });
      const sections = await prisma.orm.public.AboutSection
        .orderBy((s: any) => s.sortOrder.asc())
        .all();
      res.json({ data: sections.map(serializeSection) });
    })
  );

  router.use('/admin', admin);

  return router;
};

export default aboutSectionsRouter;
