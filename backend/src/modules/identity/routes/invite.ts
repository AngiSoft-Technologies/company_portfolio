import { Router } from 'express';
import type { Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { signAccessToken, createRefreshToken, hashToken } from '../../../modules/identity/utils/token';
import { sendMail } from '../../../shared/services/email';
import { logAudit } from '../../../shared/services/audit';
import { z } from 'zod';
import { AuthRequest, requireAuth, setRefreshCookie } from '../../../shared/middleware/auth';
import { requireRoles } from '../../../shared/middleware/roles';
import { checkPasswordStrength } from '../../../modules/identity/utils/passwordPolicy';

// Mirrors the P7 `Role` enum (Employee.role values).
const ROLES = [
    'SUPER_ADMIN',
    'ADMIN',
    'MANAGER',
    'MARKETING',
    'DEVELOPER',
    'HR',
    'STAFF',
    'CONTENT_CREATOR',
    'BLOG_MANAGER',
] as const;

const inviteSchema = z.object({ firstName: z.string().min(1), lastName: z.string().min(1), email: z.string().email(), role: z.enum(ROLES).optional(), phone: z.string().optional() });
const acceptSchema = z.object({ token: z.string(), password: z.string().min(8), firstName: z.string().optional(), lastName: z.string().optional() });

export default function inviteRouter(prisma: Db) {
    const router = Router();

    router.post('/', requireAuth, requireRoles('ADMIN'), async (req: AuthRequest, res) => {
        const parsed = inviteSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const { firstName, lastName, email, role, phone } = parsed.data;
        const existing = await prisma.orm.public.Employee.where({ email }).first();
        if (existing) return res.status(409).json({ error: 'Email already exists' });
        const token = crypto.randomBytes(32).toString('base64url');
        const expiry = ts(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const employee = await prisma.orm.public.Employee.create({
            id: newId(),
            updatedAt: ts(),
            firstName,
            lastName,
            email,
            phone: phone ?? null,
            role: (role || 'DEVELOPER') as any,
            inviteToken: token,
            inviteExpiry: expiry,
        });
        const acceptUrl = `${process.env.FRONTEND_URL}/invite/accept?token=${token}`;
        await sendMail({ to: email, subject: 'You are invited to AngiSoft', html: `<p>Click <a href="${acceptUrl}">here</a> to accept your invite.</p>`, purpose: 'noreply' });
        await logAudit({ action: 'create_invite', entity: 'Employee', entityId: employee.id, actorId: req.user?.sub || null, actorRole: req.user?.role || null });
        res.status(201).json({ message: 'Invite created' });
    });

    router.post('/accept', async (req, res) => {
        const parsed = acceptSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const { token, password, firstName, lastName } = parsed.data;
        const emp = await prisma.orm.public.Employee.where({ inviteToken: token }).first();
        if (!emp || emp.passwordHash || emp.acceptedAt) return res.status(400).json({ error: 'Invalid token' });
        if (emp.inviteExpiry && emp.inviteExpiry < ts()) return res.status(400).json({ error: 'Token expired' });
        const pw = checkPasswordStrength(password);
        if (!pw.ok) return res.status(400).json({ error: 'Password too weak', feedback: pw.feedback });
        const hash = await bcrypt.hash(password, 10);
        await prisma.orm.public.Employee.where({ id: emp.id }).update({
            passwordHash: hash,
            inviteToken: null,
            inviteExpiry: null,
            acceptedAt: ts(),
            firstName: firstName || emp.firstName,
            lastName: lastName || emp.lastName,
        });

        const refresh = createRefreshToken();
        const refreshHash = hashToken(refresh);
        const expiresAt = ts(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await prisma.orm.public.RefreshToken.create({
            id: newId(),
            token: refreshHash,
            employeeId: emp.id,
            expiresAt,
            ip: req.ip ?? null,
            userAgent: req.get('user-agent') || null,
        });
        const access = signAccessToken({ sub: emp.id, role: emp.role });
        setRefreshCookie(res, refresh);

        await logAudit({ action: 'accept_invite', entity: 'Employee', entityId: emp.id, actorId: emp.id, actorRole: emp.role });
        res.json({ accessToken: access });
    });

    return router;
}
