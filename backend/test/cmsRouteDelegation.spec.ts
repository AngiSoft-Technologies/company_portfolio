import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Verifies that CMS route handlers now delegate persistence to the service
 * layer. Service modules are replaced with spies so a handler can only pass
 * these specs if it calls the service rather than touching Prisma itself.
 */

const h = vi.hoisted(() => ({
    has: vi.fn(async (_ctx: any, _permission: string) => false),
    blog: {
        list: vi.fn(async (_options?: any) => [] as any[]),
        get: vi.fn(async (_id: string, _options?: any) => null as any),
        create: vi.fn(async (data: any) => ({ id: 'new', ...data })),
        update: vi.fn(async (id: string, data: any) => ({ id, ...data })),
        delete: vi.fn(async (_id: string, _user?: any) => undefined),
    },
    services: {
        list: vi.fn(async (_options?: any) => [] as any[]),
        get: vi.fn(async (_id: string, _options?: any) => null as any),
        create: vi.fn(async (data: any) => ({ id: 'new', ...data })),
        update: vi.fn(async (id: string, data: any) => ({ id, ...data })),
        delete: vi.fn(async (_id: string, _user?: any) => undefined),
    },
    categories: {
        list: vi.fn(async (_options?: any) => [] as any[]),
        get: vi.fn(async (_id: string, _options?: any) => null as any),
        create: vi.fn(async (data: any) => ({ id: 'new', ...data })),
        update: vi.fn(async (id: string, data: any) => ({ id, ...data })),
        delete: vi.fn(async (_id: string, _user?: any) => undefined),
    },
    testimonials: {
        list: vi.fn(async (_options?: any) => [] as any[]),
        get: vi.fn(async (_id: string, _options?: any) => null as any),
        create: vi.fn(async (data: any) => ({ id: 'new', ...data })),
        update: vi.fn(async (id: string, data: any) => ({ id, ...data })),
        delete: vi.fn(async (_id: string, _user?: any) => undefined),
    },
    settings: {
        create: vi.fn(async (_data: any, _user?: any) => ({ id: 'setting' })),
        list: vi.fn(async () => []),
        get: vi.fn(async (_id: string) => null),
        update: vi.fn(async (_id: string, _data: any, _user?: any) => null),
        delete: vi.fn(async (_id: string, _user?: any) => undefined),
    },
}));

function queryable() {
    const chain: any = {
        where: () => chain,
        include: () => chain,
        orderBy: () => chain,
        limit: () => chain,
        offset: () => chain,
        select: () => chain,
        first: async () => ({ id: 'existing', authorId: 'emp-1', name: 'Existing' }),
        all: async () => [],
        update: async (data: any) => ({ id: 'existing', ...data }),
        updateAndCount: async () => ({ count: 1 }),
    };
    return chain;
}

function ormFacade() {
    const publics = new Proxy({}, { get: () => queryable() });
    return { orm: { public: publics }, transaction: async (fn: any) => fn(ormFacade()) };
}

vi.mock('../src/db', () => ({
    db: ormFacade(),
    default: ormFacade(),
    validateDatabaseConnection: async () => true,
    disconnectDatabase: async () => undefined,
}));

vi.mock('../src/prisma/db', () => ({
    db: ormFacade(),
    default: ormFacade(),
    ts: (value?: any) => typeof value === 'string' ? value : new Date(value ?? Date.now()).toISOString(),
    newId: () => 'test-id',
}));

vi.mock('../src/shared/middleware/auth', () => {
    const withUser = (req: any, _res: any, next: any) => {
        req.user = { sub: 'emp-1', role: 'ADMIN' };
        next();
    };
    return { requireAuth: withUser, optionalAuth: withUser };
});

vi.mock('../src/shared/middleware/roles', () => ({
    requireAccess: () => (_req: any, _res: any, next: any) => next(),
    requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../src/modules/identity/services/effectivePermissions', () => ({
    has: h.has,
    isDenied: async () => false,
}));

vi.mock('../src/modules/cms/services/blogService', () => ({ blogService: h.blog }));
vi.mock('../src/modules/cms/services/servicesService', () => ({ servicesService: h.services }));
vi.mock('../src/modules/cms/services/serviceCategoriesService', () => ({ serviceCategoriesService: h.categories }));
vi.mock('../src/modules/cms/services/testimonialsService', () => ({ testimonialsService: h.testimonials }));
vi.mock('../src/modules/cms/services/settingsService', () => ({ settingsService: h.settings }));

let app: any;
let request: any;

