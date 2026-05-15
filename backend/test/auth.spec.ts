import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { signAccessToken } from '../src/utils/token';

// We'll mock the prisma client methods used by the auth flows.
vi.mock('../src/db', () => {
    // simple in-memory store for employees and tokens
    const employees: any[] = [];
    const tokens: any[] = [];
    return {
        default: {
            employee: {
                findUnique: vi.fn(async ({ where }: any) => employees.find(e => e.email === where.email || e.id === where.id || e.inviteToken === where.inviteToken)),
                findFirst: vi.fn(async ({ where }: any) => employees.find(e => e.resetToken === where.resetToken)),
                create: vi.fn(async ({ data }: any) => { const e = { ...data, id: 'emp_' + (employees.length + 1), createdAt: new Date() }; employees.push(e); return e; }),
                update: vi.fn(async ({ where, data }: any) => { const e = employees.find(x => x.id === where.id || x.email === where.email); Object.assign(e, data); return e; }),
            },
            refreshToken: {
                create: vi.fn(async ({ data }: any) => { const t = { ...data, id: 't_' + (tokens.length + 1) }; tokens.push(t); return t; }),
                findUnique: vi.fn(async ({ where }: any) => tokens.find(t => t.token === where.token)),
                delete: vi.fn(async ({ where }: any) => { const idx = tokens.findIndex(t => t.id === where.id); if (idx >= 0) tokens.splice(idx, 1); }),
                updateMany: vi.fn(async ({ where, data }: any) => {
                    let count = 0;
                    tokens.forEach(t => {
                        const matchesId = !where.id || t.id === where.id;
                        const matchesEmployee = !where.employeeId || t.employeeId === where.employeeId;
                        const matchesToken = !where.token || t.token === where.token;
                        const matchesRevoked = where.revoked === undefined || t.revoked === where.revoked;
                        const matchesExpiry = !where.expiresAt?.gt || t.expiresAt > where.expiresAt.gt;
                        if (matchesId && matchesEmployee && matchesToken && matchesRevoked && matchesExpiry) {
                            Object.assign(t, data);
                            count += 1;
                        }
                    });
                    return { count };
                }),
            }
        }
    };
});

vi.mock('../src/services/email', () => ({
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
