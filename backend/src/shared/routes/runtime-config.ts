import { Router } from 'express';
import { z } from 'zod';
import { requireRoles } from '../middleware/roles';
import { logAudit } from '../services/audit';
import {
  CONFIG_REGISTRY,
  deleteConfigValue,
  listConfigForAdmin,
  setConfigValue,
} from '../services/runtimeConfig';
import type { AuthRequest } from '../middleware/auth';

const knownKeys = new Set(CONFIG_REGISTRY.map((item) => item.key));
const writeSchema = z.object({
  value: z.string().max(16_384),
});

/**
 * SUPER_ADMIN-only configuration vault. Secrets are stored encrypted and are
 * never returned in plaintext — only a masked preview and metadata.
 */
export default function runtimeConfigRouter(): Router {
  const router = Router();
  router.use(requireRoles('SUPER_ADMIN'));

  router.get('/', async (req, res) => {
    try {
      res.json({ items: await listConfigForAdmin() });
    } catch {
      res.status(500).json({ error: 'Could not load configuration' });
    }
  });

  router.put('/:key', async (req: AuthRequest, res) => {
    try {
      const key = String(req.params.key || '');
      if (!knownKeys.has(key)) return res.status(404).json({ error: 'Unknown configuration key' });
      const parsed = writeSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'A string value is required' });
      await setConfigValue(key, parsed.data.value);
      await logAudit({
        actorId: req.user?.sub || null,
        actorRole: req.user?.role || null,
        action: 'update_runtime_config',
        entity: 'RuntimeConfig',
        entityId: key,
        meta: { kind: CONFIG_REGISTRY.find((item) => item.key === key)?.kind },
      });
      res.json({ ok: true, key });
    } catch {
      res.status(500).json({ error: 'Could not save configuration' });
    }
  });

  router.delete('/:key', async (req: AuthRequest, res) => {
    try {
      const key = String(req.params.key || '');
      if (!knownKeys.has(key)) return res.status(404).json({ error: 'Unknown configuration key' });
      await deleteConfigValue(key);
      await logAudit({
        actorId: req.user?.sub || null,
        actorRole: req.user?.role || null,
        action: 'delete_runtime_config',
        entity: 'RuntimeConfig',
        entityId: key,
      });
      res.json({ ok: true, key });
    } catch {
      res.status(500).json({ error: 'Could not remove configuration' });
    }
  });

  return router;
}
