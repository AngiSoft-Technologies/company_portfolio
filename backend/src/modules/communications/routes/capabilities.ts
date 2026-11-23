import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { getProviderCapabilities, listCapabilityMatrix, ProviderCapabilityError } from '../services/capabilities';
import {
  getMetaOperationStatus,
  listMetaCapabilities,
  listMetaPages,
  listMetaAppSubscriptions,
  listMetaAdAccounts,
  listMetaAdInsights,
  getMetaInstagramAccount,
  listMetaInstagramInsights,
  listInstagramMentions,
  listMetaPublishedContent,
  listApprovedMetaTemplates,
  listMetaComments,
  hideMetaComment,
  listMessengerConversations,
  publishMetaPagePost,
  publishInstagramMedia,
  readThreadsProfile,
  listMetaThreads,
  listThreadsInsights,
  publishThreadsPost,
  publishThreadsCarousel,
  replyThreadsPost,
  replyToMetaItem,
  type MetaOperation,
} from '../services/metaCapabilities';
import { ProviderConfigurationError } from '../services/providerSecrets';
import { callMetaMcpTool, listMetaMcpTools } from '../services/metaMcp';
import { getMetaCatalogReadiness } from '../services/metaCatalogReadiness';

const VIEW_ACCESS = ['ADMIN', 'MANAGER', 'SUPER_ADMIN'] as const;
const MANAGE_ACCESS = ['ADMIN', 'SUPER_ADMIN'] as const;

const READ_OPERATIONS: Partial<Record<MetaOperation, (input: any) => Promise<any>>> = {
  'pages.read': () => listMetaPages(),
  'app.subscriptions.read': () => listMetaAppSubscriptions(),
  'ad_accounts.read': () => listMetaAdAccounts(),
  'ads.insights.read': (input) => listMetaAdInsights(input.objectId, input.days),
  'instagram.read': () => getMetaInstagramAccount(),
  'instagram.insights.read': (input) => listMetaInstagramInsights(input.objectId, input.days),
  'instagram.mentions.read': (input) => listInstagramMentions(input.objectId),
  'published_content.read': (input) => listMetaPublishedContent(input.objectId),
  'templates.read': () => listApprovedMetaTemplates(),
  'comments.read': (input) => listMetaComments(String(input.objectId ?? '')),
  'messenger.read': (input) => listMessengerConversations(input.objectId),
  'threads.read': async () => ({ profile: await readThreadsProfile(), threads: await listMetaThreads() }),
  'threads.insights.read': (input) => listThreadsInsights(input.objectId, input.days),
};

