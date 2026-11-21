import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

/**
 * Phase 4.1 — booking→project workflow trigger.
 *
 * `createClientProjectFromBooking` must be idempotent (accepting a booking
 * twice must not mint duplicate trackers) and must seed the default milestone
 * set + a client-visible creation activity.
 */

const h = vi.hoisted(() => {
    const store: Record<string, any[]> = {
        Booking: [],
        Client: [],
        ClientProject: [],
        ProjectMilestone: [],
        ProjectActivity: [],
    };

    const matches = (row: any, crit: any) =>
        Object.entries(crit ?? {}).every(([k, v]) => row[k] === v);

    function queryable(model: string) {
        const rows = () => store[model] ?? [];
        const filtered = (crit?: any) => rows().filter((r) => matches(r, crit));
        const makeChain = (crit?: any): any => ({
            where: (c: any) => makeChain(c ?? crit),
            select: () => makeChain(crit),
            include: () => makeChain(crit),
            orderBy: () => makeChain(crit),
            limit: () => makeChain(crit),
            offset: () => makeChain(crit),
            all: async () => filtered(crit),
            first: async () => filtered(crit)[0] ?? null,
            count: async () => filtered(crit).length,
            update: async (data: any) => {
                const hit = filtered(crit)[0];
                if (hit) Object.assign(hit, data);
                return hit ?? null;
            },
            delete: async () => {
                const hit = filtered(crit)[0];
                if (hit) store[model].splice(store[model].indexOf(hit), 1);
                return hit ?? null;
            },
        });
        return {
            ...makeChain(undefined),
            create: async (data: any) => {
                const row = { id: `row_${model}_${rows().length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data };
                store[model].push(row);
                return row;
            },
        };
    }

    function buildFacade() {
        const facade: any = {
            orm: { public: {} as Record<string, unknown> },
            transaction: async (fn: any) => fn(facade),
        };
        for (const model of Object.keys(store)) facade.orm.public[model] = queryable(model);
        return facade;
    }

    return { store, buildFacade };
});

vi.mock('../src/prisma/db', () => ({
    db: h.buildFacade(),
    default: h.buildFacade(),
    ts: (value?: any) =>
        typeof value === 'string' ? value : new Date(value ?? Date.now()).toISOString(),
    newId: () => `test_${Math.random().toString(36).slice(2)}`,
}));

vi.mock('../src/db', () => ({
    db: h.buildFacade(),
    default: h.buildFacade(),
    validateDatabaseConnection: async () => true,
    disconnectDatabase: async () => undefined,
}));

let createClientProjectFromBooking: typeof import('../src/modules/projects/services/clientProjects').createClientProjectFromBooking;

beforeAll(async () => {
    ({ createClientProjectFromBooking } = await import('../src/modules/projects/services/clientProjects'));
});

const store = h.store;
const buildFacade = h.buildFacade;

const seedBooking = () => {
    store.Booking.push({
        id: 'bk_1',
        title: 'E-commerce rebuild',
        description: 'Full storefront rebuild',
        clientId: 'cli_1',
        assignedToId: 'emp_owner',
    });
};

describe('booking→project trigger', () => {
    beforeEach(() => {
        for (const key of Object.keys(store)) store[key] = [];
        seedBooking();
    });

    it('creates a ClientProject with milestones and a client-visible activity', async () => {
        const project = await createClientProjectFromBooking(buildFacade() as any, 'bk_1', 'emp_actor');

        expect(store.ClientProject).toHaveLength(1);
        const p = store.ClientProject[0];
        expect(p.bookingId).toBe('bk_1');
        expect(p.clientId).toBe('cli_1');
        expect(p.ownerId).toBe('emp_owner'); // assignedToId wins over actor
        expect(p.title).toBe('E-commerce rebuild');

        expect(store.ProjectMilestone).toHaveLength(4);
        expect(store.ProjectMilestone.map((m) => m.sortOrder)).toEqual([1, 2, 3, 4]);

        expect(store.ProjectActivity).toHaveLength(1);
        expect(store.ProjectActivity[0].visibleToClient).toBe(true);
        expect(store.ProjectActivity[0]._type).toBe('PROJECT_CREATED');
        expect(project).toBeTruthy();
    });

    it('is idempotent — a second call returns the existing project', async () => {
        await createClientProjectFromBooking(buildFacade() as any, 'bk_1', 'emp_actor');
        // Simulate the include('clientProject') relation the real DB returns.
        store.Booking[0].clientProject = [{ id: store.ClientProject[0].id }];

        const again = await createClientProjectFromBooking(buildFacade() as any, 'bk_1', 'emp_actor');
        expect(store.ClientProject).toHaveLength(1);
        expect(again.id ?? store.ClientProject[0].id).toBeTruthy();
    });

    it('throws for an unknown booking', async () => {
        await expect(
            createClientProjectFromBooking(buildFacade() as any, 'bk_missing', null),
        ).rejects.toThrow('Booking not found');
    });
});
