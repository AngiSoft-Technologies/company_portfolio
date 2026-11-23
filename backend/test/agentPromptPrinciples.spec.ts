import { describe, it, expect } from 'vitest';
import {
  AGENT_PROMPT_PRINCIPLES,
  agentPromptRules,
} from '../src/modules/agents/services/agentCharters';

/**
 * Prompt-best-practices guard (resource-utilisation plan item 6.13).
 *
 * The same rules are injected into every agent narrative prompt and into the
 * AI Boardroom system prompt. This spec protects the shared source of truth so
 * a future edit cannot silently drop one of the four practices.
 */
describe('agent prompt principles', () => {
  it('covers all four documented practices', () => {
    const joined = AGENT_PROMPT_PRINCIPLES.join(' ').toLowerCase();
    expect(joined).toContain('action');
    expect(joined).toContain('recommendation');
    expect(joined).toContain('structured fields');
    expect(joined).toContain('split multi-step');
    expect(joined).toContain('pii');
    expect(joined).toContain('secrets');
    expect(joined).toContain('redact');
  });

  it('formats every principle as a bullet for system-prompt injection', () => {
    const rules = agentPromptRules();
    expect(rules.split('\n')).toHaveLength(AGENT_PROMPT_PRINCIPLES.length);
    for (const line of rules.split('\n')) expect(line.startsWith('- ')).toBe(true);
  });
});
