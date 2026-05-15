import { Router } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { signAccessToken, createRefreshToken, hashToken } from '../utils/token';
import { sendMail } from '../services/email';
import { logAudit } from '../services/audit';
import { z } from 'zod';
import { AuthRequest, requireAuth, setRefreshCookie } from '../middleware/auth';
import { requireRoles } from '../middleware/roles';
import { checkPasswordStrength } from '../utils/passwordPolicy';

const inviteSchema = z.object({ firstName: z.string().min(1), lastName: z.string().min(1), email: z.string().email(), role: z.nativeEnum(Role).optional(), phone: z.string().optional() });
const acceptSchema = z.object({ token: z.string(), password: z.string().min(8), firstName: z.string().optional(), lastName: z.string().optional() });

export default function inviteRouter(prisma: PrismaClient) {
    const router = Router();

    router.post('/', requireAuth, requireRoles('ADMIN'), async (req: AuthRequest, res) => {
        const parsed = inviteSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const { firstName, lastName, email, role, phone } = parsed.data;
        const existing = await prisma.employee.findUnique({ where: { email } });
        if (existing) return res.status(409).json({ error: 'Email already exists' });
        const token = crypto.randomBytes(32).toString('base64url');
        const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const employee = await prisma.employee.create({ data: { firstName, lastName, email, phone, role: role || 'DEVELOPER', inviteToken: token, inviteExpiry: expiry } });
        const acceptUrl = `${process.env.FRONTEND_URL}/invite/accept?token=${token}`;
        await sendMail({ to: email, subject: 'You are invited to AngiSoft', html: `<p>Click <a href="${acceptUrl}">here</a> to accept your invite.</p>`, purpose: 'noreply' });
        await logAudit({ action: 'create_invite', entity: 'Employee', entityId: employee.id, actorId: req.user?.sub || null, actorRole: req.user?.role || null });
        res.status(201).json({ message: 'Invite created' });
    });

    router.post('/accept', async (req, res) => {
        const parsed = acceptSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const { token, password, firstName, lastName } = parsed.data;
        const emp = await prisma.employee.findUnique({ where: { inviteToken: token } });
        if (!emp || emp.passwordHash || emp.acceptedAt) return res.status(400).json({ error: 'Invalid token' });
        if (emp.inviteExpiry && emp.inviteExpiry < new Date()) return res.status(400).json({ error: 'Token expired' });
        const pw = checkPasswordStrength(password);
        if (!pw.ok) return res.status(400).json({ error: 'Password too weak', feedback: pw.feedback });
        const hash = await bcrypt.hash(password, 10);
        await prisma.employee.update({ where: { id: emp.id }, data: { passwordHash: hash, inviteToken: null, inviteExpiry: null, acceptedAt: new Date(), firstName: firstName || emp.firstName, lastName: lastName || emp.lastName } });

        const refresh = createRefreshToken();
        const refreshHash = hashToken(refresh);
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await prisma.refreshToken.create({ data: { token: refreshHash, employeeId: emp.id, expiresAt, ip: req.ip, userAgent: req.get('user-agent') || undefined } });
        const access = signAccessToken({ sub: emp.id, role: emp.role });
        setRefreshCookie(res, refresh);

        await logAudit({ action: 'accept_invite', entity: 'Employee', entityId: emp.id, actorId: emp.id, actorRole: emp.role });
        res.json({ accessToken: access });
    });

    return router;
}
