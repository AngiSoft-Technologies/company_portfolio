import type { Db } from '../../../db';
import { loadAIConfig, aiComplete, AIProviderError } from './aiProvider';

/**
 * AI assistance endpoints (DIGITAL_HQ_PLAN Phase 4.5): lead scoring, support
 * triage, content suggestions, and diff review. All helpers return plain
 * JSON-shaped results; prompts never include secrets.
 */

export interface AssistResult {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

/** Extract the first balanced JSON object from an LLM response. */
export function extractJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

async function completeJson(
  prisma: Db,
  system: string,
  user: string,
  maxTokens = 800,
): Promise<AssistResult> {
  try {
    const { config } = await loadAIConfig(prisma);
    if (!config.enabled || !config.apiKey) {
      return { ok: false, error: 'AI assistant is not configured. Set it up under AI Configuration.' };
    }
    const raw = await aiComplete(config, [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], { maxTokens, temperature: 0.2 });
    const data = extractJsonObject(raw);
    if (!data) return { ok: false, error: 'AI returned an unparseable response.' };
    return { ok: true, data };
  } catch (err) {
    const msg = err instanceof AIProviderError ? err.message : 'AI request failed';
    return { ok: false, error: msg };
  }
}

const JSON_ONLY = 'Respond with a single JSON object only — no markdown, no commentary.';

export async function scoreLead(prisma: Db, input: {
  name?: string; email?: string; company?: string; message?: string;
  budget?: string; timeline?: string; source?: string;
}): Promise<AssistResult> {
  const user = [
    `Lead details:\n${JSON.stringify(input, null, 2)}`,
    '',
    'Score this sales lead from 0-100 for likelihood to convert, based on budget clarity, timeline urgency, company fit for a software agency, and message specificity.',
    'Return JSON: {"score": <0-100>, "confidence": "low|medium|high", "reasons": ["..."], "recommendedAction": "...", "suggestedFollowUpHours": <number>}',
  ].join('\n');
  return completeJson(prisma,
    `You are a sales operations assistant for a software agency. ${JSON_ONLY}`,
    user);
}

export async function triageTicket(prisma: Db, input: {
  subject?: string; body?: string; priority?: string; clientName?: string;
}): Promise<AssistResult> {
  const user = [
    `Ticket details:\n${JSON.stringify(input, null, 2)}`,
    '',
    'Triage this support ticket. Return JSON: {"suggestedPriority": "low|normal|high|urgent", "category": "billing|bug|feature_request|account|other", "escalate": <boolean>, "reason": "...", "draftReply": "<2-3 sentence professional first response>"}',
  ].join('\n');
  return completeJson(prisma,
    `You are a customer support triage assistant. Be concise and accurate. ${JSON_ONLY}`,
    user);
}

export async function suggestContent(prisma: Db, input: {
  type?: string; topic?: string; keywords?: string[]; audience?: string;
}): Promise<AssistResult> {
  const user = [
    `Content request:\n${JSON.stringify(input, null, 2)}`,
    '',
    'Suggest content for a software agency marketing site. Return JSON: {"titles": ["...3 options..."], "outline": ["...section headings..."], "keywords": ["...5 SEO keywords..."], "cta": "<suggested call-to-action>"}',
  ].join('\n');
  return completeJson(prisma,
    `You are a content marketing assistant for a software development agency. ${JSON_ONLY}`,
    user);
}

export async function reviewDiff(prisma: Db, input: {
  diff?: string; context?: string;
}): Promise<AssistResult> {
  const diff = String(input.diff ?? '').slice(0, 12000);
  if (!diff.trim()) return { ok: false, error: 'diff is required' };
  const user = [
    `Change request:\n${input.context ?? '(none)'}`,
    '',
    'Review this diff for correctness, security issues, and convention violations. Return JSON: {"verdict": "approve|comment|request_changes", "summary": "...", "issues": [{"severity": "low|medium|high", "file": "...", "line": <number|null>, "problem": "...", "suggestion": "..."}]}',
    '',
    '```diff',
    diff,
    '```',
  ].join('\n');
  return completeJson(prisma,
    `You are a senior code reviewer. Focus on real defects, not style nits. ${JSON_ONLY}`,
    user, 1500);
}
