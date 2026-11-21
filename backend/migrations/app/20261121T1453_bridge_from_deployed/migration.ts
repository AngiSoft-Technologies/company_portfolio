#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/01393c828ad0b87d8aedea9902e046bd866f0fe148cf29c8a8fcd77716757ef0/contract';
import startContract from '../../snapshots/01393c828ad0b87d8aedea9902e046bd866f0fe148cf29c8a8fcd77716757ef0/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/36dd9cede4359df6de2bed6fe0aeface2406bf144e19a050bd9aee5d3e36cfef/contract';
import endContract from '../../snapshots/36dd9cede4359df6de2bed6fe0aeface2406bf144e19a050bd9aee5d3e36cfef/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'MfaChallenge',
        columns: [
          col('attempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('challenge', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('codeHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('consumedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('destination', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('employeeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('expiresAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('method', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'MfaChallenge_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'MfaMethod',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('credentialId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('destination', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('employeeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('enabled', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('label', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('lastUsedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'MfaMethod_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'WebAuthnCredential',
        columns: [
          col('backedUp', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('counter', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('credentialId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('deviceType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('employeeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('publicKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('transports', 'text[]', {
            notNull: true,
            default: lit([]),
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'WebAuthnCredential_pkey' })],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Employee',
        column: col('mfaRequired', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'RefreshToken',
        column: col('remember', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'MfaChallenge',
        index: 'MfaChallenge_employeeId_method_idx',
        columns: ['employeeId', 'method'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MfaMethod',
        index: 'MfaMethod_credentialId_key',
        columns: ['credentialId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'MfaMethod',
        index: 'MfaMethod_employeeId_type_idx',
        columns: ['employeeId', 'type'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WebAuthnCredential',
        index: 'WebAuthnCredential_credentialId_key',
        columns: ['credentialId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'WebAuthnCredential',
        index: 'WebAuthnCredential_employeeId_idx',
        columns: ['employeeId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MfaChallenge',
        foreignKey: {
          name: 'MfaChallenge_employeeId_fkey',
          columns: ['employeeId'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MfaMethod',
        foreignKey: {
          name: 'MfaMethod_employeeId_fkey',
          columns: ['employeeId'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WebAuthnCredential',
        foreignKey: {
          name: 'WebAuthnCredential_employeeId_fkey',
          columns: ['employeeId'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