beforeAll(async () => {
    const express = (await import('express')).default;
    const supertest = (await import('supertest')).default;
    const { default: blogsRouter } = await import('../src/modules/cms/routes/blogs');
    const { default: servicesRouter } = await import('../src/modules/cms/routes/services');
    const { default: categoriesRouter } = await import('../src/modules/cms/routes/service-categories');
    const { default: testimonialsRouter } = await import('../src/modules/cms/routes/testimonials');
    const { default: settingsRouter } = await import('../src/modules/cms/routes/settings');

    app = express();
    app.use(express.json());
    app.use('/v1/blogs', blogsRouter());
    app.use('/v1/services', servicesRouter());
    app.use('/v1/service-categories', categoriesRouter());
    app.use('/v1/testimonials', testimonialsRouter());
    app.use('/v1/settings', settingsRouter());
    request = supertest;
});

beforeEach(() => {
    h.has.mockReset().mockResolvedValue(false);
    for (const group of [h.blog, h.services, h.categories, h.testimonials, h.settings]) {
        for (const spy of Object.values(group)) spy.mockClear();
    }
    h.blog.get.mockResolvedValue({ id: 'b1', published: true, authorId: 'emp-1' });
    h.services.get.mockResolvedValue({ id: 's1', published: true, authorId: 'emp-1' });
    h.categories.get.mockResolvedValue({ id: 'c1', published: true });
    h.testimonials.get.mockResolvedValue({ id: 't1' });
});

describe('CMS route handlers delegate to services', () => {
    it('blog routes call blogService for list/get/create/update/delete', async () => {
        const listed = await request(app).get('/v1/blogs');
        expect(listed.status).toBe(200);
        expect(h.blog.list).toHaveBeenCalledWith({ where: { published: true } });

        const got = await request(app).get('/v1/blogs/b1');
        expect(got.status).toBe(200);
        expect(h.blog.get).toHaveBeenCalledWith('b1', {});

        const created = await request(app)
            .post('/v1/blogs')
            .send({ title: 'Post', slug: 'post', content: 'Body' });
        expect(created.status).toBe(201);
        expect(h.blog.create).toHaveBeenCalledTimes(1);
        expect(h.blog.create.mock.calls[0][0]).toEqual(expect.objectContaining({
            title: 'Post', slug: 'post', content: 'Body', authorId: 'emp-1',
        }));

        const updated = await request(app).put('/v1/blogs/b1').send({ title: 'New' });
        expect(updated.status).toBe(200);
        expect(h.blog.update).toHaveBeenCalledWith('b1', expect.objectContaining({ title: 'New' }), expect.anything());

        const deleted = await request(app).delete('/v1/blogs/b1');
        expect(deleted.status).toBe(200);
        expect(h.blog.delete).toHaveBeenCalledWith('b1', expect.anything());
    });

    it('service routes call servicesService for list/get/create', async () => {
        expect((await request(app).get('/v1/services')).status).toBe(200);
        expect(h.services.list).toHaveBeenCalledWith({ where: { published: true } });

        expect((await request(app).get('/v1/services/s1')).status).toBe(200);
        expect(h.services.get).toHaveBeenCalledWith('s1', { where: { published: true } });

        const created = await request(app)
            .post('/v1/services')
            .send({ title: 'Service', slug: 'service' });
        expect(created.status).toBe(201);
        expect(h.services.create).toHaveBeenCalledTimes(1);
        expect(h.services.create.mock.calls[0][0]).toEqual(expect.objectContaining({ title: 'Service' }));
    });

    it('category routes call serviceCategoriesService for list/get', async () => {
        expect((await request(app).get('/v1/service-categories')).status).toBe(200);
        expect(h.categories.list).toHaveBeenCalledWith({ where: { published: true } });

        expect((await request(app).get('/v1/service-categories/c1')).status).toBe(200);
        expect(h.categories.get).toHaveBeenCalledWith('c1', {
            where: { id: 'c1', published: true },
        });
    });

    it('testimonial routes call testimonialsService for list/get/create', async () => {
        expect((await request(app).get('/v1/testimonials')).status).toBe(200);
        expect(h.testimonials.list).toHaveBeenCalledWith({
            where: { confirmed: true, rejected: false },
        });

        expect((await request(app).get('/v1/testimonials/t1')).status).toBe(200);
        expect(h.testimonials.get).toHaveBeenCalledWith('t1', {
            where: { id: 't1', confirmed: true },
        });

        const created = await request(app)
            .post('/v1/testimonials')
            .send({ name: 'Jane', text: 'Great work delivered on time.' });
        expect(created.status).toBe(201);
        expect(h.testimonials.create).toHaveBeenCalledTimes(1);
    });

    it('settings CRUD router delegates to settingsService', async () => {
        const created = await request(app).post('/v1/settings').send({ key: 'app.name', value: 'AngiSoft' });
        expect(created.status).toBe(201);
        // createCrudRouter mounts the service without an auth middleware, so
        // the user argument is undefined here — same as before the extraction.
        expect(h.settings.create).toHaveBeenCalledWith(
            { key: 'app.name', value: 'AngiSoft' },
            undefined,
        );
        expect((await request(app).get('/v1/settings')).status).toBe(200);
        expect(h.settings.list).toHaveBeenCalled();
    });
});
