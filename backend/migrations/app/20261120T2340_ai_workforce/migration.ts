#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/994993e8a7869e9768a2f1fc937fb7ec382aa43f11ec833a55bf3ab9d9130e78/contract';
import startContract from '../../snapshots/994993e8a7869e9768a2f1fc937fb7ec382aa43f11ec833a55bf3ab9d9130e78/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/9baa864354cce1f12ce419a5522ba7086a46b3f0ae05e61f9b5a87701d93d9d9/contract';
import endContract from '../../snapshots/9baa864354cce1f12ce419a5522ba7086a46b3f0ae05e61f9b5a87701d93d9d9/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Agent',
        columns: [
          col('config', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('department', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastRunAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nextRunAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('scheduleMinutes', 'int4', {
            notNull: true,
            default: lit(1440),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('active'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Agent_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'AgentRun',
        columns: [
          col('agentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('agentKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('error', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('finishedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('output', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('startedAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('running'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('summary', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('trigger', 'text', {
            notNull: true,
            default: lit('schedule'),
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'AgentRun_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Agent',
        index: 'Agent_key_key',
        columns: ['key'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Agent',
        index: 'Agent_status_nextRunAt_idx',
        columns: ['status', 'nextRunAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AgentRun',
        index: 'AgentRun_agentId_startedAt_idx',
        columns: ['agentId', 'startedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AgentRun',
        index: 'AgentRun_agentKey_startedAt_idx',
        columns: ['agentKey', 'startedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AgentRun',
        index: 'AgentRun_status_idx',
        columns: ['status'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
