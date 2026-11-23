/**
 * Data-retention planner (ANGISOFT_DIGITAL_HQ_PLAN §18.4 / §18.9).
 *
 * This module is deliberately pure: it classifies high-write Phase 7 tables,
 * calculates cutoffs, and returns bounded archive/review batches. It does NOT
 * import the shared Prisma client, any queue, or any provider service, so it
 * cannot read/write the database or call an external API. `runDataRetention`
 * only logs the plan — deletion needs a separate, owner-approved implementation.
 *
 * See docs/DATA_RETENTION.md for the retention policy, rationale, and archive
 * destination strategy.
 */

export type RetentionClass =
  | 'immutable-financial'
  | 'compliance-audit'
  | 'operational'
  | 'configuration'
  | 'secret-material';

export type RetentionDisposition = 'archive-plan' | 'review-only' | 'retain-indefinitely';

export interface RetentionPolicy {
  readonly table: string;
  readonly retentionClass: RetentionClass;
  /** Column used for age comparisons; must be indexed before a real sweep. */
  readonly cutoffField: string;
  /** Age after which archive becomes a candidate. null = never auto-archive. */
  readonly archiveAfterDays: number | null;
  /** Documentation only. No deletion is implemented or authorized here. */
  readonly proposedDeleteAfterDays: number | null;
  readonly disposition: RetentionDisposition;
  readonly rationale: string;
  /** Logical archive location; no object-store client is used by this module. */
  readonly archiveDestination: string | null;
}

export interface RetentionRow {
  readonly id: string;
  readonly [field: string]: unknown;
}

export interface RetentionPlanInput {
  /** Pre-fetched rows keyed by table. This module never fetches them itself. */
  readonly rowsByTable?: Readonly<Record<string, readonly RetentionRow[]>>;
  /** Explicit per-table cutoff overrides (ISO string / epoch ms / Date). */
  readonly cutoffs?: Readonly<Record<string, string | number | Date>>;
  readonly now?: string | number | Date;
  readonly limit?: unknown;
  readonly env?: NodeJS.ProcessEnv;
}

export interface RetentionBatch {
  readonly table: string;
  readonly retentionClass: RetentionClass;
  readonly disposition: RetentionDisposition;
  /** Always equal to disposition in this skeleton (no execution stage). */
  readonly action: RetentionDisposition;
  readonly cutoffField: string;
  readonly cutoff: string;
  readonly limit: number;
  readonly candidateCount: number;
  /** Bounded sample of ids for the log/plan; never used for a write. */
  readonly candidateIds: readonly string[];
  readonly archiveDestination: string | null;
  /** Structural guarantee: a plan can never authorize a delete. */
  readonly deleteEligible: false;
}

export interface RetentionPlan {
  readonly enabled: boolean;
  readonly dryRun: true;
  readonly generatedAt: string;
  readonly limit: number;
  readonly batches: readonly RetentionBatch[];
  readonly writes: 0;
  readonly deletions: 0;
  readonly providerCalls: 0;
}

export interface DataRetentionRunResult extends RetentionPlan {
  readonly executed: 0;
  readonly message: string;
}

export interface RunDataRetentionOptions extends RetentionPlanInput {
  readonly log?: (message: string) => void;
}

const MS_PER_DAY = 86_400_000;

export const DEFAULT_BATCH_LIMIT = 500;
export const MAX_BATCH_LIMIT = 5_000;

/** Private archive bucket/prefix documented in docs/DATA_RETENTION.md. */
export const ARCHIVE_ROOT = 'tigris://angisoft-retention/archive';

