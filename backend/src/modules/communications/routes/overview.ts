import { Router } from 'express';
import type { Db } from '../../../db';
import { ts, tsMs } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { toSafeWebhookEvent } from '../../../shared/routes/webhookInbox';
import { listCapabilityMatrix } from '../services/capabilities';
import { getMetaFeatureFlags, listMetaCapabilities } from '../services/metaCapabilities';
import { canAccessAccount } from '../services/access';

async function countRows(query: any): Promise<number> {
  try {
    const row: any = await query.aggregate((a: any) => ({ n: a.count() }));
    return Number(row?.n ?? 0);
  } catch {
    return 0;
  }
}

export default function communicationsOverviewRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get(['/', '/overview'], requireAccess('communications.overview.view', ['ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const since = ts(Date.now() - 24 * 60 * 60 * 1000);
    const soon = ts(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const [connections, accounts, conversations, events, grants, templates, rules] = await Promise.all([
      prisma.orm.public.ProviderConnection.where({ domain: 'COMMUNICATIONS' } as any).all().then((rows: any[]) => rows, () => [] as any[]),
      prisma.orm.public.CommunicationAccount.all().then((rows: any[]) => rows, () => [] as any[]),
      prisma.orm.public.Conversation.all().then((rows: any[]) => rows, () => [] as any[]),
      prisma.orm.public.ProviderEvent.where({ domain: 'COMMUNICATIONS' } as any).all().then((rows: any[]) => rows, () => [] as any[]),
      prisma.orm.public.CommunicationGrant.all().then((rows: any[]) => rows, () => [] as any[]),
      prisma.orm.public.CommunicationTemplate.all().then((rows: any[]) => rows, () => [] as any[]),
      prisma.orm.public.RoutingRule.all().then((rows: any[]) => rows, () => [] as any[]),
    ]);

    const openConversations = conversations.filter((c: any) => String(c.status).toUpperCase() === 'OPEN');
    const slaBreached = conversations.filter((c: any) => c.slaBreachedAt && !c.status?.toString().match(/CLOSED|SPAM/i));
    const recentEvents = events.filter((e: any) => tsMs(e.createdAt) >= tsMs(since));

    const visibleConversations: any[] = [];
    const sorted = [...conversations].sort((a: any, b: any) => tsMs(b.lastMessageAt) - tsMs(a.lastMessageAt)).slice(0, 12);
    for (const conversation of sorted) {
      if (!(await canAccessAccount(prisma, req.user, String(conversation.accountId), 'read'))) continue;
      visibleConversations.push(conversation);
      if (visibleConversations.length >= 8) break;
    }

    const byProvider = connections.reduce((acc: Record<string, any>, connection: any) => {
      const key = String(connection.provider);
      acc[key] ??= { total: 0, connected: 0, degraded: 0, errored: 0 };
      acc[key].total += 1;
      if (connection.status === 'CONNECTED') acc[key].connected += 1;
      if (connection.status === 'DEGRADED') acc[key].degraded += 1;
      if (connection.status === 'ERROR' || connection.lastError) acc[key].errored += 1;
      return acc;
    }, {});

    res.json({
      generatedAt: ts(),
      counts: {
        connections: connections.length,
        accounts: accounts.length,
        conversations: conversations.length,
        openConversations: openConversations.length,
        slaBreached: slaBreached.length,
        eventsLast24h: recentEvents.length,
        failedEvents: recentEvents.filter((e: any) => e.status === 'FAILED').length,
        templatesPendingApproval: templates.filter((t: any) => ['DRAFT', 'PENDING_APPROVAL'].includes(String(t.status))).length,
        enabledRules: rules.filter((r: any) => r.enabled).length,
        grantsExpiringSoon: grants.filter((g: any) => g.expiresAt && tsMs(g.expiresAt) <= tsMs(soon)).length,
        drafts: await countRows(prisma.orm.public.EmailDraft.where((d: any) => d.status.eq('DRAFT'))),
        scheduledSends: await countRows(prisma.orm.public.EmailDraft.where((d: any) => d.status.eq('SCHEDULED'))),
      },
      providerHealth: byProvider,
      capabilityMatrix: listCapabilityMatrix(),
      metaCapabilities: listMetaCapabilities(),
      metaFeatureFlags: getMetaFeatureFlags(),
      recentConversations: visibleConversations,
      // Deeply redacted: callback payloads can carry signatures, tokenised URLs
      // and payer PII. The webhook inbox is the only payload-display surface.
      recentEvents: recentEvents.slice(-10).reverse().map(toSafeWebhookEvent),
    });
  });

  router.get(['/capabilities', '/meta-capabilities'], requireAccess('communications.overview.view', ['ADMIN', 'MANAGER', 'SUPER_ADMIN']), (_req, res) => {
    res.json({
      capabilityMatrix: listCapabilityMatrix(),
      meta: listMetaCapabilities(),
    });
  });

  return router;
}
