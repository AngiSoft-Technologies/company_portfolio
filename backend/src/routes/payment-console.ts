import { Router } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { generateReference, withScopeLock, applyPaymentOutcome, PaymentProviderError } from '../services/payments';
import * as payhero from '../services/payments/payheroService';
import * as paystack from '../services/payments/paystackService';

/**
 * In-app Payments console (admin-only). Lets staff manage the entire payment
 * surface — PayHero channels (paybill/till/bank), bank paybills, service &
 * payment wallets, top-ups, SasaPay payouts, the transaction ledger, and
 * Paystack transactions/subaccounts — without leaving the platform.
 *
 * Reliability: every write is idempotent. Channel registration and payouts
 * record a unique `idempotencyKey`/`reference` BEFORE calling the provider, so
 * caller retries after a network/500 are no-ops. Advisory locks serialize
 * same-scope operations, and DB mirrors are written in transactions.
 */

const READ_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MARKETING', 'DEVELOPER', 'MANAGER'];
const WRITE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MARKETING'];

export default function paymentConsoleRouter(prisma: PrismaClient) {
    const router = Router();
    router.use(requireAuth);

    const allow = (roles: string[]) => (req: AuthRequest, res: any, next: any) => {
        if (!roles.includes(req.user?.role ?? '')) return res.status(403).json({ error: 'Access denied' });
        next();
    };

    const handleErr = (res: any, err: any) => {
        if (err instanceof PaymentProviderError || (err?.name && ['PayHeroError'].includes(err.name))) {
            return res.status(err?.status || 400).json({ error: err.message });
        }
        console.error('Payments console error:', err?.message);
        res.status(500).json({ error: 'Payments console error' });
    };

    // ─── Overview ────────────────────────────────────────────────────────────
    router.get('/summary', allow(READ_ROLES), async (req, res) => {
        try {
            const [channels, wallets, pendingCount, succeededToday, recentPayments] = await Promise.all([
                prisma.paymentChannel.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }),
                prisma.paymentWallet.findMany(),
                prisma.payment.count({ where: { status: 'PENDING' } }),
                prisma.payment.count({ where: { status: 'SUCCEEDED', updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
                prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
            ]);
            res.json({
                channels,
                wallets,
                pendingCount,
                succeededToday,
                recentPayments,
                payHeroConfigured: payhero.isConfigured(),
                paystackConfigured: paystack.isConfigured(),
                payHeroChannelId: Number(process.env.PAYHERO_CHANNEL_ID || 0) || null,
                callbackUrl: process.env.PAYHERO_CALLBACK_URL || null,
                defaultBookingStatus: 'DEPOSIT_PAID',
            });
        } catch (err) { handleErr(res, err); }
    });

    // ─── PayHero channels (the "accounts" customers pay into) ────────────────
    router.get('/channels', allow(READ_ROLES), async (req, res) => {
        try {
            const data = await payhero.listChannels();
            if (data.payment_channels.length) {
                const upserts: Prisma.PrismaPromise<unknown>[] = data.payment_channels.map((c: any) =>
                    prisma.paymentChannel.upsert({
                        where: { providerChannelId: String(c.id) },
                        create: {
                            provider: 'PAYHERO',
                            providerChannelId: String(c.id),
                            channelType: c.channelType || 'paybill',
                            shortCode: c.shortCode || null,
                            accountNumber: c.accountNumber || null,
                            accountId: c.accountId ? String(c.accountId) : null,
                            transactionType: c.transactionType || null,
                            description: c.description || null,
                            isActive: c.isActive !== false,
                            meta: c as any,
                        },
                        update: {
                            channelType: c.channelType || undefined,
                            shortCode: c.shortCode || undefined,
                            accountNumber: c.accountNumber || undefined,
                            transactionType: c.transactionType || undefined,
                            description: c.description || undefined,
                            isActive: c.isActive !== false,
                            meta: c as any,
                        },
                    })
                );
                await prisma.$transaction(upserts);
            }
            const rows = await prisma.paymentChannel.findMany({ where: { provider: 'PAYHERO' }, orderBy: { createdAt: 'desc' } });
            res.json({ channels: rows, remote: data.payment_channels });
        } catch (err) { handleErr(res, err); }
    });

    router.get('/bank-paybills', allow(READ_ROLES), async (req, res) => {
        try { res.json({ bank_paybills: await payhero.getBankPaybills() }); }
        catch (err) { handleErr(res, err); }
    });

    // POST /channels — register, idempotent by (channelType, shortCode, accountNumber) + idempotencyKey.
    router.post('/channels', allow(WRITE_ROLES), async (req: AuthRequest, res) => {
        const { channelType, shortCode, accountNumber, transactionType, description, idempotencyKey } = req.body || {};
        if (!channelType || !['paybill', 'till', 'bank'].includes(channelType)) {
            return res.status(400).json({ error: 'channelType must be paybill | till | bank' });
        }
        try {
            const result = await withScopeLock(
                prisma,
                `payhero-channel:${channelType}:${shortCode || ''}:${accountNumber || ''}`,
                async (tx) => {
                    const existing = await (tx as any).paymentChannel.findFirst({
                        where: {
                            provider: 'PAYHERO',
                            channelType,
                            ...(shortCode ? { shortCode } : {}),
                            ...(accountNumber ? { accountNumber } : {}),
                            providerChannelId: { not: null },
                        },
                    });
                    if (existing) return { reused: true, channel: existing };

                    const key = idempotencyKey || generateReference('CH');
                    let row: any;
                    try {
                        row = await (tx as any).paymentChannel.create({
                            data: {
                                provider: 'PAYHERO',
                                channelType,
                                shortCode: shortCode || null,
                                accountNumber: accountNumber || null,
                                transactionType: transactionType || null,
                                description: description || null,
                                isActive: false,
                                idempotencyKey: key,
                                meta: { status: 'REGISTERING', by: req.user?.sub || null },
                            },
                        });
                    } catch (err: any) {
                        if (err?.code === 'P2002') {
                            const prior = await (tx as any).paymentChannel.findUnique({ where: { idempotencyKey: key } });
                            return prior
                                ? { inProgress: prior.providerChannelId === null, channel: prior }
                                : { inProgress: true, channel: null };
                        }
                        throw err;
                    }

                    let registered: any;
                    try {
                        registered = await payhero.registerChannel({
                            channelType,
                            shortCode: shortCode || undefined,
                            accountNumber: accountNumber || undefined,
                            transactionType: transactionType || undefined,
                            description: description || undefined,
                        });
                    } catch (err: any) {
                        await (tx as any).paymentChannel.update({
                            where: { id: row.id },
                            data: { meta: { status: 'FAILED', by: req.user?.sub || null, error: err?.message || String(err) } },
                        });
                        throw err;
                    }

                    const pid = String(registered.channel?.id ?? registered.channel?.providerChannelId ?? '');
                    await (tx as any).paymentChannel.updateMany({
                        where: { id: row.id },
                        data: {
                            providerChannelId: pid,
                            accountId: registered.channel?.accountId ? String(registered.channel.accountId) : undefined,
                            isActive: registered.channel?.isActive !== false,
                            transactionType: registered.channel?.transactionType || transactionType || undefined,
                            meta: { status: 'REGISTERED', by: req.user?.sub || null, ...registered.channel },
                        },
                    });
                    return { registered: true, channel: await (tx as any).paymentChannel.findUnique({ where: { id: row.id } }) };
                }
            );
            res.json(result);
        } catch (err) { handleErr(res, err); }
    });

    router.patch('/channels/:id', allow(WRITE_ROLES), async (req, res) => {
        try {
            const { isActive } = req.body || {};
            const channel = await prisma.paymentChannel.findUnique({ where: { id: req.params.id } });
            if (!channel) return res.status(404).json({ error: 'Channel not found' });
            // Local active state (PayHero has no documented channel-deactivate
            // endpoint; we mirror our intent and stop routing to it).
            const updated = await prisma.paymentChannel.update({
                where: { id: channel.id },
                data: { isActive: isActive !== false },
            });
            res.json({ channel: updated });
        } catch (err) { handleErr(res, err); }
    });

    // ─── Wallets ─────────────────────────────────────────────────────────────
    router.get('/wallets', allow(READ_ROLES), async (req, res) => {
        try {
            const [service, payment] = await Promise.all([
                payhero.getWallet('service_wallet'),
                payhero.getWallet('payment_wallet'),
            ]);
            const upsert = (w: { walletType: string; balance: number; meta: any }) =>
                prisma.paymentWallet.upsert({
                    where: { provider_walletType: { provider: 'PAYHERO', walletType: w.walletType } },
                    create: { provider: 'PAYHERO', walletType: w.walletType, balance: w.balance, name: w.walletType, meta: w.meta as any, syncedAt: new Date() },
                    update: { balance: w.balance, meta: w.meta as any, syncedAt: new Date() },
                });
            await prisma.$transaction([upsert(service), upsert(payment)]);
            res.json({ service_wallet: service, payment_wallet: payment });
        } catch (err) { handleErr(res, err); }
    });

    // POST /wallets/topup — idempotent via unique Payout.reference (channel 'topup').
    router.post('/wallets/topup', allow(WRITE_ROLES), async (req: AuthRequest, res) => {
        const { amount, phone, reference } = req.body || {};
        if (!amount || !phone) return res.status(400).json({ error: 'amount and phone required' });
        try {
            const ref = reference || generateReference('TOP');
            const result = await withScopeLock(prisma, `payhero-topup:${ref}`, async (tx) => {
                let row: any;
                try {
                    row = await (tx as any).payout.create({
                        data: { provider: 'PAYHERO', reference: ref, channel: 'topup', amount: Number(amount), phoneNumber: phone, status: 'PENDING' },
                    });
                } catch (err: any) {
                    if (err?.code === 'P2002') {
                        const prior = await (tx as any).payout.findUnique({ where: { reference: ref } });
                        return { reused: true, payout: prior };
                    }
                    throw err;
                }
                try {
                    const pushed = await payhero.topUpServiceWallet({ amount: Number(amount), phone });
                    const updated = await (tx as any).payout.update({
                        where: { id: row.id },
                        data: { providerReference: pushed.reference || pushed.checkoutRequestId || null, metadata: pushed as any },
                    });
                    return { payout: updated, pushed };
                } catch (err: any) {
                    await (tx as any).payout.update({ where: { id: row.id }, data: { metadata: { error: err?.message || String(err) } } });
                    throw err;
                }
            });
            res.json(result);
        } catch (err) { handleErr(res, err); }
    });

    // ─── Payouts ─────────────────────────────────────────────────────────────
    router.post('/payouts', allow(WRITE_ROLES), async (req: AuthRequest, res) => {
        const { amount, channel, phone, accountNumber, networkCode, reference } = req.body || {};
        if (!amount || !networkCode) return res.status(400).json({ error: 'amount and networkCode required' });
        if (!['mobile', 'bank'].includes(channel)) return res.status(400).json({ error: 'channel must be mobile | bank' });
        if (channel === 'mobile' && !phone) return res.status(400).json({ error: 'phone required for mobile payout' });
        if (channel === 'bank' && !accountNumber) return res.status(400).json({ error: 'accountNumber required for bank payout' });
        try {
            const ref = reference || generateReference('PO');
            const result = await withScopeLock(prisma, `payhero-payout:${ref}`, async (tx) => {
                let row: any;
                try {
                    row = await (tx as any).payout.create({
                        data: {
                            provider: 'PAYHERO', reference: ref, channel, amount: Number(amount),
                            phoneNumber: phone || null, accountNumber: accountNumber || null, networkCode,
                            status: 'PENDING',
                        },
                    });
                } catch (err: any) {
                    if (err?.code === 'P2002') {
                        const prior = await (tx as any).payout.findUnique({ where: { reference: ref } });
                        return { reused: true, payout: prior };
                    }
                    throw err;
                }
                try {
                    const pushed = await payhero.withdraw({
                        amount: Number(amount), reference: ref, channel,
                        phone: phone || undefined, accountNumber: accountNumber || undefined,
                        networkCode,
                    });
                    const updated = await (tx as any).payout.update({
                        where: { id: row.id },
                        data: { providerReference: pushed.providerReference || pushed.checkoutRequestId || null, metadata: pushed.meta || pushed },
                    });
                    return { payout: updated, pushed };
                } catch (err: any) {
                    await (tx as any).payout.update({ where: { id: row.id }, data: { status: 'FAILED', metadata: { error: err?.message || String(err) } } });
                    throw err;
                }
            });
            res.json(result);
        } catch (err) { handleErr(res, err); }
    });

    router.get('/payouts', allow(READ_ROLES), async (req, res) => {
        try {
            const status = String(req.query.status || '');
            const rows = await prisma.payout.findMany({
                where: status ? { status } : {},
                orderBy: { createdAt: 'desc' },
                take: 200,
            });
            res.json({ payouts: rows });
        } catch (err) { handleErr(res, err); }
    });

    // ─── Transactions / status ───────────────────────────────────────────────
    router.get('/transactions', allow(READ_ROLES), async (req, res) => {
        try {
            const page = Math.max(1, Number(req.query.page) || 1);
            const perPage = Math.min(200, Math.max(1, Number(req.query.perPage) || 50));
            const data = await payhero.listTransactions(page, perPage);
            // Flag transactions whose external reference matches one of ours.
            const refs = data.transactions
                .map((t: any) => t.external_reference || t.ExternalReference)
                .filter(Boolean) as string[];
            const ours = refs.length
                ? await prisma.payment.findMany({ where: { reference: { in: refs }, provider: 'PAYHERO' }, select: { id: true, reference: true, status: true, amount: true } })
                : [];
            const byRef = new Map(ours.map((p) => [p.reference, p]));
            res.json({
                transactions: data.transactions.map((t: any) => {
                    const ref = t.external_reference || t.ExternalReference;
                    const match = byRef.get(ref) || null;
                    return { ...t, matched: match ? { paymentId: match.id, status: match.status } : null };
                }),
                pagination: data.pagination,
            });
        } catch (err) { handleErr(res, err); }
    });

    router.get('/status', allow(READ_ROLES), async (req, res) => {
        try {
            const reference = String(req.query.reference || '');
            if (!reference) return res.status(400).json({ error: 'reference required' });
            const status = await payhero.getTransactionStatus(reference);
            res.json(status);
        } catch (err) { handleErr(res, err); }
    });

    // ─── Paystack (cards for now; subaccounts power the future partner split) ─
    router.get('/paystack/transactions', allow(READ_ROLES), async (req, res) => {
        try {
            const page = Math.max(1, Number(req.query.page) || 1);
            const perPage = Math.min(100, Math.max(1, Number(req.query.perPage) || 50));
            res.json(await paystack.listTransactions(page, perPage));
        } catch (err) { handleErr(res, err); }
    });

    router.get('/paystack/verify/:reference', allow(READ_ROLES), async (req: AuthRequest, res) => {
        try {
            const reference = String(req.params.reference || '');
            const txn = await paystack.verifyTransaction(reference);
            const payment = await applyPaymentOutcome(prisma, {
                provider: 'PAYSTACK',
                providerId: reference,
                reference,
                amount: Number(txn.amount || 0) / 100,
                currency: String(txn.currency || 'KES').toUpperCase(),
                status: txn.status === 'success' ? 'SUCCEEDED' : 'PENDING',
                metadata: txn,
            });
            res.json({ txn, payment });
        } catch (err) { handleErr(res, err); }
    });

    router.get('/paystack/subaccounts', allow(READ_ROLES), async (req, res) => {
        try { res.json({ subaccounts: await paystack.listSubaccounts() }); }
        catch (err) { handleErr(res, err); }
    });

    router.post('/paystack/subaccounts', allow(WRITE_ROLES), async (req: AuthRequest, res) => {
        const { businessName, accountNumber, settlementBank, percentageCharge, description, idempotencyKey } = req.body || {};
        if (!businessName || !accountNumber || !settlementBank) {
            return res.status(400).json({ error: 'businessName, accountNumber and settlementBank required' });
        }
        try {
            const key = idempotencyKey || generateReference('SUB');
            const result = await withScopeLock(prisma, `paystack-subaccount:${key}`, async (tx) => {
                let row: any;
                try {
                    row = await (tx as any).paymentChannel.create({
                        data: {
                            provider: 'PAYSTACK', channelType: 'subaccount', providerChannelId: key, // temp marker
                            accountNumber, shortCode: settlementBank, description: businessName,
                            isActive: false, idempotencyKey: key,
                            meta: { status: 'CREATING', by: req.user?.sub || null },
                        },
                    });
                } catch (err: any) {
                    if (err?.code === 'P2002') {
                        const prior = await (tx as any).paymentChannel.findUnique({ where: { idempotencyKey: key } });
                        return prior ? { reused: true, subaccount: prior } : { inProgress: true, subaccount: null };
                    }
                    throw err;
                }
                try {
                    const created = await paystack.createSubaccount({
                        businessName, accountNumber, settlementBank,
                        percentageCharge: Number(percentageCharge) || 100, description,
                    });
                    await (tx as any).paymentChannel.update({
                        where: { id: row.id },
                        data: { providerChannelId: String(created?.id ?? created?.subaccount_code ?? key), accountId: created?.subaccount_code || null, isActive: true, meta: { status: 'CREATED', by: req.user?.sub || null, ...created } },
                    });
                    return { subaccount: created, row: await (tx as any).paymentChannel.findUnique({ where: { id: row.id } }) };
                } catch (err: any) {
                    await (tx as any).paymentChannel.update({ where: { id: row.id }, data: { meta: { status: 'FAILED', by: req.user?.sub || null, error: err?.message || String(err) } } });
                    throw err;
                }
            });
            res.json(result);
        } catch (err) { handleErr(res, err); }
    });

    return router;
}