export const RETENTION_POLICIES: readonly RetentionPolicy[] = Object.freeze([
  {
    table: 'ProviderEvent',
    retentionClass: 'operational',
    cutoffField: 'createdAt',
    archiveAfterDays: 90,
    proposedDeleteAfterDays: 365,
    disposition: 'archive-plan',
    rationale: 'Raw webhook payloads/headers duplicate provider state; keep a hot replay window, then archive for dispute dedupe forensics.',
    archiveDestination: `${ARCHIVE_ROOT}/ProviderEvent/year=<year>/month=<month>/`,
  },
  {
    table: 'ConversationMessage',
    retentionClass: 'operational',
    cutoffField: 'createdAt',
    archiveAfterDays: 365,
    proposedDeleteAfterDays: 1095,
    disposition: 'archive-plan',
    rationale: 'Highest-write table (inbox/chat/social). Hot year for active threads; archive preserves business correspondence after the hot window.',
    archiveDestination: `${ARCHIVE_ROOT}/ConversationMessage/year=<year>/month=<month>/`,
  },
  {
    table: 'LedgerEntry',
    retentionClass: 'immutable-financial',
    cutoffField: 'occurredAt',
    archiveAfterDays: 730,
    proposedDeleteAfterDays: 2555,
    disposition: 'archive-plan',
    rationale: 'Append-only financial record; two years hot for reconciliation, then cold immutable archive for the statutory seven-year window.',
    archiveDestination: `${ARCHIVE_ROOT}/LedgerEntry/year=<year>/month=<month>/`,
  },
  {
    table: 'AuditLog',
    retentionClass: 'compliance-audit',
    cutoffField: 'createdAt',
    archiveAfterDays: 730,
    proposedDeleteAfterDays: 2555,
    disposition: 'archive-plan',
    rationale: 'Security/permission evidence must remain queryable and tamper-evident; archive cold rather than delete on a schedule.',
    archiveDestination: `${ARCHIVE_ROOT}/AuditLog/year=<year>/month=<month>/`,
  },
  {
    table: 'AgentRun',
    retentionClass: 'operational',
    cutoffField: 'startedAt',
    archiveAfterDays: 90,
    proposedDeleteAfterDays: 365,
    disposition: 'archive-plan',
    rationale: 'Reports/outputs are regenerable operational history; keep one quarter hot for coaching and boardroom context.',
    archiveDestination: `${ARCHIVE_ROOT}/AgentRun/year=<year>/month=<month>/`,
  },
  {
    table: 'ProviderConnection',
    retentionClass: 'configuration',
    cutoffField: 'updatedAt',
    archiveAfterDays: 365,
    proposedDeleteAfterDays: null,
    disposition: 'review-only',
    rationale: 'Connection metadata is referenced by secrets, accounts, and events; disconnect/deletion requires owner-reviewed FK handling.',
    archiveDestination: `${ARCHIVE_ROOT}/ProviderConnection/config-snapshots/`,
  },
  {
    table: 'ProviderSecret',
    retentionClass: 'secret-material',
    cutoffField: 'createdAt',
    archiveAfterDays: null,
    proposedDeleteAfterDays: null,
    disposition: 'retain-indefinitely',
    rationale: 'Encrypted envelopes are never archived or deleted by a retention sweep: rotate/revoke via the vault and tombstone only with owner approval.',
    archiveDestination: null,
  },
  {
    table: 'CommunicationAccount',
    retentionClass: 'configuration',
    cutoffField: 'updatedAt',
    archiveAfterDays: 365,
    proposedDeleteAfterDays: null,
    disposition: 'review-only',
    rationale: 'Mailbox/channel identity can outlive a connection; preserve grants/conversations and require an owner decision before removal.',
    archiveDestination: `${ARCHIVE_ROOT}/CommunicationAccount/config-snapshots/`,
  },
  {
    table: 'EmailDraft',
    retentionClass: 'operational',
    cutoffField: 'updatedAt',
    archiveAfterDays: 90,
    proposedDeleteAfterDays: 365,
    disposition: 'archive-plan',
    rationale: 'Unsent drafts hold potentially sensitive content; archive stale drafts with their thread context rather than dropping them automatically.',
    archiveDestination: `${ARCHIVE_ROOT}/EmailDraft/year=<year>/month=<month>/`,
  },
  {
    table: 'EmailSendAsIdentity',
    retentionClass: 'configuration',
    cutoffField: 'updatedAt',
    archiveAfterDays: 365,
    proposedDeleteAfterDays: null,
    disposition: 'review-only',
    rationale: 'Verified send-as grants are delegated-access evidence; archive a config snapshot, never auto-delete an identity.',
    archiveDestination: `${ARCHIVE_ROOT}/EmailSendAsIdentity/config-snapshots/`,
  },
]);

const POLICIES_BY_TABLE = new Map(RETENTION_POLICIES.map((policy) => [policy.table, policy]));

/** Returns the policy for a known table, or undefined for an unmapped table. */
export function classifyTable(table: string): RetentionPolicy | undefined {
  return POLICIES_BY_TABLE.get(table);
}

/** Strict opt-in: anything other than `true` (case-insensitive) disables planning. */
export function isDataRetentionEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return String(env.DATA_RETENTION_ENABLED ?? '').trim().toLowerCase() === 'true';
}

/** Invalid/oversized values fall back safely instead of expanding a sweep. */
export function resolveBatchLimit(value: unknown): number {
  if (value === undefined || value === null || value === '') return DEFAULT_BATCH_LIMIT;
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) return DEFAULT_BATCH_LIMIT;
  return Math.min(parsed, MAX_BATCH_LIMIT);
}

