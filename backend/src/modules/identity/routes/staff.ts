import { Router } from 'express';
import type { Db } from '../../../db';
import { or } from '@prisma/orm-postgres/orm-client';

const publicProfileFields = [
    'id',
    'username',
    'firstName',
    'lastName',
    'role',
    'publicTitle',
    'publicSummary',
    'bio',
    'avatarUrl',
    'location',
    'websiteUrl',
    'linkedinUrl',
    'twitterUrl',
    'githubUrl',
    'skills',
    'specialties',
    'publicEmail',
    'publicPhone',
    'profileVisibility',
    'department',
    'seniorityLevel',
    'joinYear',
    'featured',
    'profileOrder',
    'createdAt',
] as const;

export default function staffRouter(prisma: Db) {
    const router = Router();

    router.get('/', async (req, res) => {
        try {
            const staff = await prisma.orm.public.Employee
                .where((e) => e.acceptedAt.isNotNull())
                .where((e) => e.passwordHash.isNotNull())
                .where((e) => e.profileVisibility.eq('PUBLIC'))
                .select(...publicProfileFields)
                .orderBy([(e) => e.profileOrder.asc(), (e) => e.createdAt.desc()])
                .all();
            res.json(staff);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/:usernameOrId', async (req, res) => {
        try {
            const { usernameOrId } = req.params;
            const staffMember = await prisma.orm.public.Employee
                .where((e) => or(e.username.eq(usernameOrId), e.id.eq(usernameOrId)))
                .where((e) => e.acceptedAt.isNotNull())
                .where((e) => e.passwordHash.isNotNull())
                .where((e) => e.profileVisibility.eq('PUBLIC'))
                .select(...publicProfileFields)
                .include('blogPosts', (posts) => posts
                    .where({ published: true })
                    .select('id', 'title', 'slug', 'publishedAt', 'createdAt')
                    .orderBy([(p) => p.publishedAt.desc(), (p) => p.createdAt.desc()])
                    .limit(5))
                .include('services', (services) => services
                    .where({ published: true })
                    .select('id', 'title', 'slug', 'description', 'images')
                    .orderBy((s) => s.createdAt.desc())
                    .limit(5))
                .include('projects', (projects) => projects
                    .where({ published: true })
                    .select('id', 'title', 'slug', 'description', 'images', 'techStack')
                    .orderBy((p) => p.createdAt.desc())
                    .limit(5))
                .first();

            if (!staffMember) {
                return res.status(404).json({ error: 'Staff member not found' });
            }

            // P7 `metadata: { path: ['public'], equals: true }` has no P8
            // equivalent — match the JSONB path with raw SQL, then fetch rows.
            const docPlan = prisma.raw.sql`SELECT "id" FROM "File" WHERE "ownerType" = 'employee_document' AND "ownerId" = ${staffMember.id} AND "metadata"->'public' = 'true'::jsonb ORDER BY "createdAt" DESC`
                .returnsRow({ id: prisma.sql.public.File.columns.id })
                .build();
            const idRows = (await prisma.runtime().query(docPlan)) as any[];
            const docIds = idRows.map((r) => r.id);
            const docRows = docIds.length
                ? await prisma.orm.public.File
                    .where((f) => f.id.in(docIds))
                    .select('id', 'filename', 'url', 'mime', 'metadata', 'createdAt')
                    .all()
                : [];
            const docsById = new Map(docRows.map((d: any) => [d.id, d]));
            const documents = docIds.map((id) => docsById.get(id)).filter(Boolean);

            const { blogPosts, services, projects, ...staffPublic } = staffMember as any;
            res.json({ ...staffPublic, posts: blogPosts, services, projects, documents });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
