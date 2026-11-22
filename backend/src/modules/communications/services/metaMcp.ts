/**
 * Meta MCP client (Phase 7 7F).
 *
 * The docs summary lists three remote MCP servers. This module actually calls
 * them over Streamable HTTP / JSON-RPC 2.0. Guardrails are deliberate:
 *
 * - Only the three exact documented HTTPS URLs are accepted. A docs page URL,
 *   a lookalike host or a query string is rejected before any request is made.
 * - Only read-style tools (list/get/read/search/query/describe/...) can run;
 *   spend/publish/send tools are refused locally.
 * - Every call is capability-gated and audited; no token or argument value is
 *   ever logged or returned to the browser.
 */

import { getConfig } from '../../../shared/services/runtimeConfig';
import { logAudit } from '../../../shared/services/audit';
import { ProviderCapabilityError } from './capabilities';
import { ProviderConfigurationError } from './providerSecrets';
import { assertMetaOperation, META_MCP_ENDPOINTS, type MetaOperation } from './metaCapabilities';

export type McpOperation = Extract<MetaOperation, 'mcp.ads' | 'mcp.social' | 'mcp.whatsapp'>;

export const MCP_OPERATIONS: McpOperation[] = ['mcp.ads', 'mcp.social', 'mcp.whatsapp'];

// Single source of truth shared with the capability reporter.
const ENDPOINTS: Record<McpOperation, { configKey: string; url: string }> = META_MCP_ENDPOINTS;

const READ_TOOL = /^(list|get|read|search|query|describe|inspect|fetch|find|view|check)_?/i;
const WRITE_TOOL = /(create|update|delete|remove|send|publish|post|spend|write|edit|set|add|approve|refund|cancel|pause|resume|execute|apply|bid)/i;
const SECRET_ARG_KEY = /(token|secret|password|auth|cookie|credential)/i;

interface RpcResponse<T = Record<string, unknown>> {
  result?: T;
  error?: { code?: number; message?: string };
}

interface Session {
  id: string;
  expiresAt: number;
}

const sessions = new Map<McpOperation, Session>();

function normalizeOperation(value: string): McpOperation {
  if (!MCP_OPERATIONS.includes(value as McpOperation)) {
    throw new ProviderConfigurationError(`Unsupported Meta MCP operation '${value}'`);
  }
  return value as McpOperation;
}

/** Fail closed unless the configured URL is exactly one of Meta's MCP URLs. */
export function resolveMcpEndpoint(operation: string): string {
  const op = normalizeOperation(operation);
  const spec = ENDPOINTS[op];
  const configured = String(getConfig(spec.configKey) || spec.url).trim().replace(/\/+$/, '');
  if (configured !== spec.url) {
    throw new ProviderConfigurationError(`${spec.configKey} must be exactly ${spec.url}`);
  }
  return configured;
}

function mcpToken(): string {
  const token = getConfig('META_MCP_ACCESS_TOKEN') || getConfig('META_SYSTEM_USER_TOKEN');
  if (!token) {
    throw new ProviderConfigurationError('META_MCP_ACCESS_TOKEN is not configured');
  }
  return token;
}

/** Accept both plain JSON and SSE (`data: {...}`) MCP responses. */
function parseRpcBody(raw: string): RpcResponse {
  const text = raw.trim();
  if (!text) return {};
  if (text.startsWith('{')) {
    try { return JSON.parse(text) as RpcResponse; } catch { return {}; }
  }
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    try {
      const parsed = JSON.parse(line.slice(5).trim()) as RpcResponse;
      if (parsed.result !== undefined || parsed.error !== undefined) return parsed;
    } catch { /* ignore non-JSON SSE comments/events */ }
  }
  return {};
}

let rpcId = 0;

async function rpc<T = Record<string, unknown>>(
  url: string,
  method: string,
  params: Record<string, unknown>,
  sessionId?: string,
): Promise<{ body: RpcResponse<T>; sessionId?: string }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      authorization: `Bearer ${mcpToken()}`,
      ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
    signal: AbortSignal.timeout(20_000),
  });
  const nextSession = response.headers.get('mcp-session-id') || sessionId;
  const raw = await response.text();
  if (!response.ok) {
    throw new ProviderConfigurationError(`Meta MCP ${method} failed (HTTP ${response.status})`);
  }
  const body = parseRpcBody(raw) as RpcResponse<T>;
  if (body.error) {
    // MCP error bodies can echo request context; keep only the code.
    throw new ProviderConfigurationError(`Meta MCP ${method} returned error ${body.error.code ?? 'unknown'}`);
  }
  return { body, sessionId: nextSession };
}

