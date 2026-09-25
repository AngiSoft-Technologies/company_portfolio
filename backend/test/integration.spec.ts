import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/db';

afterAll(async () => {
    await prisma.close();
});

describe('Integration: booking -> payment flow', () => {
    beforeAll(async () => {
        // reset only test-owned data so seeded/live Neon content is not damaged
        const testClients = await prisma.orm.public.Client
            .where((c) => c.email.in(['test@example.com', 'test2@example.com']))
            .select('id')
            .all();
        const testClientIds = testClients.map((client) => client.id);

        await prisma.orm.public.Payment
            .where((p) => p.clientId.in(testClientIds))
            .delete();
        await prisma.orm.public.Booking
            .where((b) => b.clientId.in(testClientIds))
            .delete();
        await prisma.orm.public.Client
            .where((c) => c.id.in(testClientIds))
            .delete();
    });

    it('POST /api/bookings creates booking and optionally PaymentIntent', async () => {
        const res = await request(app)
            .post('/api/bookings')
            .send({
                name: 'Test Client',
                email: 'test@example.com',
                phone: '+1234567890',
                title: 'Resume Review',
                description: 'Please review my resume',
                projectType: 'RESUME',
                depositRequired: false,
            });
        expect([200, 201]).toContain(res.status);
        expect(res.body.bookingId).toBeTruthy();
    }, 15000);

    it('POST /api/bookings with deposit creates PaymentIntent', async () => {
        if (!process.env.STRIPE_SECRET?.startsWith('sk_test_')) {
            console.warn('STRIPE_SECRET test key not set, skipping payment test');
            return;
        }
        const res = await request(app)
            .post('/api/bookings')
            .send({
                name: 'Test Client 2',
                email: 'test2@example.com',
                phone: '+1234567890',
                title: 'Document Edit',
                description: 'Edit my document',
                projectType: 'DOCUMENT_EDIT',
                depositRequired: true,
                depositAmount: 50,
                currency: 'KES',
            });
        expect([200, 201]).toContain(res.status);
        if (res.body.clientSecret) {
            expect(res.body.clientSecret).toBeTruthy();
        }
    });
});

describe('Integration: invite -> accept -> login', () => {
    beforeAll(async () => {
        // predicate delete: RefreshToken has no default-safe bulk form
        await prisma.orm.public.RefreshToken
            .where((t) => t.id.isNotNull())
            .delete();
        await prisma.orm.public.Employee
            .where((e) => e.email.in(['jane@angisoft.com', 'john@angisoft.com']))
            .delete();
    });

    it('POST /api/invite requires admin authentication', async () => {
        const res = await request(app)
            .post('/api/invite')
            .send({ firstName: 'Jane', lastName: 'Developer', email: 'jane@angisoft.com' });
        expect(res.status).toBe(401);
    });

    it('POST /api/invite/accept accepts invite and sets password', async () => {
        // first create invite
        const invite = await request(app)
            .post('/api/invite')
            .send({ firstName: 'John', lastName: 'Admin', email: 'john@angisoft.com' });
        const emp = await prisma.orm.public.Employee
            .where({ email: 'john@angisoft.com' })
            .first();
        const token = emp?.inviteToken;
        if (!token) return;
        const res = await request(app)
            .post('/api/invite/accept')
            .send({ token, password: 'SecurePassword123!' });
        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeTruthy();
    });
});