function toEpochMs(value: unknown): number | null {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
}

function normalizeInstant(value: unknown, label: string): string {
  const ms = toEpochMs(value);
  if (ms === null) throw new RangeError(`${label} must be a valid date`);
  return new Date(ms).toISOString();
}

/** Returns the ISO cutoff `retentionDays` before `referenceTime`. */
export function calculateCutoff(referenceTime: string | number | Date, retentionDays: number): string {
  if (!Number.isInteger(retentionDays) || retentionDays <= 0) {
    throw new RangeError('retentionDays must be a positive integer');
  }
  const referenceMs = toEpochMs(referenceTime);
  if (referenceMs === null) throw new RangeError('referenceTime must be a valid date');
  const cutoffMs = referenceMs - retentionDays * MS_PER_DAY;
  if (!Number.isFinite(cutoffMs)) throw new RangeError('cutoff is out of range');
  return new Date(cutoffMs).toISOString();
}

/**
 * Pure planner. Given already-fetched rows and optional explicit cutoffs,
 * returns bounded archive/review batches. No fetch, no client, no mutations.
 */
export function planDataRetention(input: RetentionPlanInput = {}): RetentionPlan {
  const env = input.env ?? process.env;
  const enabled = isDataRetentionEnabled(env);
  const limit = resolveBatchLimit(input.limit ?? env.DATA_RETENTION_BATCH_LIMIT);
  const generatedAt = normalizeInstant(input.now ?? Date.now(), 'now');

  if (!enabled) {
    return {
      enabled: false,
      dryRun: true,
      generatedAt,
      limit,
      batches: [],
      writes: 0,
      deletions: 0,
      providerCalls: 0,
    };
  }

  const batches: RetentionBatch[] = [];
  for (const [table, rows] of Object.entries(input.rowsByTable ?? {})) {
    const policy = classifyTable(table);
    if (!policy || policy.archiveAfterDays === null) continue;

    const override = input.cutoffs?.[table];
    const cutoff = override === undefined
      ? calculateCutoff(generatedAt, policy.archiveAfterDays)
      : normalizeInstant(override, `cutoffs.${table}`);
    const cutoffMs = Date.parse(cutoff);

    const candidates = rows
      .map((row) => ({ id: row.id, ms: toEpochMs(row[policy.cutoffField]) }))
      .filter((entry) => typeof entry.id === 'string' && entry.ms !== null && entry.ms <= cutoffMs)
      .sort((a, b) => (a.ms ?? 0) - (b.ms ?? 0) || String(a.id).localeCompare(String(b.id)));

    if (candidates.length === 0) continue;
    batches.push({
      table,
      retentionClass: policy.retentionClass,
      disposition: policy.disposition,
      action: policy.disposition,
      cutoffField: policy.cutoffField,
      cutoff,
      limit,
      candidateCount: candidates.length,
      candidateIds: candidates.slice(0, limit).map((entry) => String(entry.id)),
      archiveDestination: policy.archiveDestination,
      deleteEligible: false,
    });
  }
  batches.sort((a, b) => a.table.localeCompare(b.table));

  return {
    enabled: true,
    dryRun: true,
    generatedAt,
    limit,
    batches,
    writes: 0,
    deletions: 0,
    providerCalls: 0,
  };
}

/**
 * Env-gated worker entry point. With DATA_RETENTION_ENABLED unset/false it is a
 * no-op; with it set it still only logs the plan. There is no delete path here —
 * a future owner-approved implementation must be added as a separate change.
 */
export async function runDataRetention(options: RunDataRetentionOptions = {}): Promise<DataRetentionRunResult> {
  const plan = planDataRetention(options);
  const log = options.log ?? ((message: string) => console.info(message));

  if (!plan.enabled) {
    const message = '[data-retention] disabled (set DATA_RETENTION_ENABLED=true to plan); nothing read, archived, or deleted';
    log(message);
    return { ...plan, executed: 0, message };
  }

  for (const batch of plan.batches) {
    log(
      `[data-retention] planned ${batch.action}: ${batch.table} ` +
      `${batch.candidateIds.length}/${batch.candidateCount} ids (limit ${batch.limit}) with ` +
      `${batch.cutoffField} <= ${batch.cutoff} → ${batch.archiveDestination ?? 'retain (no archive)'}; ` +
      'no delete performed',
    );
  }
  const message = `[data-retention] dry-run complete: ${plan.batches.length} batch(es) planned, 0 executed, 0 deleted`;
  log(message);
  return { ...plan, executed: 0, message };
}