async function sessionFor(operation: McpOperation): Promise<{ url: string; sessionId?: string }> {
  const cached = sessions.get(operation);
  if (cached && cached.expiresAt > Date.now()) {
    return { url: resolveMcpEndpoint(operation), sessionId: cached.id };
  }
  const url = resolveMcpEndpoint(operation);
  const protocolVersion = String(getConfig('META_MCP_PROTOCOL_VERSION') || '2025-06-18');
  const { body, sessionId } = await rpc(url, 'initialize', {
    protocolVersion,
    capabilities: {},
    clientInfo: { name: 'angisoft-digital-hq', version: '1.0.0' },
  });
  const id = sessionId || String((body.result as { sessionId?: string } | undefined)?.sessionId ?? `local:${operation}`);
  sessions.set(operation, { id, expiresAt: Date.now() + 30 * 60 * 1000 });
  // Initialised notification has no id and no expected response.
  void rpc(url, 'notifications/initialized', {}, id).catch(() => undefined);
  return { url, sessionId: id };
}

function filterTools(tools: unknown): Array<{ name: string; description?: string; inputSchema?: unknown }> {
  if (!Array.isArray(tools)) return [];
  return tools.slice(0, 100).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const tool = item as { name?: unknown; description?: unknown; inputSchema?: unknown };
    if (typeof tool.name !== 'string' || !tool.name) return [];
    return [{
      name: tool.name,
      ...(typeof tool.description === 'string' ? { description: tool.description.slice(0, 1000) } : {}),
      ...(tool.inputSchema ? { inputSchema: tool.inputSchema } : {}),
    }];
  });
}

/** Read-only tool catalogue for one Meta MCP server. */
export async function listMetaMcpTools(operation: string, actorId?: string | null) {
  const op = normalizeOperation(operation);
  assertMetaOperation(op);
  const { url, sessionId } = await sessionFor(op);
  const { body } = await rpc<{ tools?: unknown }>(url, 'tools/list', {}, sessionId);
  const tools = filterTools(body.result?.tools);
  await logAudit({
    actorId: actorId ?? null,
    action: 'communications.meta.mcp.tools',
    entity: 'ProviderConnection',
    entityId: op,
    meta: { operation: op, toolCount: tools.length, readOnly: true },
  });
  return { operation: op, tools };
}

/** Strip credential-shaped keys and cap the argument payload before an MCP call. */
export function sanitizeMcpArgs(args: unknown): Record<string, unknown> {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
    if (SECRET_ARG_KEY.test(key)) continue;
    out[key.slice(0, 80)] = value;
  }
  const serialized = JSON.stringify(out);
  if (serialized && serialized.length > 8192) throw new ProviderConfigurationError('MCP arguments are too large');
  return out;
}

/** Reject spend/publish/send tools before any network call. */
export function assertReadOnlyMcpTool(tool: string): void {
  const name = String(tool ?? '').trim();
  if (!name || name.length > 120 || !/^[A-Za-z0-9_.-]+$/.test(name)) {
    throw new ProviderCapabilityError('META', 'read', 'Invalid MCP tool name');
  }
  if (!READ_TOOL.test(name) || WRITE_TOOL.test(name)) {
    throw new ProviderCapabilityError('META', 'read', `MCP tool '${name}' is not a read-only tool`);
  }
}

/** Execute one read-only tool against a Meta MCP server. */
export async function callMetaMcpTool(
  operation: string,
  tool: string,
  args: unknown,
  actorId?: string | null,
) {
  const op = normalizeOperation(operation);
  assertMetaOperation(op);
  assertReadOnlyMcpTool(tool);
  const safeArgs = sanitizeMcpArgs(args);
  const { url, sessionId } = await sessionFor(op);
  const { body } = await rpc<{ content?: unknown; structuredContent?: unknown }>(
    url,
    'tools/call',
    { name: tool, arguments: safeArgs },
    sessionId,
  );
  await logAudit({
    actorId: actorId ?? null,
    action: 'communications.meta.mcp.call',
    entity: 'ProviderConnection',
    entityId: op,
    meta: { operation: op, tool, readOnly: true },
  });
  const result = body.result ?? {};
  return { operation: op, tool, content: result.content ?? null, structuredContent: result.structuredContent ?? null };
}
