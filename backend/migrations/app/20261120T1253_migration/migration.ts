#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/bcc919f2add4bc6eb2058f9ed6c47e6b927545cf9a2b5cf0fa4fd1d50900bd92/contract';
import startContract from '../../snapshots/bcc919f2add4bc6eb2058f9ed6c47e6b927545cf9a2b5cf0fa4fd1d50900bd92/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d3b8214c3ef7ba850359d4d7d021d895f36d624b28752152ad544536740ffd53/contract';
import endContract from '../../snapshots/d3b8214c3ef7ba850359d4d7d021d895f36d624b28752152ad544536740ffd53/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Office',
        columns: [
          col('addressLine', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('city', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('country', 'text', {
            notNull: true,
            default: lit('Kenya'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('hours', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isHeadquarters', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('mapUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('published', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Office_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Office',
        index: 'Office_published_sortOrder_idx',
        columns: ['published', 'sortOrder'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Office',
        index: 'Office_slug_key',
        columns: ['slug'],
        extras: { unique: true },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
