import dotenv from 'dotenv';
dotenv.config();
import prisma, { type Db } from '../src/db';
import { newId } from '../src/prisma/db';
import { ensureEmployeeEmail, normalizeEmail } from '../src/modules/identity/services/employeeEmail';

/**
 * Explicit allowlist of `Employee.id` foreign keys that must move from the
 * legacy admin shell to the owner account.
 *
 * The previous version tried to discover these columns through
 * information_schema, but its result decoder used a placeholder column codec
 * that never executed; the transaction that followed was a no-op. Keeping the
 * list here makes the plan deterministic, reviewable and testable — no dynamic
 * SQL discovery and no placeholder types that silently do nothing.
 */
export const REASSIGNMENTS: ReadonlyArray<readonly [table: string, column: string]> = [
  ['RefreshToken', 'employeeId'],
  ['TwoFactorBackupCode', 'employeeId'],
  ['MfaMethod', 'employeeId'],
  ['MfaChallenge', 'employeeId'],
  ['WebAuthnCredential', 'employeeId'],
  ['EmployeeRoleAssignment', 'employeeId'],
  ['EmployeePermission', 'employeeId'],
  ['EmployeeEmail', 'employeeId'],
  ['AuditLog', 'actorId'],
  ['Booking', 'assignedToId'],
  ['Booking', 'staffId'],
  ['ContactEnquiry', 'assigneeId'],
  ['Conversation', 'assigneeId'],
  ['ProviderConnection', 'createdById'],
  ['CommunicationAccount', 'createdById'],
  ['FinanceAccount', 'createdById'],
  ['CommunicationGrant', 'employeeId'],
];

const DEFAULT_SOURCE_EMAIL = 'admin@angisoft.co.ke';
const DEFAULT_TARGET_EMAIL = 'sangera@angisoft.co.ke';

export interface ConsolidationOptions {
  sourceEmail: string;
  targetEmail: string;
  /** Dry-run is the default; only an explicit `--apply` / `DRY_RUN=false` writes. */
  dryRun: boolean;
}

export interface ConsolidationResult {
  status: 'noop' | 'dry-run' | 'applied';
  sourceEmail: string;
  targetEmail: string;
  sourceId?: string;
  targetId?: string;
  reassignments: ReadonlyArray<{ table: string; column: string }>;
  auditLogId?: string;
}

/** Parse operator overrides without ever embedding credentials in the script. */
export function parseConsolidationOptions(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env,
): ConsolidationOptions {
  let sourceEmail = env.LEGACY_ADMIN_EMAIL || DEFAULT_SOURCE_EMAIL;
  let targetEmail = env.OWNER_ADMIN_EMAIL || DEFAULT_TARGET_EMAIL;
  let dryRun = env.DRY_RUN !== 'false';

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const [flag, inlineValue] = arg.split('=', 2);
    const nextValue = () => {
      const value = inlineValue ?? argv[++i];
      if (!value || value.startsWith('--')) throw new Error(`${flag} requires an email address`);
      return value;
    };
    switch (flag) {
      case '--legacy':
      case '--source':
        sourceEmail = nextValue();
        break;
      case '--owner':
      case '--target':
        targetEmail = nextValue();
        break;
      case '--dry-run':
        dryRun = inlineValue !== 'false';
        break;
      case '--apply':
        dryRun = false;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  sourceEmail = normalizeEmail(sourceEmail);
  targetEmail = normalizeEmail(targetEmail);
  if (!sourceEmail || !targetEmail) {
    throw new Error('Source and target emails are required');
  }
  return { sourceEmail, targetEmail, dryRun };
}

/**
 * Consolidate one admin account into another. All reads happen in both modes;
 * dry-run is strictly zero-write. Non-dry-run performs every FK reassignment,
 * the AuditLog row and the source retirement inside one transaction.
 */
export async function consolidateAdminAccounts(
  db: Db,
  options: ConsolidationOptions,
): Promise<ConsolidationResult> {
  const sourceEmail = normalizeEmail(options.sourceEmail);
  const targetEmail = normalizeEmail(options.targetEmail);
  if (!sourceEmail || !targetEmail) {
    throw new Error('Source and target emails are required');
  }

  const [source, target] = await Promise.all([
    db.orm.public.Employee.where({ email: sourceEmail } as any).first(),
    db.orm.public.Employee.where({ email: targetEmail } as any).first(),
  ]);

  if (!source || !target || source.id === target.id) {
    console.log('No consolidation needed: source/target missing or identical.');
    return { status: 'noop', sourceEmail, targetEmail, reassignments: [] };
  }

  const plan = REASSIGNMENTS.map(([table, column]) => ({ table, column }));
  const result: ConsolidationResult = {
    status: options.dryRun ? 'dry-run' : 'applied',
    sourceEmail,
    targetEmail,
    sourceId: source.id,
    targetId: target.id,
    reassignments: plan,
  };

  if (options.dryRun) {
    console.log(
      `[dry-run] Would reassign ${plan.length} FK columns from ${sourceEmail} (${source.id}) ` +
        `to ${targetEmail} (${target.id}). No writes performed.`,
    );
    return result;
  }

  // Give the target a searchable alias for the retired address before the
  // source row disappears. This helper is a no-op when the alias already exists.
  await ensureEmployeeEmail(db, target.id, sourceEmail, {
    isPrimary: false,
    verified: true,
    source: 'admin-consolidation',
  });

  const auditLogId = newId();
  await db.transaction(async (tx) => {
    const tables = tx.orm.public as unknown as Record<string, any>;
    for (const { table, column } of plan) {
      await tables[table].where({ [column]: source.id }).updateAll({ [column]: target.id });
    }

    await tables.AuditLog.create({
      id: auditLogId,
      actorId: target.id,
      actorRole: (target.role as any) ?? null,
      action: 'admin.consolidate_account',
      entity: 'Employee',
      entityId: target.id,
      meta: {
        source: { id: source.id, email: sourceEmail },
        target: { id: target.id, email: targetEmail },
        reassignments: plan,
      } as any,
    });

    try {
      await tables.Employee.where({ id: source.id }).delete();
    } catch {
      // A residual FK outside the allowlist must not abort an otherwise
      // complete reassignment; retire the row instead of deleting it.
      await tables.Employee.where({ id: source.id }).update({
        isActive: false,
        role: 'STAFF',
        email: `legacy+${source.id}@invalid.local`,
      } as any);
    }
  });

  console.log(
    `Applied admin consolidation: ${sourceEmail} -> ${targetEmail} ` +
      `(${plan.length} FK columns, AuditLog ${auditLogId}).`,
  );
  return { ...result, auditLogId };
}

export async function runCli(): Promise<void> {
  const options = parseConsolidationOptions();
  console.log(
    `Admin consolidation ${options.sourceEmail} -> ${options.targetEmail} ` +
      `(${options.dryRun ? 'dry-run' : 'APPLY'})`,
  );
  await consolidateAdminAccounts(prisma, options);
}

if (typeof require !== 'undefined' && require.main === module && process.env.VITEST !== 'true') {
  runCli()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        await (prisma as any).close?.();
      } catch {
        // ignore shutdown errors
      }
    });
}
