import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  calculateCutoff,
  classifyTable,
  DEFAULT_BATCH_LIMIT,
  isDataRetentionEnabled,
  MAX_BATCH_LIMIT,
  planDataRetention,
  resolveBatchLimit,
  runDataRetention,
  type RetentionRow,
} from '../src/workers/dataRetention';

const NOW = '2026-11-23T12:00:00.000Z';
const ENABLED = { DATA_RETENTION_ENABLED: 'true' } as NodeJS.ProcessEnv;

function rows(dates: readonly (string | null)[]): RetentionRow[] {
  return dates.map((date, index) => ({
    id: `row-${index}`,
    createdAt: date,
    updatedAt: date,
    occurredAt: date,
    startedAt: date,
  }));
}

describe('data retention classification', () => {
  it('classifies every required Phase 7 high-write/config table', () => {
    const expected = {
      ProviderEvent: ['operational', 'createdAt', 90, 'archive-plan'],
      ConversationMessage: ['operational', 'createdAt', 365, 'archive-plan'],
      LedgerEntry: ['immutable-financial', 'occurredAt', 730, 'archive-plan'],
      AuditLog: ['compliance-audit', 'createdAt', 730, 'archive-plan'],
      AgentRun: ['operational', 'startedAt', 90, 'archive-plan'],
      ProviderConnection: ['configuration', 'updatedAt', 365, 'review-only'],
      ProviderSecret: ['secret-material', 'createdAt', null, 'retain-indefinitely'],
      CommunicationAccount: ['configuration', 'updatedAt', 365, 'review-only'],
      EmailDraft: ['operational', 'updatedAt', 90, 'archive-plan'],
      EmailSendAsIdentity: ['configuration', 'updatedAt', 365, 'review-only'],
    } as const;

    for (const [table, [retentionClass, cutoffField, archiveAfterDays, disposition]] of Object.entries(expected)) {
      const policy = classifyTable(table);
      expect(policy, `policy for ${table}`).toBeDefined();
      expect(policy?.retentionClass).toBe(retentionClass);
      expect(policy?.cutoffField).toBe(cutoffField);
      expect(policy?.archiveAfterDays).toBe(archiveAfterDays);
      expect(policy?.disposition).toBe(disposition);
      expect(policy?.archiveDestination === null).toBe(archiveAfterDays === null);
    }
  });

  it('leaves unmapped tables unclassified', () => {
    expect(classifyTable('Client')).toBeUndefined();
    expect(classifyTable('')).toBeUndefined();
  });
});

describe('data retention cutoff calculation', () => {
  it('subtracts whole days from the reference instant', () => {
    expect(calculateCutoff(NOW, 90)).toBe('2026-08-25T12:00:00.000Z');
    expect(calculateCutoff(Date.parse(NOW), 365)).toBe('2025-11-23T12:00:00.000Z');
    expect(calculateCutoff(new Date(NOW), 1)).toBe('2026-11-22T12:00:00.000Z');
  });

  it('rejects invalid windows and dates', () => {
    expect(() => calculateCutoff(NOW, 0)).toThrow(RangeError);
    expect(() => calculateCutoff(NOW, -1)).toThrow(RangeError);
    expect(() => calculateCutoff(NOW, 1.5)).toThrow(RangeError);
    expect(() => calculateCutoff('not-a-date', 90)).toThrow(RangeError);
    expect(() => calculateCutoff(new Date('invalid'), 90)).toThrow(RangeError);
  });
});

describe('data retention limits', () => {
  it('uses a safe default and clamps explicit values', () => {
    expect(DEFAULT_BATCH_LIMIT).toBe(500);
    expect(MAX_BATCH_LIMIT).toBe(5000);
    expect(resolveBatchLimit(undefined)).toBe(500);
    expect(resolveBatchLimit('')).toBe(500);
    expect(resolveBatchLimit('25')).toBe(25);
    expect(resolveBatchLimit(700)).toBe(700);
    expect(resolveBatchLimit('999999')).toBe(5000);
  });

  it('falls back on invalid or non-positive values', () => {
    expect(resolveBatchLimit('abc')).toBe(500);
    expect(resolveBatchLimit('0')).toBe(500);
    expect(resolveBatchLimit(-3)).toBe(500);
    expect(resolveBatchLimit(2.5)).toBe(500);
  });
});

