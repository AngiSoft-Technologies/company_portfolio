#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3f2ce8297d3da6b4f0fd38e6b47cc6ee7103d7e166938ec20718b66d8531664f/contract';
import endContract from '../../snapshots/3f2ce8297d3da6b4f0fd38e6b47cc6ee7103d7e166938ec20718b66d8531664f/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d880149c8c8683662029c1eac032503f8bdc4b932752e05c8566555ca749ebe8/contract';
import startContract from '../../snapshots/d880149c8c8683662029c1eac032503f8bdc4b932752e05c8566555ca749ebe8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'PayrollRun',
        columns: [
          col('completedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('currency', 'text', {
            notNull: true,
            default: lit('KES'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('deductionTotal', 'numeric(18,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
          col('grossTotal', 'numeric(18,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('netTotal', 'numeric(18,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('payslipCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('period', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('draft'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'PayrollRun_pkey' })],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Payslip',
        column: col('payrollRunId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'PayrollRun',
        index: 'PayrollRun_period_key',
        columns: ['period'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'PayrollRun',
        index: 'PayrollRun_status_idx',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Payslip',
        index: 'Payslip_payrollRunId_idx',
        columns: ['payrollRunId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
