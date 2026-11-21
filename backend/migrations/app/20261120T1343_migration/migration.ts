#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/3f2ce8297d3da6b4f0fd38e6b47cc6ee7103d7e166938ec20718b66d8531664f/contract';
import startContract from '../../snapshots/3f2ce8297d3da6b4f0fd38e6b47cc6ee7103d7e166938ec20718b66d8531664f/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ff5d246ca37223c1ed6654c4183d2a2c71eaae903da64f78b944e73c3f21b1fe/contract';
import endContract from '../../snapshots/ff5d246ca37223c1ed6654c4183d2a2c71eaae903da64f78b944e73c3f21b1fe/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Holiday',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('date', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isHalfDay', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Holiday_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'WorkSchedule',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('employeeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('endTime', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isWorkingDay', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('startTime', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('weekday', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'WorkSchedule_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Holiday',
        index: 'Holiday_date_key',
        columns: ['date'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'WorkSchedule',
        index: 'WorkSchedule_employeeId_weekday_key',
        columns: ['employeeId', 'weekday'],
        extras: { unique: true },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
