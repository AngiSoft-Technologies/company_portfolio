import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { sendMail as sendSystemMail } from '../../../shared/services/email';
import { getConfig } from '../../../shared/services/runtimeConfig';
import { assertAccountAccess, canAccessAccount } from '../services/access';
import { buildZohoAuthorizeUrl, exchangeZohoCode, sendMail as sendZohoMail, syncMailbox } from '../services/zohoMail';
import { recordOutboundMessage, upsertConversation } from '../services/conversations';
import { ProviderConfigurationError } from '../services/providerSecrets';
import { AccountAccessError } from '../services/access';

const addresses = z.union([z.string().email(), z.array(z.string().email()).min(1)]);

const sendSchema = z.object({
  connectionId: z.string().optional(),
  accountId: z.string().optional(),
  to: addresses,
  cc: addresses.optional(),
  bcc: addresses.optional(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(100000),
  html: z.string().optional(),
  from: z.string().email().optional(),
  scheduledAt: z.string().refine((v) => Number.isFinite(Date.parse(v))).optional(),
}).refine((v) => Boolean(v.accountId || v.connectionId), { message: 'accountId or connectionId is required' });

const draftSchema = z.object({
  accountId: z.string().min(1),
  conversationId: z.string().optional().nullable(),
  toAddresses: z.array(z.string().email()).default([]),
  ccAddresses: z.array(z.string().email()).default([]),
  subject: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'SCHEDULED']).default('DRAFT'),
  scheduledAt: z.string().refine((v) => Number.isFinite(Date.parse(v))).optional(),
});

function tokenHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export default function communicationsEmailRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  /** Start Zoho OAuth. Creates a DRAFT connection when none was supplied. */
  async function startOAuth(req: AuthRequest, res: any, body: { connectionId?: string } = {}) {
    const connectionId = body.connectionId || (req.query.connectionId ? String(req.query.connectionId) : undefined);
    let connection: any = connectionId
      ? await prisma.orm.public.ProviderConnection.where({ id: connectionId } as any).first().catch(() => null) as any
      : null;
    if (!connection) {
      connection = await prisma.orm.public.ProviderConnection.create({
        id: newId(), domain: 'COMMUNICATIONS', provider: 'ZOHO_MAIL',
        name: 'Zoho Mail', status: 'DRAFT', environment: 'LIVE',
        config: {} as any, createdById: req.user?.sub ?? null, createdAt: ts(), updatedAt: ts(),
      } as any);
    }
    const state = crypto.randomBytes(24).toString('hex');
    await prisma.orm.public.ProviderConnection.where({ id: connection.id }).update({
      config: { ...(connection.config ?? {}), oauthState: state } as any, updatedAt: ts(),
    } as any);
    const authorizationUrl = buildZohoAuthorizeUrl({ state });
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any,
      action: 'communications.email.oauth.start', entity: 'ProviderConnection', entityId: connection.id,
      meta: { provider: 'ZOHO_MAIL' },
    });
    return res.json({ authorizationUrl, state, connectionId: connection.id });
  }

  router.get('/oauth/start', requireAccess('communications.accounts.connect', ['ADMIN', 'SUPER_ADMIN']), (req: AuthRequest, res) => startOAuth(req, res));
  router.post('/oauth/start', requireAccess('communications.accounts.connect', ['ADMIN', 'SUPER_ADMIN']), (req: AuthRequest, res) => startOAuth(req, res, req.body ?? {}));

  router.get('/oauth/callback', requireAccess('communications.accounts.connect', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const state = String(req.query.state ?? '');
    const code = String(req.query.code ?? '');
    if (req.query.error || !state || !code) {
      await logAudit({
        actorId: req.user?.sub, action: 'communications.email.oauth.callback_failed',
        entity: 'ProviderConnection', meta: { reason: req.query.error ? 'provider_error' : 'missing_state_or_code' },
      });
      return res.status(400).json({ error: 'OAuth callback was rejected' });
    }
    const connections = await prisma.orm.public.ProviderConnection
      .where({ domain: 'COMMUNICATIONS', provider: 'ZOHO_MAIL' } as any).all().then((rows: any[]) => rows, () => [] as any[]) as any[];
    const connection = connections.find((candidate) => candidate.config?.oauthState === state);
    if (!connection) {
      await logAudit({ actorId: req.user?.sub, action: 'communications.email.oauth.callback_failed', entity: 'ProviderConnection', meta: { reason: 'invalid_state' } });
      return res.status(400).json({ error: 'Invalid OAuth state' });
    }
    try {
      const result = await exchangeZohoCode(prisma, { connectionId: connection.id, code, actorId: req.user?.sub });
      await prisma.orm.public.ProviderConnection.where({ id: connection.id }).update({
        config: { ...(connection.config ?? {}), oauthState: null } as any, updatedAt: ts(),
      } as any);
      await logAudit({
        actorId: req.user?.sub, actorRole: req.user?.role as any,
        action: 'communications.email.oauth.connected', entity: 'ProviderConnection', entityId: connection.id,
        meta: { scope: result.scope, hasRefreshToken: result.hasRefreshToken },
      });
      return res.json({ ok: true, connectionId: connection.id, scope: result.scope });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OAuth exchange failed';
      await logAudit({ actorId: req.user?.sub, action: 'communications.email.oauth.callback_failed', entity: 'ProviderConnection', entityId: connection.id, meta: { reason: message } });
      return res.status(400).json({ error: message });
    }
  });

  router.post('/send', requireAccess('communications.email.compose', ['ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const input = sendSchema.parse(req.body);
    let account: any;
    if (input.accountId) {
      account = await prisma.orm.public.CommunicationAccount.where({ id: input.accountId } as any).first().catch(() => null) as any;
    } else {
      account = await prisma.orm.public.CommunicationAccount.where({ connectionId: input.connectionId } as any).first().catch(() => null) as any;
    }
    if (!account || account.provider !== 'ZOHO_MAIL') return res.status(404).json({ error: 'Zoho mail account not found' });
    try {
      await assertAccountAccess(prisma, req.user, account.id, input.from ? 'send_as' : 'respond');
      if (input.from) {
        const identity = await prisma.orm.public.EmailSendAsIdentity
          .where({ accountId: account.id, email: input.from } as any).first().catch(() => null) as any;
        if (!identity || String(identity.status).toUpperCase() !== 'VERIFIED') {
          return res.status(400).json({ error: 'Send-as identity must be verified before use' });
        }
      }
      if (input.scheduledAt && Date.parse(input.scheduledAt) > Date.now()) {
        const draft = await prisma.orm.public.EmailDraft.create({
          id: newId(), accountId: account.id, conversationId: null,
          toAddresses: Array.isArray(input.to) ? input.to : [input.to],
          ccAddresses: Array.isArray(input.cc) ? input.cc : input.cc ? [input.cc] : [],
          subject: input.subject,
          // No scheduleAt column exists; the worker reads this JSON envelope.
          body: JSON.stringify({ scheduledAt: input.scheduledAt, body: input.body, html: input.html, from: input.from }),
          status: 'SCHEDULED', createdById: req.user?.sub ?? null, createdAt: ts(), updatedAt: ts(),
        } as any);
        await logAudit({
          actorId: req.user?.sub, actorRole: req.user?.role as any,
          action: 'communications.email.schedule', entity: 'EmailDraft', entityId: draft.id,
          meta: { accountId: account.id, scheduledAt: input.scheduledAt, toCount: (Array.isArray(input.to) ? input.to : [input.to]).length },
        });
        return res.status(201).json({ scheduled: true, draft });
      }
      const result = await sendZohoMail(prisma, {
        connectionId: account.connectionId, accountId: account.id,
        to: input.to, cc: input.cc, bcc: input.bcc, subject: input.subject, body: input.body,
        html: input.html, from: input.from, actorId: req.user?.sub,
      });
      const recipients = Array.isArray(input.to) ? input.to : [input.to];
      const conversation = await upsertConversation(prisma, {
        accountId: account.id, channel: 'EMAIL', externalThreadId: `email:sent:${result.id ?? newId()}`,
        subject: input.subject, preview: input.body.slice(0, 200),
      });
      const message = await recordOutboundMessage(prisma, {
        conversationId: conversation.id, account, actorId: req.user?.sub,
        bodyText: input.body.slice(0, 6000), providerMessageId: result.id ?? null, result,
      });
      await logAudit({
        actorId: req.user?.sub, actorRole: req.user?.role as any,
        action: 'communications.email.send', entity: 'Conversation', entityId: conversation.id,
        meta: { accountId: account.id, recipientCount: recipients.length, subject: input.subject, providerMessageId: result.id ?? null },
      });
      return res.status(201).json({ message, result });
    } catch (err) {
      if (err instanceof AccountAccessError) return res.status(403).json({ error: 'Not authorized' });
      if (err instanceof ProviderConfigurationError) return res.status(400).json({ error: err.message, code: 'NOT_CONFIGURED' });
      throw err;
    }
  });

  router.post('/sync/:connectionId', requireAccess('communications.email.manage', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    try {
      const result = await syncMailbox(prisma, req.params.connectionId, { actorId: req.user?.sub });
      await logAudit({
        actorId: req.user?.sub, actorRole: req.user?.role as any,
        action: 'communications.email.sync', entity: 'ProviderConnection', entityId: req.params.connectionId,
        meta: { folders: result.folders, messages: result.messages },
      });
      return res.json(result);
    } catch (err) {
      if (err instanceof ProviderConfigurationError) return res.status(400).json({ error: err.message, code: 'NOT_CONFIGURED' });
      throw err;
    }
  });

  router.get('/drafts', requireAccess('communications.email.compose', ['ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const accountId = req.query.accountId ? String(req.query.accountId) : undefined;
    let drafts = await prisma.orm.public.EmailDraft
      .orderBy((d: any) => d.updatedAt.desc()).limit(200).all().then((rows: any[]) => rows, () => [] as any[]) as any[];
    if (accountId) drafts = drafts.filter((draft) => draft.accountId === accountId);
    const allowed: any[] = [];
    for (const draft of drafts) {
      if (await canAccessAccount(prisma, req.user, String(draft.accountId), 'read')) allowed.push(draft);
    }
    res.json({ drafts: allowed });
  });

  router.post('/drafts', requireAccess('communications.email.compose', ['ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const body = draftSchema.parse(req.body);
    try {
      await assertAccountAccess(prisma, req.user, body.accountId, 'respond');
      if (body.status === 'SCHEDULED' && (!body.scheduledAt || Date.parse(body.scheduledAt) <= Date.now())) {
        return res.status(400).json({ error: 'scheduledAt must be in the future' });
      }
      const storedBody = body.status === 'SCHEDULED'
        ? JSON.stringify({ scheduledAt: body.scheduledAt, body: body.body ?? '' })
        : (body.body ?? '');
      const draft = await prisma.orm.public.EmailDraft.create({
        id: newId(), accountId: body.accountId, conversationId: body.conversationId ?? null,
        toAddresses: body.toAddresses, ccAddresses: body.ccAddresses, subject: body.subject ?? null,
        body: storedBody, status: body.status, createdById: req.user?.sub ?? null, createdAt: ts(), updatedAt: ts(),
      } as any);
      await logAudit({
        actorId: req.user?.sub, actorRole: req.user?.role as any,
        action: 'communications.email.draft.create', entity: 'EmailDraft', entityId: draft.id,
        meta: { accountId: body.accountId, status: body.status, scheduledAt: body.scheduledAt ?? null },
      });
      return res.status(201).json({ draft });
    } catch (err) {
      if (err instanceof AccountAccessError) return res.status(403).json({ error: 'Not authorized' });
      throw err;
    }
  });

  router.get('/send-as', requireAccess('communications.email.send_as', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const accountId = req.query.accountId ? String(req.query.accountId) : undefined;
    let identities = await prisma.orm.public.EmailSendAsIdentity
      .orderBy((i: any) => i.createdAt.desc()).all().then((rows: any[]) => rows, () => [] as any[]) as any[];
    if (accountId) identities = identities.filter((i) => i.accountId === accountId);
    const allowed: any[] = [];
    for (const identity of identities) {
      if (await canAccessAccount(prisma, req.user, String(identity.accountId), 'read')) allowed.push(identity);
    }
    res.json({ identities: allowed });
  });

  router.post('/send-as', requireAccess('communications.email.send_as', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const body = z.object({ accountId: z.string().min(1), email: z.string().email(), displayName: z.string().optional().nullable() }).parse(req.body);
    try {
      await assertAccountAccess(prisma, req.user, body.accountId, 'send_as');
      const existing = await prisma.orm.public.EmailSendAsIdentity
        .where({ accountId: body.accountId, email: body.email } as any).first().catch(() => null) as any;
      if (existing) return res.status(409).json({ error: 'Send-as identity already exists' });
      const identity = await prisma.orm.public.EmailSendAsIdentity.create({
        id: newId(), accountId: body.accountId, email: body.email, displayName: body.displayName ?? null,
        status: 'PENDING', createdAt: ts(), updatedAt: ts(),
      } as any);
      const token = crypto.randomBytes(32).toString('hex');
      let employeeEmail = await prisma.orm.public.EmployeeEmail.where({ email: body.email } as any).first().catch(() => null) as any;
      if (!employeeEmail && req.user?.sub) {
        employeeEmail = await prisma.orm.public.EmployeeEmail.create({
          id: newId(), employeeId: req.user.sub, email: body.email, isPrimary: false,
          verificationTokenHash: tokenHash(token), source: 'send_as', createdAt: ts(), updatedAt: ts(),
        } as any).catch(() => null);
      } else if (employeeEmail) {
        await prisma.orm.public.EmployeeEmail.where({ id: employeeEmail.id }).update({
          verificationTokenHash: tokenHash(token), updatedAt: ts(),
        } as any).then(() => undefined, () => undefined);
      }
      if (employeeEmail) {
        const adminUrl = String(getConfig('ADMIN_URL') || '').replace(/\/+$/, '');
        const verificationLink = adminUrl ? `${adminUrl}/email/send-as?token=${encodeURIComponent(token)}&identity=${identity.id}` : '';
        await sendSystemMail({
          to: body.email, subject: 'Verify send-as identity',
          html: `<p>Approve this send-as identity for AngiSoft Communications.</p>${verificationLink ? `<p><a href="${verificationLink}">Verify identity</a></p>` : `<p>Verification token: ${token}</p>`}`,
          layout: 'raw', purpose: 'general',
        }).then(() => undefined, () => undefined);
      }
      await logAudit({
        actorId: req.user?.sub, actorRole: req.user?.role as any,
        action: 'communications.email.send_as.create', entity: 'EmailSendAsIdentity', entityId: identity.id,
        meta: { accountId: body.accountId, email: body.email, status: 'PENDING' },
      });
      return res.status(201).json({ identity: { ...identity, verificationSent: Boolean(employeeEmail) } });
    } catch (err) {
      if (err instanceof AccountAccessError) return res.status(403).json({ error: 'Not authorized' });
      throw err;
    }
  });

  router.post('/send-as/:id/verify', requireAccess('communications.email.send_as', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const body = z.object({ token: z.string().min(10) }).parse(req.body);
    const identity = await prisma.orm.public.EmailSendAsIdentity.where({ id: req.params.id } as any).first().catch(() => null) as any;
    if (!identity) return res.status(404).json({ error: 'Not found' });
    try {
      await assertAccountAccess(prisma, req.user, String(identity.accountId), 'send_as');
    } catch {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const employeeEmail = await prisma.orm.public.EmployeeEmail.where({ email: identity.email } as any).first().catch(() => null) as any;
    if (!employeeEmail?.verificationTokenHash || employeeEmail.verificationTokenHash !== tokenHash(body.token)) {
      await logAudit({ actorId: req.user?.sub, action: 'communications.email.send_as.verify_failed', entity: 'EmailSendAsIdentity', entityId: identity.id });
      return res.status(400).json({ error: 'Invalid verification token' });
    }
    const updated = await prisma.orm.public.EmailSendAsIdentity.where({ id: identity.id }).update({
      status: 'VERIFIED', verifiedAt: ts(), updatedAt: ts(),
    } as any);
    await prisma.orm.public.EmployeeEmail.where({ id: employeeEmail.id }).update({
      verifiedAt: ts(), verificationTokenHash: null, updatedAt: ts(),
    } as any);
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any,
      action: 'communications.email.send_as.verify', entity: 'EmailSendAsIdentity', entityId: identity.id,
      meta: { accountId: identity.accountId, email: identity.email },
    });
    res.json({ identity: updated });
  });

  return router;
}