/** Capability endpoints for the admin UI badges (read-only, no secrets). */
export default function communicationsCapabilitiesRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get(['/', '/providers'], requireAccess('communications.overview.view', [...VIEW_ACCESS]), (req, res) => {
    const provider = req.query.provider ? String(req.query.provider) : undefined;
    res.json({
      providers: provider
        ? [{ provider, capabilities: getProviderCapabilities(provider) }]
        : listCapabilityMatrix(),
      meta: listMetaCapabilities(),
    });
  });

  router.get('/meta', requireAccess('communications.overview.view', [...VIEW_ACCESS]), (_req, res) => {
    res.json(listMetaCapabilities());
  });

  router.get('/meta/operations', requireAccess('communications.overview.view', [...VIEW_ACCESS]), (_req, res) => {
    res.json({
      operations: listMetaCapabilities().operations,
      executableReads: Object.keys(READ_OPERATIONS),
    });
  });

  /**
   * Read-only catalog/commerce readiness. Validates the exact CMS feed Meta
   * would poll and reports config coverage — no writes, no Meta API calls, no
   * secrets in the response.
   */
  router.get('/meta/catalog-readiness', requireAccess('communications.overview.view', [...VIEW_ACCESS]), async (_req, res) => {
    res.json(await getMetaCatalogReadiness(prisma));
  });

  /** Execute a safe Graph read only when its capability flags are satisfied. */
  router.post('/meta/operations/read', requireAccess('communications.overview.view', [...VIEW_ACCESS]), async (req, res) => {
    const body = z.object({
      operation: z.string(),
      objectId: z.string().optional(),
      days: z.coerce.number().int().min(1).max(90).optional(),
    }).parse(req.body);
    const operation = body.operation as MetaOperation;
    const executor = READ_OPERATIONS[operation];
    if (!executor) return res.status(400).json({ error: `No read executor for '${body.operation}'` });
    const status = getMetaOperationStatus(operation);
    if (!status.available) return res.status(403).json({ error: `Meta operation unavailable: ${status.reason ?? 'feature flag disabled'}` });
    try {
      res.json({ operation, result: await executor(body) });
    } catch (err) {
      if (err instanceof ProviderConfigurationError || err instanceof ProviderCapabilityError) {
        return res.status(400).json({ error: err.message, code: err instanceof ProviderCapabilityError ? 'CAPABILITY_DISABLED' : 'NOT_CONFIGURED' });
      }
      throw err;
    }
  });

  /** Read-only tool catalogue from the configured Meta MCP server. */
  router.get('/meta/mcp/tools', requireAccess('communications.overview.view', [...VIEW_ACCESS]), async (req, res) => {
    const operation = String(req.query.operation || 'mcp.social');
    try {
      res.json(await listMetaMcpTools(operation, req.user?.sub));
    } catch (err) {
      if (err instanceof ProviderConfigurationError || err instanceof ProviderCapabilityError) {
        return res.status(400).json({ error: err.message, code: err instanceof ProviderCapabilityError ? 'CAPABILITY_DISABLED' : 'NOT_CONFIGURED' });
      }
      throw err;
    }
  });

  /** Read-only tool execution. Spend/publish tools are refused in the service. */
  router.post('/meta/mcp/call', requireAccess('communications.social.respond', [...MANAGE_ACCESS]), async (req: AuthRequest, res) => {
    const body = z.object({
      operation: z.enum(['mcp.ads', 'mcp.social', 'mcp.whatsapp']),
      tool: z.string().min(1),
      arguments: z.record(z.string(), z.unknown()).optional(),
    }).parse(req.body);
    try {
      res.json(await callMetaMcpTool(body.operation, body.tool, body.arguments ?? {}, req.user?.sub));
    } catch (err) {
      if (err instanceof ProviderConfigurationError || err instanceof ProviderCapabilityError) {
        return res.status(400).json({ error: err.message, code: err instanceof ProviderCapabilityError ? 'CAPABILITY_DISABLED' : 'NOT_CONFIGURED' });
      }
      throw err;
    }
  });

  /** Publish/respond operations always require ADMIN + explicit Meta grants. */
  router.post('/meta/operations/write', requireAccess('communications.social.respond', [...MANAGE_ACCESS]), async (req: AuthRequest, res) => {
    const body = z.object({
      operation: z.enum([
        'pages.publish', 'instagram.publish', 'threads.publish', 'threads.carousel.publish',
        'threads.reply', 'comments.reply', 'comments.moderate', 'messenger.send',
      ]),
      objectId: z.string().optional(),
      recipientId: z.string().optional(),
      threadId: z.string().optional(),
      accountId: z.string().optional(),
      imageUrl: z.string().optional(),
      videoUrl: z.string().optional(),
      mediaUrls: z.array(z.string()).max(10).optional(),
      commentId: z.string().optional(),
      text: z.string().max(5000).optional(),
      network: z.enum(['META_FACEBOOK', 'META_INSTAGRAM']).default('META_FACEBOOK'),
      pageId: z.string().optional(),
    }).parse(req.body);
    const text = body.text?.trim() ?? '';
    const textRequired = body.operation !== 'comments.moderate' && body.operation !== 'threads.carousel.publish';
    if (textRequired && !text) return res.status(400).json({ error: 'text is required for this operation' });
    try {
      if (body.operation === 'comments.moderate') {
        if (!body.commentId) return res.status(400).json({ error: 'commentId is required for comments.moderate' });
        return res.json({ result: await hideMetaComment(prisma, {
          commentId: body.commentId,
          network: body.network,
          actorId: req.user?.sub,
        }) });
      }
      if (body.operation === 'pages.publish') {
        return res.json({ result: await publishMetaPagePost(prisma, { pageId: body.pageId, message: text, actorId: req.user?.sub }) });
      }
      if (body.operation === 'instagram.publish') {
        return res.json({ result: await publishInstagramMedia(prisma, {
          accountId: body.accountId,
          imageUrl: body.imageUrl,
          videoUrl: body.videoUrl,
          caption: text,
          actorId: req.user?.sub,
        }) });
      }
      if (body.operation === 'threads.publish') {
        return res.json({ result: await publishThreadsPost(prisma, {
          text,
          imageUrl: body.imageUrl,
          videoUrl: body.videoUrl,
          actorId: req.user?.sub,
        }) });
      }
      if (body.operation === 'threads.carousel.publish') {
        if (!body.mediaUrls?.length) return res.status(400).json({ error: 'mediaUrls (2-10 public https URLs) is required' });
        return res.json({ result: await publishThreadsCarousel(prisma, {
          text,
          mediaUrls: body.mediaUrls,
          actorId: req.user?.sub,
        }) });
      }
      if (body.operation === 'threads.reply') {
        if (!body.threadId) return res.status(400).json({ error: 'threadId is required for threads.reply' });
        return res.json({ result: await replyThreadsPost(prisma, {
          threadId: body.threadId,
          text,
          actorId: req.user?.sub,
        }) });
      }
      if (!body.recipientId && !body.objectId) {
        return res.status(400).json({ error: 'recipientId or objectId is required' });
      }
      return res.json({
        result: await replyToMetaItem(prisma, {
          network: body.network,
          recipientId: body.recipientId ?? '',
          objectId: body.objectId,
          text,
          actorId: req.user?.sub,
        }),
      });
    } catch (err) {
      if (err instanceof ProviderConfigurationError || err instanceof ProviderCapabilityError) {
        return res.status(400).json({ error: err.message, code: err instanceof ProviderCapabilityError ? 'CAPABILITY_DISABLED' : 'NOT_CONFIGURED' });
      }
      throw err;
    }
  });

  return router;
}
