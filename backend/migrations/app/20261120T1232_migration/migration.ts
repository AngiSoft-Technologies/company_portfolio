#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/5ec096541d681a8ecef48f52f1d03f04b267deba57b8d6512cf51f137202e870/contract';
import startContract from '../../snapshots/5ec096541d681a8ecef48f52f1d03f04b267deba57b8d6512cf51f137202e870/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/bcc919f2add4bc6eb2058f9ed6c47e6b927545cf9a2b5cf0fa4fd1d50900bd92/contract';
import endContract from '../../snapshots/bcc919f2add4bc6eb2058f9ed6c47e6b927545cf9a2b5cf0fa4fd1d50900bd92/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'PricingPackage',
        columns: [
          col('billingPeriod', 'text', { codecRef: { codecId: 'pg/text@1' } }),
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
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('features', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('highlighted', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('price', 'numeric(18,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
          col('published', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('serviceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
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
        constraints: [primaryKey(['id'], { name: 'PricingPackage_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PricingPackage',
        index: 'PricingPackage_published_sortOrder_idx',
        columns: ['published', 'sortOrder'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PricingPackage',
        index: 'PricingPackage_serviceId_idx',
        columns: ['serviceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PricingPackage',
        index: 'PricingPackage_slug_key',
        columns: ['slug'],
        extras: { unique: true },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PricingPackage',
        foreignKey: {
          name: 'PricingPackage_serviceId_fkey',
          columns: ['serviceId'],
          references: { schema: 'public', table: 'Service', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
