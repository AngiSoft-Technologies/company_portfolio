import { PrismaClient } from '@prisma/client';

/**
 * Multi-provider AI completion adapter.
 *
 * Speaks the dialects of the common model providers (OpenAI-compatible chat
 * completions, Anthropic Messages, Google Gemini generateContent) so the rest
 * of the app only deals with one small shape. The active provider/model/key is
 * stored in the `Setting` table under `chatbot_ai_config` and edited by an admin
 * from the dashboard; before any config is saved locally it falls back to the
 * AI_* / OPENAI_API_KEY environment variables.
 *
 * Prompts or API keys are never logged.
 */

export type ProviderKind = 'openai' | 'anthropic' | 'google';

export interface AIProviderPreset {
  id: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  defaultModel: string;
  apiKeyEnv?: string;
  /** OpenAI-compatible may return 202 + requestId and need status polling. */
  pollsStatus?: boolean;
  note?: string;
}

export interface AIProviderConfig {
  enabled: boolean;
  provider: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export const AI_CONFIG_SETTING_KEY = 'chatbot_ai_config';

export const AI_PROVIDER_PRESETS: AIProviderPreset[] = [
  { id: 'nvidia', name: 'NVIDIA NIM', kind: 'openai', baseUrl: 'https://integrate.api.nvidia.com', defaultModel: 'meta/llama-3.2-11b-vision-instruct', pollsStatus: true, note: 'OpenAI-compatible endpoints hosted by NVIDIA' },
  { id: 'openai', name: 'OpenAI', kind: 'openai', baseUrl: 'https://api.openai.com', defaultModel: 'gpt-4o-mini', apiKeyEnv: 'OPENAI_API_KEY' },
  { id: 'anthropic', name: 'Anthropic (Claude)', kind: 'anthropic', baseUrl: 'https://api.anthropic.com', defaultModel: 'claude-3-5-sonnet-latest' },
  { id: 'google', name: 'Google (Gemini)', kind: 'google', baseUrl: 'https://generativelanguage.googleapis.com', defaultModel: 'gemini-2.0-flash' },
  { id: 'moonshot', name: 'Moonshot AI (Kimi)', kind: 'openai', baseUrl: 'https://api.moonshot.cn/v1', defaultModel: 'moonshot-v1-8k' },
  { id: 'groq', name: 'Groq', kind: 'openai', baseUrl: 'https://api.groq.com/openai', defaultModel: 'llama-3.3-70b-versatile' },
  { id: 'deepseek', name: 'DeepSeek', kind: 'openai', baseUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-chat' },
  { id: 'xai', name: 'xAI (Grok)', kind: 'openai', baseUrl: 'https://api.x.ai', defaultModel: 'grok-3-mini' },
  { id: 'mistral', name: 'Mistral AI', kind: 'openai', baseUrl: 'https://api.mistral.ai/v1', defaultModel: 'mistral-large-latest' },
  { id: 'openrouter', name: 'OpenRouter', kind: 'openai', baseUrl: 'https://openrouter.ai/api', defaultModel: 'deepseek/deepseek-chat' },
  { id: 'together', name: 'Together AI', kind: 'openai', baseUrl: 'https://api.together.xyz', defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
  { id: 'fireworks', name: 'Fireworks AI', kind: 'openai', baseUrl: 'https://api.fireworks.ai/inference', defaultModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct' },
  { id: 'ollama', name: 'Ollama (local)', kind: 'openai', baseUrl: 'http://localhost:11434', defaultModel: 'llama3.2' },
  { id: 'custom', name: 'Custom (OpenAI-compatible)', kind: 'openai', baseUrl: '', defaultModel: '', note: 'Bring your own base URL' },
];

export class AIProviderError extends Error {}

const presetById = (id?: string): AIProviderPreset | undefined =>
  AI_PROVIDER_PRESETS.find((p) => p.id === (id || ''));

export function resolveProviderKind(baseUrl: string, kind?: string): ProviderKind {
  if (kind === 'anthropic' || kind === 'google' || kind === 'openai') return kind;
  const host = String(baseUrl || '').toLowerCase().replace(/^[a-z]+:\/\//, '').split('/')[0];
  if (host.includes('anthropic.com')) return 'anthropic';
  if (host.includes('googleapis.com') || host.includes('generativelanguage.google')) return 'google';
  return 'openai';
}

const toBool = (value: string | undefined, fallback: boolean): boolean =>
  value === undefined ? fallback : ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());

const toPositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
};

/**
 * Build the configuration from environment variables. This is the default the
 * chatbot uses until an admin saves a configuration in the dashboard.
 */
export function configFromEnv(): AIProviderConfig {
  const baseUrl = process.env.AI_PROVIDER_BASE_URL || '';
  const providerId = process.env.AI_PROVIDER || (baseUrl.includes('nvidia.com') ? 'nvidia' : '');
  const preset = presetById(providerId) || presetById(baseUrl.includes('nvidia.com') ? 'nvidia' : 'custom');

  const config: AIProviderConfig = {
    enabled: toBool(process.env.AI_ENABLED, true),
    provider: providerId || (preset ? preset.id : 'custom'),
    name: process.env.AI_PROVIDER_NAME || (preset ? preset.name : 'OpenAI'),
    kind: resolveProviderKind(baseUrl, process.env.AI_PROVIDER_KIND),
    baseUrl,
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || (preset ? preset.defaultModel : ''),
    maxTokens: toPositiveInt(process.env.AI_MAX_TOKENS, 1200),
    temperature: Number(process.env.AI_TEMPERATURE || 0.3),
    timeoutMs: toPositiveInt(process.env.AI_TIMEOUT, 25) * 1000,
  };

  // Backwards compatible: keep supporting OPENAI_API_KEY when no NVIDIA / AI_*
  // key is configured yet.
  if (!config.apiKey && process.env.OPENAI_API_KEY) {
    config.provider = 'openai';
    config.name = 'OpenAI';
    config.kind = 'openai';
    config.baseUrl = config.baseUrl || 'https://api.openai.com';
    config.model = config.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    config.apiKey = process.env.OPENAI_API_KEY;
  }

  return config;
}

function normalizePartial(value: unknown): Partial<AIProviderConfig> {
  if (!value || typeof value !== 'object') return {};
  const input = value as Record<string, any>;
  return {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : undefined,
    provider: typeof input.provider === 'string' ? input.provider : undefined,
    name: typeof input.name === 'string' ? input.name : undefined,
    kind: resolveProviderKind(
      typeof input.baseUrl === 'string' ? input.baseUrl : '',
      typeof input.kind === 'string' ? input.kind : undefined
    ),
    baseUrl: typeof input.baseUrl === 'string' ? input.baseUrl : undefined,
    apiKey: typeof input.apiKey === 'string' ? input.apiKey : undefined,
    model: typeof input.model === 'string' ? input.model : undefined,
    maxTokens: typeof input.maxTokens === 'number' ? Math.round(input.maxTokens) : undefined,
    temperature: typeof input.temperature === 'number' ? input.temperature : undefined,
    timeoutMs: typeof input.timeoutMs === 'number' ? Math.round(input.timeoutMs) : undefined,
  };
}

/**
 * Load the active AI configuration. A saved dashboard config wins; fields the
 * admin left blank fall back to env values so rotating keys via the UI or server
 * env both keep working.
 */
export async function loadAIConfig(prisma: PrismaClient): Promise<{ config: AIProviderConfig; source: 'db' | 'env' }> {
  const envConfig = configFromEnv();
  try {
    const row = await prisma.setting.findUnique({ where: { key: AI_CONFIG_SETTING_KEY } });
    if (!row || !row.value || typeof row.value !== 'object') {
      return { config: envConfig, source: 'env' };
    }
    const saved = normalizePartial(row.value);
    const preset = presetById(saved.provider) || presetById(envConfig.provider);
    const baseUrl = saved.baseUrl || envConfig.baseUrl || (preset ? preset.baseUrl : '');
    const kind = saved.kind || resolveProviderKind(baseUrl, preset ? preset.kind : undefined);
    return {
      config: {
        enabled: saved.enabled ?? envConfig.enabled,
        provider: saved.provider || envConfig.provider || (preset ? preset.id : ''),
        name: saved.name || envConfig.name || (preset ? preset.name : 'Custom'),
        kind,
        baseUrl,
        apiKey: saved.apiKey || envConfig.apiKey,
        model: saved.model || envConfig.model || (preset && preset.defaultModel ? preset.defaultModel : ''),
        maxTokens: saved.maxTokens || envConfig.maxTokens,
        temperature: saved.temperature ?? envConfig.temperature,
        timeoutMs: saved.timeoutMs || envConfig.timeoutMs,
      },
      source: 'db',
    };
  } catch (err) {
    console.warn('Failed to read AI config from settings, using env:', err);
    return { config: envConfig, source: 'env' };
  }
}

export async function saveAIConfig(prisma: PrismaClient, config: AIProviderConfig): Promise<void> {
  await prisma.setting.upsert({
    where: { key: AI_CONFIG_SETTING_KEY },
    update: { value: config as any },
    create: { key: AI_CONFIG_SETTING_KEY, value: config as any },
  });
}

export function toMasked(config: AIProviderConfig): AIProviderConfig {
  if (!config.apiKey) return config;
  const key = config.apiKey;
  const masked = key.length <= 8 ? '••••••••' : `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
  return { ...config, apiKey: masked };
}

// ─── Provider request building ────────────────────────────────────────────

function joinEndpoint(baseUrl: string, path: string): string {
  const base = String(baseUrl || '').replace(/\/+$/, '');
  if (!base) return path;
  if (base.endsWith('/v1') && path.startsWith('/v1/')) return `${base}${path.slice(3)}`;
  if (base.endsWith('/v1beta') && path.startsWith('/models/')) return `${base}${path}`;
  return `${base}${path}`;
}

async function requestJson(
  url: string,
  method: 'GET' | 'POST' = 'POST',
  headers: Record<string, string>,
  body: string | null,
  timeoutMs: number
): Promise<{ status: number; data: any; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, Math.min(120000, timeoutMs || 30000)));
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: method === 'GET' ? undefined : body || undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    return { status: res.status, data, text };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new AIProviderError(`Provider request timed out after ${timeoutMs}ms`);
    }
    throw new AIProviderError(`Provider request failed: ${err?.message || 'network error'}`);
  } finally {
    clearTimeout(timer);
  }
}

interface BuiltRequest {
  method: 'POST';
  url: string;
  headers: Record<string, string>;
  payload: Record<string, any>;
  pollStatus?: boolean;
}

function buildProviderRequest(
  kind: ProviderKind,
  baseUrl: string,
  model: string,
  apiKey: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number
): BuiltRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };

  if (kind === 'anthropic') {
    if (!apiKey) throw new AIProviderError('Anthropic requires an API key');
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
    const system: string[] = [];
    const chat: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    for (const message of messages) {
      if (message.role === 'system') system.push(message.content);
      else chat.push({ role: message.role === 'assistant' ? 'assistant' : 'user', content: message.content });
    }
    const payload: Record<string, any> = { model, max_tokens: maxTokens, messages: chat, temperature };
    if (system.length) payload.system = system.join('\n\n');
    return { method: 'POST', url: joinEndpoint(baseUrl, '/v1/messages'), headers, payload };
  }

  if (kind === 'google') {
    if (!apiKey) throw new AIProviderError('Google Gemini requires an API key');
    headers['x-goog-api-key'] = apiKey;
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    const systemParts: Array<{ text: string }> = [];
    for (const message of messages) {
      if (message.role === 'system') systemParts.push({ text: message.content });
      else contents.push({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] });
    }
    const payload: Record<string, any> = {
      contents,
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    };
    if (systemParts.length) payload.systemInstruction = { parts: systemParts };
    return { method: 'POST', url: joinEndpoint(baseUrl, `/models/${encodeURIComponent(model)}:generateContent`), headers, payload };
  }

  // OpenAI-compatible (OpenAI, NVIDIA, Moonshot, Groq, DeepSeek, xAI, Ollama, …)
  if (!apiKey) throw new AIProviderError('This provider requires an API key');
  headers.Authorization = `Bearer ${apiKey}`;
  const preset = AI_PROVIDER_PRESETS.find((p) => p.baseUrl && baseUrl.includes(p.baseUrl));
  return {
    method: 'POST',
    url: joinEndpoint(baseUrl, '/v1/chat/completions'),
    headers,
    payload: { model, messages, temperature, max_tokens: maxTokens },
    pollStatus: Boolean(preset?.pollsStatus),
  };
}

function extractContent(kind: ProviderKind, decoded: any): string {
  if (kind === 'anthropic') {
    const parts = Array.isArray(decoded?.content)
      ? decoded.content.filter((part: any) => part && typeof part.text === 'string').map((part: any) => part.text)
      : [];
    return parts.join('');
  }
  if (kind === 'google') {
    const parts = Array.isArray(decoded?.candidates?.[0]?.content?.parts)
      ? decoded.candidates[0].content.parts.filter((part: any) => part && typeof part.text === 'string').map((part: any) => part.text)
      : [];
    return parts.join('');
  }
  return decoded?.choices?.[0]?.message?.content ?? '';
}

function providerErrorMessage(status: number, text: string): string {
  const snippet = text.trim().slice(0, 300);
  return snippet ? `Provider returned HTTP ${status}: ${snippet}` : `Provider returned HTTP ${status}`;
}

/**
 * Run a chat completion against the active provider. Throws AIProviderError if
 * the provider cannot be reached or returns nothing usable.
 */
export async function aiComplete(
  config: AIProviderConfig,
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const baseUrl = String(config.baseUrl || '').trim().replace(/\/+$/, '');
  const model = String(config.model || '').trim();
  if (!baseUrl || !model) {
    throw new AIProviderError('AI provider is not fully configured (base URL or model missing).');
  }

  const kind = resolveProviderKind(baseUrl, config.kind);
  const maxTokens = Math.min(4096, Math.max(64, Math.round(opts.maxTokens ?? config.maxTokens ?? 1200)));
  const temperature = Math.min(2, Math.max(0, opts.temperature ?? config.temperature ?? 0.3));
  const timeoutMs = Math.max(1000, Math.min(120000, config.timeoutMs || 25000));

  const built = buildProviderRequest(kind, baseUrl, model, config.apiKey, messages, maxTokens, temperature);
  let response = await requestJson(built.url, 'POST', built.headers, JSON.stringify(built.payload), timeoutMs);

  // NVIDIA NIM may acknowledge a long-running request with 202 + requestId.
  // Poll its documented status endpoint with the same bearer credential.
  if (response.status === 202 && built.pollStatus && response.data && response.data.requestId) {
    const requestId = String(response.data.requestId);
    if (/^[A-Za-z0-9-]{1,36}$/.test(requestId)) {
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const statusUrl = joinEndpoint(baseUrl, `/v1/status/${encodeURIComponent(requestId)}`);
        response = await requestJson(statusUrl, 'GET', built.headers, null, timeoutMs);
        if (response.status !== 202) break;
      }
    }
  }

  if (response.status < 200 || response.status >= 300 || response.data === null) {
    throw new AIProviderError(providerErrorMessage(response.status, response.text));
  }

  const content = extractContent(kind, response.data);
  if (typeof content !== 'string' || !content.trim()) {
    throw new AIProviderError(`Provider returned no usable content (HTTP ${response.status}).`);
  }
  return content.trim();
}

/**
 * Verify that a provider is reachable and advertise its available models.
 * Returns a list of model ids (or an empty array when the provider lacks a
 * model listing endpoint, e.g. local Ollama on old versions).
 */
export async function aiListModels(config: AIProviderConfig): Promise<string[]> {
  const baseUrl = String(config.baseUrl || '').trim().replace(/\/+$/, '');
  if (!baseUrl) throw new AIProviderError('Base URL is required.');
  const apiKey = config.apiKey || '';
  const kind = resolveProviderKind(baseUrl, config.kind);
  const headers: Record<string, string> = { Accept: 'application/json' };

  let url: string;
  if (kind === 'anthropic') {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
    url = joinEndpoint(baseUrl, '/v1/models');
  } else if (kind === 'google') {
    headers['x-goog-api-key'] = apiKey;
    url = joinEndpoint(baseUrl, '/v1beta/models');
  } else {
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    url = joinEndpoint(baseUrl, '/v1/models');
  }

  const response = await requestJson(url, 'GET', headers, null, config.timeoutMs || 25000);
  if (response.status < 200 || response.status >= 300 || response.data === null) {
    throw new AIProviderError(providerErrorMessage(response.status, response.text));
  }

  if (kind === 'google') {
    const models = Array.isArray(response.data.models) ? response.data.models : [];
    return models
      .map((entry: any) => String(entry?.name || entry?.id || ''))
      .filter(Boolean)
      .map((name: string) => name.replace(/^models\//, ''))
      .sort();
  }

  const data = Array.isArray(response.data?.data) ? response.data.data : [];
  return data
    .map((entry: any) => String(entry?.id || entry?.name || ''))
    .filter(Boolean)
    .sort();
}