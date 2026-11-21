#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/d880149c8c8683662029c1eac032503f8bdc4b932752e05c8566555ca749ebe8/contract';
import endContract from '../../snapshots/d880149c8c8683662029c1eac032503f8bdc4b932752e05c8566555ca749ebe8/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f9b20b4f73c563e1f5fd7497c321f77ab427441598ab453b5ea150e7578ce623/contract';
import startContract from '../../snapshots/f9b20b4f73c563e1f5fd7497c321f77ab427441598ab453b5ea150e7578ce623/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'ApprovalRequest',
        columns: [
          col('amount', 'numeric(18,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('currency', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('decidedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('entityId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('entityType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('requestedById', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('steps', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'ApprovalRequest_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApprovalRequest',
        index: 'ApprovalRequest_entity_idx',
        columns: ['entityType', 'entityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApprovalRequest',
        index: 'ApprovalRequest_requestedById_idx',
        columns: ['requestedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApprovalRequest',
        index: 'ApprovalRequest_status_idx',
        columns: ['status'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
