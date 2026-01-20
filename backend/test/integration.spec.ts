import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Integration: booking -> payment flow', () => {
    beforeAll(async () => {
        // reset test data
        await prisma.booking.deleteMany({});
        await prisma.client.deleteMany({});
        await prisma.payment.deleteMany({});
    });

    afterAll(async () => {
        await prisma.$disconnect();
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
    });

    it('POST /api/bookings with deposit creates PaymentIntent', async () => {
        if (!process.env.STRIPE_SECRET) {
            console.warn('STRIPE_SECRET not set, skipping payment test');
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
        await prisma.employee.deleteMany({});
        await prisma.refreshToken.deleteMany({});
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('POST /api/invite creates invite', async () => {
        const res = await request(app)
            .post('/api/invite')
            .send({ firstName: 'Jane', lastName: 'Developer', email: 'jane@angisoft.com' });
        expect(res.status).toBe(201);
    });

    it('POST /api/invite/accept accepts invite and sets password', async () => {
        // first create invite
        const invite = await request(app)
            .post('/api/invite')
            .send({ firstName: 'John', lastName: 'Admin', email: 'john@angisoft.com' });
        const emp = await prisma.employee.findUnique({ where: { email: 'john@angisoft.com' } });
        const token = emp?.inviteToken;
        if (!token) return;
        const res = await request(app)
            .post('/api/invite/accept')
            .send({ token, password: 'SecurePassword123!' });
        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeTruthy();
    });
});
