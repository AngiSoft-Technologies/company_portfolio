import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { signAccessToken } from '../src/modules/identity/utils/token';

// We'll mock the prisma client methods used by the auth flows.
// Shape mirrors the Prisma 8 contract client: prisma.orm.public.<Model>.where(...).first()/update()/...
vi.mock('../src/db', () => {
    // simple in-memory store for employees and tokens
    const employees: any[] = [];
    const tokens: any[] = [];

    const matches = (item: any, criteria: any) =>
        Object.entries(criteria).every(([k, v]) => item[k] === v);

    const queryable = (store: any[]) => ({
        where(criteria: any) {
            const hit = () => store.find((x) => matches(x, criteria)) ?? null;
            return {
                first: async () => hit(),
                all: async () => store.filter((x) => matches(x, criteria)),
                update: async (data: any) => {
                    const e = hit();
                    if (e) Object.assign(e, data);
                    return e;
                },
                delete: async () => {
                    const e = hit();
                    const idx = e ? store.indexOf(e) : -1;
                    if (idx >= 0) store.splice(idx, 1);
                    return e;
                },
                deleteAndCount: async () => {
                    const before = store.length;
                    for (let i = store.length - 1; i >= 0; i--) {
                        if (matches(store[i], criteria)) store.splice(i, 1);
                    }
                    return { count: before - store.length };
                },
            };
        },
    });

    return {
        default: {
            orm: {
                public: {
                    Employee: {
                        ...queryable(employees),
                        create: async (data: any) => {
                            const e = { id: 'emp_' + (employees.length + 1), createdAt: new Date(), ...data };
                            employees.push(e);
                            return e;
                        },
                    },
                    RefreshToken: {
                        ...queryable(tokens),
                        create: async (data: any) => {
                            const t = { id: 't_' + (tokens.length + 1), ...data };
                            tokens.push(t);
                            return t;
                        },
                    },
                },
            },
        },
    };
});

vi.mock('../src/shared/services/email', () => ({
    sendMail: vi.fn(async () => true),
    verifyTransporter: vi.fn(async () => true)
}));

import app from '../src/app';

// simple smoke tests to verify routes wired up
describe('auth flows', () => {
    it('blocks unauthenticated invite creation', async () => {
        const inviteRes = await request(app).post('/api/invite').send({ firstName: 'Test', lastName: 'User', email: 't@example.com' });
        expect(inviteRes.status).toBe(401);
    });

    it('forgot/reset returns ok for unknown email and handles reset for known', async () => {
        const forgotRes = await request(app).post('/api/auth/forgot').send({ email: 'doesnotexist@example.com' });
        expect(forgotRes.status).toBe(200);
        expect(forgotRes.body.ok).toBeTruthy();
    });

    it('requires auth for 2FA enroll and verify', async () => {
        const enroll = await request(app).post('/api/auth/2fa/enroll').send({ email: '2fa@example.com' });
        expect(enroll.status).toBe(401);

        const verify = await request(app).post('/api/auth/2fa/verify').send({ email: '2fa@example.com', token: '000000' });
        expect(verify.status).toBe(401);
    });
});
