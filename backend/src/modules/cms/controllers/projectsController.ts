import prisma from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { or } from '@prisma/orm-postgres/orm-client';
import { logAudit } from '../../../shared/services/audit';

const remapProject = (p: any) => {
    const { _type, ...rest } = p;
    return { ...rest, type: _type };
};

const withAuthor = (query: any) => query
    .include('author', (a: any) => a.select('id', 'firstName', 'lastName', 'role', 'avatarUrl'));

export const projectsController = {
    async create(data: any, user: any) {
        const p = await prisma.orm.public.Project.create({
            id: newId(),
            updatedAt: ts(),
            title: data.title,
            slug: data.slug,
            description: data.description,
            _type: data.type,
            images: data.images ?? null,
            demoUrl: data.demoUrl ?? null,
            repoUrl: data.repoUrl ?? null,
            techStack: data.techStack ?? null,
            authorId: data.authorId ?? null,
            published: data.published ?? false,
            industry: data.industry ?? null,
            featured: data.featured ?? false,
            seoTitle: data.seoTitle ?? null,
            seoDesc: data.seoDesc ?? null,
        });
        await logAudit({ action: 'create_project', entity: 'Project', entityId: p.id, actorId: user?.sub || null, actorRole: user?.role || null });
        return remapProject(p);
    },
    async list(options: any = {}) {
        let query: any = prisma.orm.public.Project;
        if (options.where && Object.keys(options.where).length > 0) query = query.where(options.where);
        const rows = await withAuthor(query)
            .orderBy((p: any) => p.createdAt.desc())
            .all();
        return rows.map(remapProject);
    },
    async get(identifier: string, options: any = {}) {
        let query: any = prisma.orm.public.Project;
        if (options.where && Object.keys(options.where).length > 0) query = query.where(options.where);
        query = query.where((p: any) => or(p.id.eq(identifier), p.slug.eq(identifier)));
        const row = await withAuthor(query).first();
        return row ? remapProject(row) : null;
    },
    async update(id: string, data: any, user: any) {
        const payload: any = {};
        for (const [k, v] of Object.entries(data)) {
            if (v === undefined) continue;
            if (k === 'type') payload._type = v;
            else payload[k] = v;
        }
        const p = await prisma.orm.public.Project.where({ id }).update(payload);
        await logAudit({ action: 'update_project', entity: 'Project', entityId: id, actorId: user?.sub || null, actorRole: user?.role || null });
        return p ? remapProject(p) : null;
    },
    async delete(id: string, user: any) {
        await prisma.orm.public.Project.where({ id }).delete();
        await logAudit({ action: 'delete_project', entity: 'Project', entityId: id, actorId: user?.sub || null, actorRole: user?.role || null });
    },
};
