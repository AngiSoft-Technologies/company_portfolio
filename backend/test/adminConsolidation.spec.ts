import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Admin-account consolidation spec. The Prisma 8 façade is mocked in the same
 * contract shape as auth.spec.ts (`prisma.orm.public.<Model>.where(...)`), so
 * neither mode can reach a real database. Dry-run is asserted to be zero-write;
 * apply mode asserts the exact FK reassignment and AuditLog calls.
 */

vi.mock('../src/prisma/db', () => ({
  db: {},
  default: {},
  ts: (value?: unknown) => new Date().toISOString(),
  newId: () => 'test-audit-id',
}));

vi.mock('../src/modules/identity/services/employeeEmail', () => ({
  normalizeEmail: (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : ''),
  findEmployeeByEmail: vi.fn(async () => null),
  ensureEmployeeEmail: vi.fn(async () => null),
}));

vi.mock('../src/db', () => {
  const calls: {
    employeeWhere: any[];
    updateAll: any[];
    create: any[];
    delete: any[];
    update: any[];
    transactions: number;
  } = {
    employeeWhere: [], updateAll: [], create: [], delete: [], update: [], transactions: 0,
  };

  const MODELS = [
    'Employee', 'AuditLog', 'EmployeeEmail', 'RefreshToken', 'TwoFactorBackupCode',
    'MfaMethod', 'MfaChallenge', 'WebAuthnCredential', 'EmployeeRoleAssignment',
    'EmployeePermission', 'Booking', 'ContactEnquiry', 'Conversation',
    'ProviderConnection', 'CommunicationAccount', 'FinanceAccount', 'CommunicationGrant',
  ];
  const rows: Record<string, any[]> = {};
  for (const name of MODELS) rows[name] = [];

  const seedEmployees = () => {
    rows.Employee!.push(
      { id: 'legacy-1', email: 'admin@angisoft.co.ke', role: 'ADMIN', isActive: true },
      { id: 'owner-1', email: 'sangera@angisoft.co.ke', role: 'SUPER_ADMIN', isActive: true },
    );
  };
  seedEmployees();

  const matches = (row: any, criteria: any) =>
    Object.entries(criteria ?? {}).every(([key, value]) => row[key] === value);

  const makeTable = (name: string) => ({
    where: vi.fn((criteria: any) => {
      if (name === 'Employee') calls.employeeWhere.push({ criteria });
      const store = rows[name]!;
      return {
        first: vi.fn(async () => store.find((row) => matches(row, criteria)) ?? null),
        all: vi.fn(async () => store.filter((row) => matches(row, criteria))),
        updateAll: vi.fn(async (data: any) => {
          calls.updateAll.push({ table: name, criteria, data });
          let count = 0;
          for (const row of store) {
            if (matches(row, criteria)) {
              Object.assign(row, data);
              count += 1;
            }
          }
          return count;
        }),
        update: vi.fn(async (data: any) => {
          calls.update.push({ table: name, criteria, data });
          const row = store.find((item) => matches(item, criteria));
          if (row) Object.assign(row, data);
          return row ?? null;
        }),
        delete: vi.fn(async () => {
          calls.delete.push({ table: name, criteria });
          const index = store.findIndex((row) => matches(row, criteria));
          return index < 0 ? null : store.splice(index, 1)[0];
        }),
      };
    }),
    create: vi.fn(async (data: any) => {
      calls.create.push({ table: name, data });
      const row = { id: data?.id ?? `mock-${name}-${calls.create.length}`, ...data };
      rows[name]!.push(row);
      return row;
    }),
  });

  const publics: Record<string, any> = {};
  for (const name of MODELS) publics[name] = makeTable(name);

  const prisma: any = {
    orm: { public: publics },
    transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => {
      calls.transactions += 1;
      return fn(prisma);
    }),
    __calls: calls,
    __reset: () => {
      calls.employeeWhere.length = 0;
      calls.updateAll.length = 0;
      calls.create.length = 0;
      calls.delete.length = 0;
      calls.update.length = 0;
      calls.transactions = 0;
      for (const name of MODELS) rows[name]!.length = 0;
      seedEmployees();
    },
  };
  return { default: prisma, db: prisma };
});

import prisma from '../src/db';
import { ensureEmployeeEmail } from '../src/modules/identity/services/employeeEmail';
import {
  REASSIGNMENTS,
  consolidateAdminAccounts,
  parseConsolidationOptions,
} from '../scripts/consolidate-admin-account';

const mocked = prisma as any;
const expectedPlan = REASSIGNMENTS.map(([table, column]) => ({ table, column }));

beforeEach(() => {
  mocked.__reset();
  (ensureEmployeeEmail as any).mockClear();
  (ensureEmployeeEmail as any).mockResolvedValue(null);
});