describe('data retention enabled flag', () => {
  it('requires an explicit true value', () => {
    expect(isDataRetentionEnabled({ DATA_RETENTION_ENABLED: 'true' })).toBe(true);
    expect(isDataRetentionEnabled({ DATA_RETENTION_ENABLED: ' TRUE ' })).toBe(true);
    expect(isDataRetentionEnabled({})).toBe(false);
    expect(isDataRetentionEnabled({ DATA_RETENTION_ENABLED: 'false' })).toBe(false);
    expect(isDataRetentionEnabled({ DATA_RETENTION_ENABLED: '1' })).toBe(false);
  });

  it('is a complete no-op when disabled, even with rows supplied', async () => {
    const logs: string[] = [];
    const plan = planDataRetention({
      env: {},
      now: NOW,
      rowsByTable: { ProviderEvent: rows([NOW]) },
    });
    const result = await runDataRetention({
      env: {},
      now: NOW,
      log: (message) => logs.push(message),
      rowsByTable: { ProviderEvent: rows([NOW]) },
    });

    expect(plan.enabled).toBe(false);
    expect(plan.batches).toEqual([]);
    expect(result.executed).toBe(0);
    expect(result.deletions).toBe(0);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain('disabled');
  });
});

describe('data retention planning', () => {
  it('produces bounded, sorted archive batches with no deletion eligibility', () => {
    const plan = planDataRetention({
      env: ENABLED,
      now: NOW,
      limit: 2,
      rowsByTable: {
        AuditLog: rows(['2020-01-01T00:00:00.000Z', '2021-01-01T00:00:00.000Z', '2030-01-01T00:00:00.000Z']),
        ProviderEvent: rows(['2026-11-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z']),
        ProviderSecret: rows(['2000-01-01T00:00:00.000Z']),
        UnknownTable: rows(['2000-01-01T00:00:00.000Z']),
      },
    });

    expect(plan.enabled).toBe(true);
    expect(plan.dryRun).toBe(true);
    expect(plan.limit).toBe(2);
    expect(plan.batches.map((batch) => batch.table)).toEqual(['AuditLog', 'ProviderEvent']);
    const [audit, events] = plan.batches;
    expect(audit.action).toBe('archive-plan');
    expect(audit.cutoffField).toBe('createdAt');
    expect(audit.cutoff).toBe('2024-11-23T12:00:00.000Z');
    expect(audit.candidateCount).toBe(2);
    expect(audit.candidateIds).toEqual(['row-0', 'row-1']);
    expect(events.candidateCount).toBe(1);
    expect(events.candidateIds).toEqual(['row-1']);
    for (const batch of plan.batches) {
      expect(batch.deleteEligible).toBe(false);
      expect(batch.archiveDestination).toContain('tigris://angisoft-retention/archive/');
    }
    expect(plan.writes).toBe(0);
    expect(plan.deletions).toBe(0);
    expect(plan.providerCalls).toBe(0);
  });

  it('honors explicit per-table cutoffs and skips invalid timestamps', () => {
    const plan = planDataRetention({
      env: ENABLED,
      now: NOW,
      cutoffs: { ConversationMessage: '2026-01-01T00:00:00.000Z' },
      rowsByTable: {
        ConversationMessage: rows(['2025-12-31T00:00:00.000Z', '2026-06-01T00:00:00.000Z', null, 'bad-date']),
      },
    });

    expect(plan.batches).toHaveLength(1);
    expect(plan.batches[0].cutoff).toBe('2026-01-01T00:00:00.000Z');
    expect(plan.batches[0].candidateCount).toBe(1);
    expect(plan.batches[0].candidateIds).toEqual(['row-0']);
  });

  it('logs the plan and reports zero executions when enabled', async () => {
    const logs: string[] = [];
    const result = await runDataRetention({
      env: ENABLED,
      now: NOW,
      log: (message) => logs.push(message),
      rowsByTable: { LedgerEntry: rows(['2000-01-01T00:00:00.000Z']) },
    });

    expect(result.enabled).toBe(true);
    expect(result.batches).toHaveLength(1);
    expect(result.batches[0].action).toBe('archive-plan');
    expect(logs.some((line) => line.includes('planned archive-plan: LedgerEntry'))).toBe(true);
    expect(logs.at(-1)).toContain('0 executed, 0 deleted');
    expect(result.executed).toBe(0);
    expect(result.writes).toBe(0);
    expect(result.deletions).toBe(0);
    expect(result.providerCalls).toBe(0);
  });
});

describe('data retention zero-write guarantee', () => {
  it('has no database, queue, provider, or network code paths', () => {
    const source = readFileSync(new URL('../src/workers/dataRetention.ts', import.meta.url), 'utf8');
    const forbidden = [
      /from\s+['"][^'"]*(?:db|queue|prisma|provider|email|secrets|storage)[^'"]*['"]/i,
      /require\s*\(/,
      /\b(?:fetch|createWorker|PrismaClient|sendMail)\s*\(/,
      /\bprisma\./,
      /\.(?:delete|deleteMany|update|updateMany|create|createMany|upsert|executeRaw)\s*\(/,
      /DATABASE_URL/,
    ];
    for (const pattern of forbidden) {
      expect(source.match(pattern), `forbidden pattern in worker source: ${pattern}`).toBeNull();
    }
  });
});
