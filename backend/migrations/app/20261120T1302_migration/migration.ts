#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/d3b8214c3ef7ba850359d4d7d021d895f36d624b28752152ad544536740ffd53/contract';
import startContract from '../../snapshots/d3b8214c3ef7ba850359d4d7d021d895f36d624b28752152ad544536740ffd53/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f9b20b4f73c563e1f5fd7497c321f77ab427441598ab453b5ea150e7578ce623/contract';
import endContract from '../../snapshots/f9b20b4f73c563e1f5fd7497c321f77ab427441598ab453b5ea150e7578ce623/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'AttendanceRecord',
        columns: [
          col('checkInAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('checkOutAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('employeeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('source', 'text', {
            notNull: true,
            default: lit('manual'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('present'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('workDate', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'AttendanceRecord_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Payslip',
        columns: [
          col('approvedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('approvedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
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
          col('grossAmount', 'numeric(18,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('netAmount', 'numeric(18,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paidAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
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
        constraints: [primaryKey(['id'], { name: 'Payslip_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AttendanceRecord',
        index: 'AttendanceRecord_employeeId_workDate_idx',
        columns: ['employeeId', 'workDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AttendanceRecord',
        index: 'AttendanceRecord_workDate_idx',
        columns: ['workDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Payslip',
        index: 'Payslip_employeeId_period_key',
        columns: ['employeeId', 'period'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Payslip',
        index: 'Payslip_period_idx',
        columns: ['period'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Payslip',
        index: 'Payslip_status_idx',
        columns: ['status'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
