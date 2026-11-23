import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * DB-free unit specs for the CMS services extracted from
 * `modules/cms/controllers/*Controller.ts`.
 *
 * The mock uses the Prisma 8 contract shape (`prisma.orm.public.<Model>`)
 * established by `test/auth.spec.ts` / `test/testimonials.spec.ts`, so the
 * service layer's payloads, defaults, remapping and audit calls are verified
 * without touching a real database.
 */

const h = vi.hoisted(() => ({
    logAudit: vi.fn(async (_args: any) => undefined),
    store: {
        BlogPost: [],
        Project: [],
        ServiceCategory: [],
        Service: [],
        Testimonial: [],
        AuditLog: [],
    } as Record<string, any[]>,
}));

function queryable(model: string) {
    const rows = () => h.store[model] ?? [];
    const makeChain = (crit: any, state: { skip?: number; take?: number } = {}): any => {
        const filtered = () => {
            const base = rows();
            if (typeof crit === 'function' || crit == null) return base;
            const entries = Object.entries(crit);
            if (!entries.length) return base;
            return base.filter((row: any) => entries.every(([k, v]) => row[k] === v));
        };
        const page = () => {
            const list = filtered();
            const start = state.skip ?? 0;
            return state.take == null ? list.slice(start) : list.slice(start, start + state.take);
        };
        return {
            where: (c: any) => makeChain(
                crit != null && typeof crit === 'object' && c != null && typeof c === 'object'
                    ? { ...crit, ...c }
                    : c ?? crit,
                state,
            ),
            select: () => makeChain(crit, state),
            include: () => makeChain(crit, state),
            orderBy: () => makeChain(crit, state),
            limit: (n: number) => makeChain(crit, { ...state, take: Number(n) }),
            offset: (n: number) => makeChain(crit, { ...state, skip: Number(n) }),
            all: async () => page(),
            first: async () => page()[0] ?? null,
            count: async () => page().length,
            aggregate: async () => ({ n: page().length }),
            create: async (data: any) => {
                const row = { id: data?.id ?? `mock_${model}_${rows().length + 1}`, createdAt: new Date(), ...data };
                rows().push(row);
                return row;
            },
            update: async (data: any) => {
                const hit = filtered()[0];
                if (hit) Object.assign(hit, data);
                return hit ?? null;
            },
            delete: async () => {
                const hit = filtered()[0];
                if (hit) rows().splice(rows().indexOf(hit), 1);
                return hit ?? null;
            },
        };
    };
    return makeChain(undefined);
}

function ormFacade() {
    const publics: Record<string, unknown> = {};
    for (const model of Object.keys(h.store)) publics[model] = queryable(model);
    return { orm: { public: publics }, transaction: async (fn: any) => fn(ormFacade()) };
}

vi.mock('../src/prisma/db', () => ({
    db: ormFacade(),
    default: ormFacade(),
    ts: (value?: any) => typeof value === 'string' ? value : new Date(value ?? Date.now()).toISOString(),
    newId: () => `test_${Math.random().toString(36).slice(2)}`,
}));

vi.mock('../src/db', () => ({
    db: ormFacade(),
    default: ormFacade(),
    validateDatabaseConnection: async () => true,
    disconnectDatabase: async () => undefined,
}));

vi.mock('../src/shared/services/audit', () => ({ logAudit: h.logAudit }));

import { blogService } from '../src/modules/cms/services/blogService';
import { projectsService } from '../src/modules/cms/services/projectsService';
import { serviceCategoriesService } from '../src/modules/cms/services/serviceCategoriesService';
import { servicesService } from '../src/modules/cms/services/servicesService';
import { settingsService } from '../src/modules/cms/services/settingsService';
import { testimonialsService } from '../src/modules/cms/services/testimonialsService';
import { blogController } from '../src/modules/cms/controllers/blogController';
import { projectsController } from '../src/modules/cms/controllers/projectsController';
import { serviceCategoriesController } from '../src/modules/cms/controllers/serviceCategoriesController';
import { servicesController } from '../src/modules/cms/controllers/servicesController';
import { settingsController } from '../src/modules/cms/controllers/settingsController';
import { testimonialsController } from '../src/modules/cms/controllers/testimonialsController';

const store = h.store;
const actor = { sub: 'emp-1', role: 'ADMIN' };

