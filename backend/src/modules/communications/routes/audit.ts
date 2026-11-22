import { Router } from 'express';
import type { Db } from '../../../db';
import { tsMs } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';

const SENSITIVE = /token|secret|password|authorization|code|signature|apikey|api_key/i;

function redact(value: unknown): unknown {
  if (value == null) return null;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE.test(key) ? '••••' : redact(item);
    }
    return out;
  }
  return value;
}

function csvCell(value: unknown): string {
  const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(redact(value)) : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export default function communicationsAuditRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  async function queryAudit(req: any, limit: number) {
    const action = req.query.action ? String(req.query.action) : undefined;
    const actorId = req.query.actorId ? String(req.query.actorId) : undefined;
    const from = req.query.from ? tsMs(String(req.query.from)) : 0;
    const to = req.query.to ? tsMs(String(req.query.to)) : 0;
    let rows = await prisma.orm.public.AuditLog
      .orderBy((a: any) => a.createdAt.desc()).limit(limit * 2)
      .all().then((rows: any[]) => rows, () => [] as any[]) as any[];
    rows = rows.filter((row) => String(row.action ?? '').startsWith('communications.')
      || String(row.entity ?? '').match(/Conversation|Communication|ProviderConnection|ProviderEvent|RoutingRule|Email/));
    if (action) rows = rows.filter((row) => String(row.action).includes(action));
    if (actorId) rows = rows.filter((row) => row.actorId === actorId);
    if (from) rows = rows.filter((row) => tsMs(row.createdAt) >= from);
    if (to) rows = rows.filter((row) => tsMs(row.createdAt) <= to);
    return rows.slice(0, limit).map((row) => ({ ...row, meta: redact(row.meta) }));
  }

  router.get(['/', '/audit'], requireAccess('communications.audit.view', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    res.json({ entries: await queryAudit(req, limit) });
  });

  router.get('/export', requireAccess('communications.export', ['SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const limit = Math.min(Number(req.query.limit) || 500, 2000);
    const entries = await queryAudit(req, limit);
    const events = await prisma.orm.public.ProviderEvent
      .where({ domain: 'COMMUNICATIONS' } as any)
      .orderBy((e: any) => e.createdAt.desc()).limit(limit)
      .all().then((rows: any[]) => rows, () => [] as any[]) as any[];
    const header = ['type', 'id', 'createdAt', 'actorId', 'action', 'entity', 'entityId', 'provider', 'status', 'meta'];
    const lines = [header.join(',')];
    for (const entry of entries) {
      lines.push(['audit', entry.id, entry.createdAt, entry.actorId, entry.action, entry.entity, entry.entityId, '', '', entry.meta].map(csvCell).join(','));
    }
    for (const event of events) {
      lines.push(['provider-event', event.id, event.createdAt, '', event.eventType, '', '', event.provider, event.status,
        { error: event.error, signatureValid: event.signatureValid }].map(csvCell).join(','));
    }
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any,
      action: 'communications.export', entity: 'AuditLog',
      meta: { entries: entries.length, providerEvents: events.length },
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="communications-audit.csv"');
    res.send(lines.join('\n'));
  });

  return router;
}
