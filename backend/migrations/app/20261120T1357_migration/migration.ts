#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/994993e8a7869e9768a2f1fc937fb7ec382aa43f11ec833a55bf3ab9d9130e78/contract';
import endContract from '../../snapshots/994993e8a7869e9768a2f1fc937fb7ec382aa43f11ec833a55bf3ab9d9130e78/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ff5d246ca37223c1ed6654c4183d2a2c71eaae903da64f78b944e73c3f21b1fe/contract';
import startContract from '../../snapshots/ff5d246ca37223c1ed6654c4183d2a2c71eaae903da64f78b944e73c3f21b1fe/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'SalaryStructure',
        columns: [
          col('allowances', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('basicSalary', 'numeric(18,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('currency', 'text', {
            notNull: true,
            default: lit('KES'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('deductions', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('employeeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'SalaryStructure_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SalaryStructure',
        index: 'SalaryStructure_employeeId_key',
        columns: ['employeeId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'SalaryStructure',
        index: 'SalaryStructure_isActive_idx',
        columns: ['isActive'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
