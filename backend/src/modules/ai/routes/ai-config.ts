import { Router, Request, Response } from 'express';
import type { Db } from '../../../db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { z } from 'zod';
import { logAudit } from '../../../shared/services/audit';
import {
  AI_PROVIDER_PRESETS,
  AIProviderConfig,
  AIProviderError,
  aiComplete,
  aiListModels,
  loadAIConfig,
  resolveProviderKind,
  saveAIConfig,
  toMasked,
} from '../../../modules/ai/services/aiProvider';

const configSchema = z.object({
  enabled: z.boolean().optional(),
  provider: z.string().min(1).max(60).optional(),
  name: z.string().max(80).optional(),
  kind: z.enum(['openai', 'anthropic', 'google']).optional(),
  baseUrl: z.string().max(500).optional(),
  apiKey: z.string().max(1000).optional(),
  model: z.string().max(300).optional(),
  maxTokens: z.number().int().min(64).max(8192).optional(),
  temperature: z.number().min(0).max(2).optional(),
  timeoutMs: z.number().int().min(1000).max(120000).optional(),
});

const MASK_RE = /(?:^\*{2,}|••)/;

export default function aiConfigRouter(prisma: Db) {
  const router = Router();

  router.use(requireAuth);

  const requireAdmin = (req: AuthRequest, res: any, next: any) => {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };

  const readCandidateConfig = async (
    req: Request,
    fallback: AIProviderConfig
  ): Promise<{ config: AIProviderConfig; error?: string }> => {
    const parsed = configSchema.safeParse(req.body?.config ?? req.body ?? {});
    if (!parsed.success) {
      return { config: fallback, error: 'Invalid configuration: ' + parsed.error.issues[0]?.message };
    }
    const input = parsed.data;

    // A masked key means the admin left the key untouched; reuse the saved one.
    let apiKey = input.apiKey || fallback.apiKey;
    if (typeof input.apiKey === 'string' && MASK_RE.test(input.apiKey)) {
      apiKey = fallback.apiKey;
    }

    const baseUrl = (input.baseUrl || fallback.baseUrl || '').trim().replace(/\/+$/, '');
    const kind = input.kind || fallback.kind || resolveProviderKind(baseUrl);

    return {
      config: {
        enabled: input.enabled ?? fallback.enabled,
        provider: input.provider || fallback.provider || 'custom',
        name: input.name || fallback.name || 'Custom',
        kind,
        baseUrl,
        apiKey,
        model: input.model || fallback.model || '',
        maxTokens: input.maxTokens || fallback.maxTokens || 1200,
        temperature: input.temperature ?? fallback.temperature ?? 0.3,
        timeoutMs: input.timeoutMs || fallback.timeoutMs || 25000,
      },
    };
  };

  // ─── Current config + available provider presets ─────────────────────────
  router.get('/ai-config', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { config, source } = await loadAIConfig(prisma as any);
      res.json({ config, source, presets: AI_PROVIDER_PRESETS });
    } catch (err: any) {
      console.error('Failed to load AI config:', err);
      res.status(500).json({ error: 'Failed to load AI configuration' });
    }
  });

  // ─── Save configuration ──────────────────────────────────────────────────
  router.put('/ai-config', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { config: saved } = await loadAIConfig(prisma as any);
      const { config, error } = await readCandidateConfig(req, saved);
      if (error) return res.status(400).json({ error });

      if (!config.baseUrl || !config.model) {
        return res.status(400).json({ error: 'Base URL and model are required.' });
      }

      await saveAIConfig(prisma as any, config);
      await logAudit({
        action: 'update_ai_config',
        entity: 'Setting',
        entityId: 'chatbot_ai_config',
        actorId: req.user?.sub || null,
        actorRole: req.user?.role || null,
        meta: { provider: config.provider, model: config.model, baseUrl: config.baseUrl },
      });

      res.json({ config, masked: toMasked(config) });
    } catch (err: any) {
      console.error('Failed to save AI config:', err);
      res.status(500).json({ error: 'Failed to save AI configuration' });
    }
  });

  // ─── Test connection ─────────────────────────────────────────────────────
  router.post('/ai-config/test', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { config: saved } = await loadAIConfig(prisma as any);
      const { config, error } = await readCandidateConfig(req, saved);
      if (error) return res.status(400).json({ error });
      if (!config.baseUrl || !config.model) {
        return res.status(400).json({ error: 'Base URL and model are required to test.' });
      }
      if (!config.apiKey) {
        return res.status(400).json({ error: 'An API key is required to test the connection.' });
      }

      const started = Date.now();
      const reply = await aiComplete(
        config,
        [
          { role: 'system', content: 'You are a connectivity test. Reply with the single word OK and nothing else.' },
          { role: 'user', content: 'ping' },
        ],
        { maxTokens: 16, temperature: 0 }
      );
      res.json({
        ok: true,
        message: `Connected as “${config.provider}” (${config.model}). Model replied: ${reply.slice(0, 120)}`,
        provider: config.provider,
        model: config.model,
        latencyMs: Date.now() - started,
      });
    } catch (err: any) {
      if (err instanceof AIProviderError) {
        return res.status(502).json({ ok: false, error: err.message });
      }
      console.error('AI config test failed:', err);
      res.status(502).json({ ok: false, error: err?.message || 'Connection test failed' });
    }
  });

  // ─── Fetch available models ──────────────────────────────────────────────
  router.post('/ai-config/models', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { config: saved } = await loadAIConfig(prisma as any);
      const { config, error } = await readCandidateConfig(req, saved);
      if (error) return res.status(400).json({ error });
      if (!config.baseUrl) return res.status(400).json({ error: 'Base URL is required.' });

      const models = await aiListModels(config);
      res.json({ ok: true, models });
    } catch (err: any) {
      if (err instanceof AIProviderError) {
        return res.status(502).json({ ok: false, error: err.message });
      }
      console.error('Failed to list AI models:', err);
      res.status(502).json({ ok: false, error: err?.message || 'Failed to fetch models' });
    }
  });

  return router;
}