beforeEach(() => {
    for (const model of Object.keys(store)) store[model] = [];
    h.logAudit.mockClear();
});

describe('cms service / controller compatibility aliases', () => {
    it('keeps every controller export pointing at the extracted service', () => {
        expect(blogController).toBe(blogService);
        expect(projectsController).toBe(projectsService);
        expect(serviceCategoriesController).toBe(serviceCategoriesService);
        expect(servicesController).toBe(servicesService);
        expect(settingsController).toBe(settingsService);
        expect(testimonialsController).toBe(testimonialsService);
    });
});

describe('blogService', () => {
    it('creates a post with the original defaults and audits the actor', async () => {
        const created = await blogService.create(
            { title: 'Post', slug: 'post', content: 'Body', authorId: actor.sub },
            actor,
        );
        expect(store.BlogPost[0]).toEqual(expect.objectContaining({
            id: created.id,
            title: 'Post',
            slug: 'post',
            content: 'Body',
            authorId: 'emp-1',
            published: false,
            contentType: 'article',
            visibilityType: 'permanent',
            tags: null,
            featured: false,
            publishedAt: null,
        }));
        expect(h.logAudit).toHaveBeenCalledWith({
            action: 'create_blog', entity: 'BlogPost', entityId: created.id,
            actorId: 'emp-1', actorRole: 'ADMIN',
        });
    });

    it('skips undefined fields and normalizes visibleUntil on update', async () => {
        store.BlogPost.push({ id: 'b1', visibleUntil: 'old', published: true });
        await blogService.update('b1', {
            title: 'New',
            published: undefined,
            visibleUntil: '2026-12-01T00:00:00.000Z',
        }, actor);
        expect(store.BlogPost[0]).toEqual(expect.objectContaining({
            title: 'New',
            visibleUntil: '2026-12-01T00:00:00.000Z',
            published: true,
        }));
        expect(h.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'update_blog', entityId: 'b1' }));

        await blogService.update('b1', { visibleUntil: null }, actor);
        expect(store.BlogPost[0].visibleUntil).toBeNull();
    });

    it('applies list filters and author include without changing the query shape', async () => {
        store.BlogPost.push(
            { id: 'b1', published: true, authorId: 'emp-1' },
            { id: 'b2', published: false, authorId: 'emp-2' },
        );
        const all = await blogService.list({});
        expect(all).toHaveLength(2);
        const filtered = await blogService.list({ where: { published: true } });
        expect(filtered.map((p: any) => p.id)).toEqual(['b1']);
    });
});

describe('projectsService', () => {
    it('writes type as _type and remaps it back on create', async () => {
        const created = await projectsService.create(
            { title: 'App', slug: 'app', description: 'd', type: 'SOFTWARE' },
            actor,
        );
        expect(store.Project[0]._type).toBe('SOFTWARE');
        expect(created.type).toBe('SOFTWARE');
        expect(created).not.toHaveProperty('_type');
        expect(h.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'create_project', entityId: created.id }));
    });

    it('remaps type to _type on update and remaps list/get results', async () => {
        store.Project.push({ id: 'p1', _type: 'REPORT', published: true });
        const updated = await projectsService.update('p1', { type: 'DATA_ANALYSIS', ignored: undefined }, actor);
        expect(store.Project[0]._type).toBe('DATA_ANALYSIS');
        expect(store.Project[0]).not.toHaveProperty('ignored');
        expect(updated?.type).toBe('DATA_ANALYSIS');
        const listed = await projectsService.list({});
        expect(listed[0]).toEqual(expect.objectContaining({ id: 'p1', type: 'DATA_ANALYSIS' }));
        expect(listed[0]).not.toHaveProperty('_type');
    });
});

describe('serviceCategoriesService', () => {
    it('applies create defaults and audits', async () => {
        const created = await serviceCategoriesService.create({ name: 'Web', slug: 'web' }, actor);
        expect(store.ServiceCategory[0]).toEqual(expect.objectContaining({
            id: created.id, name: 'Web', slug: 'web', description: null,
            icon: null, order: 0, published: true,
        }));
        expect(h.logAudit).toHaveBeenCalledWith(expect.objectContaining({
            action: 'create_service_category', entity: 'ServiceCategory', actorId: 'emp-1',
        }));
    });

    it('merges options.where with id on get', async () => {
        store.ServiceCategory.push(
            { id: 'c1', published: true },
            { id: 'c2', published: false },
        );
        const visible = await serviceCategoriesService.get('c1', { where: { published: true } });
        expect(visible?.id).toBe('c1');
        const hidden = await serviceCategoriesService.get('c2', { where: { published: true } });
        expect(hidden).toBeNull();
    });
});