describe('admin account consolidation', () => {
  it('defaults to a safe dry-run and supports configurable source/target', () => {
    expect(parseConsolidationOptions([], {})).toEqual({
      sourceEmail: 'admin@angisoft.co.ke',
      targetEmail: 'sangera@angisoft.co.ke',
      dryRun: true,
    });
    expect(parseConsolidationOptions(
      ['--source=OLD@Example.com', '--target', 'new@example.com', '--apply'],
      {},
    )).toEqual({
      sourceEmail: 'old@example.com',
      targetEmail: 'new@example.com',
      dryRun: false,
    });
    expect(() => parseConsolidationOptions(['--bogus'], {})).toThrow(/Unknown argument/);
  });

  it('dry-run reads accounts and returns the plan with zero writes', async () => {
    const result = await consolidateAdminAccounts(prisma, {
      sourceEmail: ' ADMIN@Angisoft.co.ke ',
      targetEmail: 'sangera@angisoft.co.ke',
      dryRun: true,
    });

    expect(result).toEqual({
      status: 'dry-run',
      sourceEmail: 'admin@angisoft.co.ke',
      targetEmail: 'sangera@angisoft.co.ke',
      sourceId: 'legacy-1',
      targetId: 'owner-1',
      reassignments: expectedPlan,
    });
    // Reads are allowed; every write path must stay untouched.
    expect(mocked.__calls.employeeWhere.map((c: any) => c.criteria)).toEqual([
      { email: 'admin@angisoft.co.ke' },
      { email: 'sangera@angisoft.co.ke' },
    ]);
    expect(mocked.__calls.updateAll).toHaveLength(0);
    expect(mocked.__calls.create).toHaveLength(0);
    expect(mocked.__calls.delete).toHaveLength(0);
    expect(mocked.__calls.update).toHaveLength(0);
    expect(mocked.__calls.transactions).toBe(0);
    expect(ensureEmployeeEmail).not.toHaveBeenCalled();
  });

  it('non-dry-run reassigns every FK, writes the source→target AuditLog and retires the source', async () => {
    const result = await consolidateAdminAccounts(prisma, {
      sourceEmail: 'admin@angisoft.co.ke',
      targetEmail: 'sangera@angisoft.co.ke',
      dryRun: false,
    });

    expect(result.status).toBe('applied');
    expect(result.auditLogId).toBe('test-audit-id');
    expect(mocked.__calls.transactions).toBe(1);

    expect(mocked.__calls.updateAll).toHaveLength(REASSIGNMENTS.length);
    const actualKeys = mocked.__calls.updateAll
      .map((call: any) => `${call.table}.${Object.keys(call.criteria)[0]}`)
      .sort();
    expect(actualKeys).toEqual(REASSIGNMENTS.map(([table, column]) => `${table}.${column}`).sort());
    for (const call of mocked.__calls.updateAll) {
      const column = Object.keys(call.criteria)[0];
      expect(call.criteria).toEqual({ [column]: 'legacy-1' });
      expect(call.data).toEqual({ [column]: 'owner-1' });
    }

    const audit = mocked.__calls.create.find((call: any) => call.table === 'AuditLog');
    expect(audit).toBeDefined();
    expect(audit.data).toEqual(expect.objectContaining({
      id: 'test-audit-id',
      actorId: 'owner-1',
      actorRole: 'SUPER_ADMIN',
      action: 'admin.consolidate_account',
      entity: 'Employee',
      entityId: 'owner-1',
    }));
    expect(audit.data.meta).toEqual({
      source: { id: 'legacy-1', email: 'admin@angisoft.co.ke' },
      target: { id: 'owner-1', email: 'sangera@angisoft.co.ke' },
      reassignments: expectedPlan,
    });

    expect(ensureEmployeeEmail).toHaveBeenCalledWith(
      prisma,
      'owner-1',
      'admin@angisoft.co.ke',
      expect.objectContaining({ isPrimary: false, verified: true, source: 'admin-consolidation' }),
    );
    expect(mocked.__calls.delete).toEqual([{ table: 'Employee', criteria: { id: 'legacy-1' } }]);
  });

  it('skips all writes when source and target resolve to the same employee', async () => {
    const result = await consolidateAdminAccounts(prisma, {
      sourceEmail: 'admin@angisoft.co.ke',
      targetEmail: 'admin@angisoft.co.ke',
      dryRun: false,
    });

    expect(result.status).toBe('noop');
    expect(mocked.__calls.updateAll).toHaveLength(0);
    expect(mocked.__calls.create).toHaveLength(0);
    expect(mocked.__calls.delete).toHaveLength(0);
    expect(mocked.__calls.update).toHaveLength(0);
    expect(mocked.__calls.transactions).toBe(0);
    expect(ensureEmployeeEmail).not.toHaveBeenCalled();
  });
});
