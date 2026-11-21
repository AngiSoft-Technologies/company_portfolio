#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/20c1428e2ac85f00dfe77d91a0391e773e556b1a649dec7d552a7b9933d6513e/contract';
import startContract from '../../snapshots/20c1428e2ac85f00dfe77d91a0391e773e556b1a649dec7d552a7b9933d6513e/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/5ec096541d681a8ecef48f52f1d03f04b267deba57b8d6512cf51f137202e870/contract';
import endContract from '../../snapshots/5ec096541d681a8ecef48f52f1d03f04b267deba57b8d6512cf51f137202e870/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'EmployeePortfolioConfig',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('draftConfig', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('employeeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('layout', 'text', {
            notNull: true,
            default: lit('standard'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('published', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('publishedConfig', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('sections', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('theme', 'text', {
            notNull: true,
            default: lit('default'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('version', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('versionHistory', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'EmployeePortfolioConfig_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Expense',
        columns: [
          col('amount', 'numeric(18,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
          col('category', 'text', { codecRef: { codecId: 'pg/text@1' } }),
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
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('receiptFileId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reviewNote', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reviewedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('reviewedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('draft'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('submittedById', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Expense_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'LeaveRequest',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('employeeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('endDate', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reviewNote', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reviewedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('reviewedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('startDate', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('type', 'text', {
            notNull: true,
            default: lit('annual'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'LeaveRequest_pkey' })],
      }),
      this.addColumn({
        schema: 'public',
        table: 'SupportTicket',
        column: col('slaBreachedAt', 'timestamp(3)', {
          codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'EmployeePortfolioConfig',
        constraint: 'EmployeePortfolioConfig_employeeId_key',
        columns: ['employeeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Expense',
        index: 'Expense_reviewedById_idx_e2835478',
        columns: ['reviewedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Expense',
        index: 'Expense_status_idx',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Expense',
        index: 'Expense_submittedById_idx',
        columns: ['submittedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LeaveRequest',
        index: 'LeaveRequest_employeeId_idx',
        columns: ['employeeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LeaveRequest',
        index: 'LeaveRequest_reviewedById_idx_e2835478',
        columns: ['reviewedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LeaveRequest',
        index: 'LeaveRequest_status_idx',
        columns: ['status'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'EmployeePortfolioConfig',
        foreignKey: {
          name: 'EmployeePortfolioConfig_employeeId_fkey',
          columns: ['employeeId'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Expense',
        foreignKey: {
          name: 'Expense_submittedById_fkey',
          columns: ['submittedById'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Expense',
        foreignKey: {
          name: 'Expense_reviewedById_fkey',
          columns: ['reviewedById'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LeaveRequest',
        foreignKey: {
          name: 'LeaveRequest_employeeId_fkey',
          columns: ['employeeId'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LeaveRequest',
        foreignKey: {
          name: 'LeaveRequest_reviewedById_fkey',
          columns: ['reviewedById'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