describe('servicesService', () => {
    it('converts priceFrom to canonical money text and audits creation', async () => {
        const created = await servicesService.create({ title: 'S', slug: 's', priceFrom: 12.5 }, actor);
        expect(store.Service[0]).toEqual(expect.objectContaining({
            priceFrom: '12.50', category: 'General', currency: 'KES', images: [], features: [],
        }));
        expect(created.categoryRef).toBeUndefined();
        expect(h.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'create_service', entityId: created.id }));
    });

    it('converts priceFrom on update and remaps the relation on reads', async () => {
        store.Service.push({ id: 's1', slug: 's1', priceFrom: '0.00', categoryServiceCategory: { id: 'c1' } });
        await servicesService.update('s1', { priceFrom: 99.9, other: undefined }, actor);
        expect(store.Service[0].priceFrom).toBe('99.90');
        expect(store.Service[0]).not.toHaveProperty('other');
        const byId = await servicesService.get('s1', {});
        expect(byId).toEqual(expect.objectContaining({ id: 's1', categoryRef: { id: 'c1' } }));
        expect(byId).not.toHaveProperty('categoryServiceCategory');
    });

    it('resolves UUID identifiers as id and everything else as slug', async () => {
        const uuid = '123e4567-e89b-12d3-a456-426614174000';
        store.Service.push({ id: uuid, slug: 'by-slug' }, { id: 'other', slug: 'by-slug-2' });
        expect((await servicesService.get(uuid, {}))?.id).toBe(uuid);
        expect((await servicesService.get('by-slug', {}))?.id).toBe(uuid);
    });
});

describe('testimonialsService', () => {
    it('creates, audits and paginates exactly like the old controller', async () => {
        const created = await testimonialsService.create({ name: 'Jane', text: 'Great service' }, actor);
        expect(store.Testimonial[0]).toEqual(expect.objectContaining({ id: created.id, name: 'Jane' }));
        expect(h.logAudit).toHaveBeenCalledWith(expect.objectContaining({
            action: 'create_testimonial', entityId: created.id, actorId: 'emp-1',
        }));
        store.Testimonial.push({ id: 't2' }, { id: 't3' }, { id: 't4' });
        const page = await testimonialsService.list({ skip: 1, take: 2 });
        expect(page.map((t: any) => t.id)).toEqual(['t2', 't3']);
    });

    it('returns null on a failing read and still audits a successful delete', async () => {
        const missing = await testimonialsService.get('nope', {});
        expect(missing).toBeNull();
        store.Testimonial.push({ id: 't1' });
        await testimonialsService.delete('t1', actor);
        expect(store.Testimonial).toHaveLength(0);
        expect(h.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete_testimonial', entityId: 't1' }));
    });
});

describe('settingsService', () => {
    const fakeRes = () => {
        const res: any = {
            status: vi.fn(() => res),
            json: vi.fn(() => res),
        };
        return res;
    };

    it('validates keys before creating and reports environment-derived settings', async () => {
        const bad = fakeRes();
        await settingsService.create({ body: { key: 'bad key', value: 1 } } as any, bad);
        expect(bad.status).toHaveBeenCalledWith(400);

        const good = fakeRes();
        await settingsService.create({ body: { key: 'app.mode', value: 'on' } } as any, good);
        expect(good.status).toHaveBeenCalledWith(201);
        expect(good.json).toHaveBeenCalledWith({
            key: 'app.mode', value: 'on', message: 'Settings would be persisted',
        });

        const listed = fakeRes();
        await settingsService.list({} as any, listed);
        expect(listed.json).toHaveBeenCalledWith({ data: expect.objectContaining({
            apiVersion: process.env.API_VERSION || '1.0.0',
            maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
            stripeEnabled: !!process.env.STRIPE_SECRET,
            sentryEnabled: !!process.env.SENTRY_DSN,
        }) });
    });
});
