#!/usr/bin/env node
/* Reconciliation script: call from cron or scheduler to reconcile recent Stripe PaymentIntents with DB */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Stripe = require('stripe');

async function run() {
    const key = process.env.STRIPE_SECRET;
    if (!key) {
        console.error('STRIPE_SECRET not set');
        process.exit(2);
    }
    const stripe = new Stripe(key, { apiVersion: '2024-11-15' });
    // last 24 hours
    const end = new Date();
    const start = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const it = stripe.paymentIntents.list({ created: { gte: Math.floor(start.getTime() / 1000), lte: Math.floor(end.getTime() / 1000) }, limit: 100 });
    for await (const pi of it) {
        const providerId = pi.id;
        const existing = await prisma.payment.findUnique({ where: { providerId } });
        if (!existing) {
            await prisma.payment.create({ data: { provider: 'STRIPE', providerId, amount: (pi.amount_received || pi.amount || 0) / 100, currency: (pi.currency || 'KES').toUpperCase(), status: pi.status === 'succeeded' ? 'SUCCEEDED' : 'PENDING', metadata: { raw: pi } } });
            console.log('created payment', providerId);
        } else {
            const status = pi.status === 'succeeded' ? 'SUCCEEDED' : 'PENDING';
            if (existing.status !== status) {
                await prisma.payment.update({ where: { id: existing.id }, data: { status, metadata: { raw: pi } } });
                console.log('updated payment', providerId, existing.status, '->', status);
            }
        }
    }
    console.log('done');
    process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
