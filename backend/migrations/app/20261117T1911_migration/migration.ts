#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/2fc70153d54a2554fe5dd3dc06f7377d373b7634a53eeaefbcba29ccbefd06c6/contract';
import startContract from '../../snapshots/2fc70153d54a2554fe5dd3dc06f7377d373b7634a53eeaefbcba29ccbefd06c6/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/4c54679f25cc25f326c6078dff33b07565556919b09a52a8dca25a2410f67f8a/contract';
import endContract from '../../snapshots/4c54679f25cc25f326c6078dff33b07565556919b09a52a8dca25a2410f67f8a/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  placeholder,
  primaryKey,
} from '@prisma/orm-postgres/migration';
import postgres from '@prisma/orm-postgres/runtime';

const { sql: db, contract } = postgres<End>({ contractJson: endContract });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Invoice',
        columns: [
          col('amountPaid', 'numeric(18,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
          col('balanceDue', 'numeric(18,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
          col('bookingId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('clientId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('clientProjectId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
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
          col('dueAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('issuedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('number', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('paidAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('publicReference', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('quoteId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('draft'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('subtotal', 'numeric(18,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
          col('tax', 'numeric(18,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
          col('total', 'numeric(18,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Invoice_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'InvoiceLineItem',
        columns: [
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('invoiceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lineTotal', 'numeric(18,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
          col('quantity', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('unitPrice', 'numeric(18,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'InvoiceLineItem_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Opportunity',
        columns: [
          col('assignedToId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('bookingId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('clientId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
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
          col('expectedCloseDate', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('leadId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('lostReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('probability', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('publicReference', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('source', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('stage', 'text', {
            notNull: true,
            default: lit('new'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('value', 'numeric(18,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Opportunity_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Quote',
        columns: [
          col('acceptedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('bookingId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('clientId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
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
          col('discount', 'numeric(18,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('issuedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('number', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('opportunityId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('publicReference', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('draft'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('subtotal', 'numeric(18,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
          col('tax', 'numeric(18,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
          col('total', 'numeric(18,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('validUntil', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Quote_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'QuoteLineItem',
        columns: [
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lineTotal', 'numeric(18,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
          col('productId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('quoteId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('serviceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('unitPrice', 'numeric(18,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'QuoteLineItem_pkey' })],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Lead',
        column: col('currency', 'text', {
          notNull: true,
          default: lit('KES'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Lead',
        column: col('lostReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Lead',
        column: col('qualificationNotes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Lead',
        column: col('stage', 'text', {
          notNull: true,
          default: lit('new'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Lead',
        column: col('value', 'numeric(18,2)', {
          codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 2 } },
        }),
      }),
      this.dataTransform(contract, 'typechange-Booking-budgetAmount', {
        check: () => db.public.Booking.select('id').where((f, fns) => fns.eq(f.id, '__p8_noop__')).limit(1),
        run: () => db.public.Booking.update({ budgetAmount: '0.00' }).where((f, fns) => fns.eq(f.id, '__p8_noop__')),
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'Booking',
        column: 'budgetAmount',
        options: {
          qualifiedTargetType: 'numeric(18,2)',
          formatTypeExpected: 'numeric(18,2)',
          rawTargetTypeForLabel: 'numeric(18,2)',
          using: 'round("budgetAmount"::numeric,2)',
        },
      }),
      this.dataTransform(contract, 'handle-nulls-Booking-budgetAmount', {
        check: () => db.public.Booking.select('id').where((f, fns) => fns.eq(f.budgetAmount, null)).limit(1),
        run: () => db.public.Booking.update({ budgetAmount: '0.00' }).where((f, fns) => fns.eq(f.budgetAmount, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'Booking', column: 'budgetAmount' }),
      this.dataTransform(contract, 'typechange-Booking-priceEstimate', {
        check: () => db.public.Booking.select('id').where((f, fns) => fns.eq(f.id, '__p8_noop__')).limit(1),
        run: () => db.public.Booking.update({ priceEstimate: '0.00' }).where((f, fns) => fns.eq(f.id, '__p8_noop__')),
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'Booking',
        column: 'priceEstimate',
        options: {
          qualifiedTargetType: 'numeric(18,2)',
          formatTypeExpected: 'numeric(18,2)',
          rawTargetTypeForLabel: 'numeric(18,2)',
          using: 'round("priceEstimate"::numeric,2)',
        },
      }),
      this.dataTransform(contract, 'handle-nulls-Booking-priceEstimate', {
        check: () => db.public.Booking.select('id').where((f, fns) => fns.eq(f.priceEstimate, null)).limit(1),
        run: () => db.public.Booking.update({ priceEstimate: '0.00' }).where((f, fns) => fns.eq(f.priceEstimate, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'Booking', column: 'priceEstimate' }),
      this.dataTransform(contract, 'typechange-Booking-quotedAmount', {
        check: () => db.public.Booking.select('id').where((f, fns) => fns.eq(f.id, '__p8_noop__')).limit(1),
        run: () => db.public.Booking.update({ quotedAmount: '0.00' }).where((f, fns) => fns.eq(f.id, '__p8_noop__')),
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'Booking',
        column: 'quotedAmount',
        options: {
          qualifiedTargetType: 'numeric(18,2)',
          formatTypeExpected: 'numeric(18,2)',
          rawTargetTypeForLabel: 'numeric(18,2)',
          using: 'round("quotedAmount"::numeric,2)',
        },
      }),
      this.dataTransform(contract, 'handle-nulls-Booking-quotedAmount', {
        check: () => db.public.Booking.select('id').where((f, fns) => fns.eq(f.quotedAmount, null)).limit(1),
        run: () => db.public.Booking.update({ quotedAmount: '0.00' }).where((f, fns) => fns.eq(f.quotedAmount, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'Booking', column: 'quotedAmount' }),
      this.dataTransform(contract, 'typechange-Payment-amount', {
        check: () => db.public.Payment.select('id').where((f, fns) => fns.eq(f.id, '__p8_noop__')).limit(1),
        run: () => db.public.Payment.update({ amount: '0.00' }).where((f, fns) => fns.eq(f.id, '__p8_noop__')),
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'Payment',
        column: 'amount',
        options: {
          qualifiedTargetType: 'numeric(18,2)',
          formatTypeExpected: 'numeric(18,2)',
          rawTargetTypeForLabel: 'numeric(18,2)',
          using: 'round("amount"::numeric,2)',
        },
      }),
      this.dataTransform(contract, 'typechange-PaymentWallet-balance', {
        check: () => db.public.PaymentWallet.select('id').where((f, fns) => fns.eq(f.id, '__p8_noop__')).limit(1),
        run: () => db.public.PaymentWallet.update({ balance: '0.00' }).where((f, fns) => fns.eq(f.id, '__p8_noop__')),
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'PaymentWallet',
        column: 'balance',
        options: {
          qualifiedTargetType: 'numeric(18,2)',
          formatTypeExpected: 'numeric(18,2)',
          rawTargetTypeForLabel: 'numeric(18,2)',
          using: 'round("balance"::numeric,2)',
        },
      }),
      this.dataTransform(contract, 'typechange-Payout-amount', {
        check: () => db.public.Payout.select('id').where((f, fns) => fns.eq(f.id, '__p8_noop__')).limit(1),
        run: () => db.public.Payout.update({ amount: '0.00' }).where((f, fns) => fns.eq(f.id, '__p8_noop__')),
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'Payout',
        column: 'amount',
        options: {
          qualifiedTargetType: 'numeric(18,2)',
          formatTypeExpected: 'numeric(18,2)',
          rawTargetTypeForLabel: 'numeric(18,2)',
          using: 'round("amount"::numeric,2)',
        },
      }),
      this.dataTransform(contract, 'typechange-Service-priceFrom', {
        check: () => db.public.Service.select('id').where((f, fns) => fns.eq(f.id, '__p8_noop__')).limit(1),
        run: () => db.public.Service.update({ priceFrom: '0.00' }).where((f, fns) => fns.eq(f.id, '__p8_noop__')),
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'Service',
        column: 'priceFrom',
        options: {
          qualifiedTargetType: 'numeric(18,2)',
          formatTypeExpected: 'numeric(18,2)',
          rawTargetTypeForLabel: 'numeric(18,2)',
          using: 'round("priceFrom"::numeric,2)',
        },
      }),
      this.dataTransform(contract, 'handle-nulls-Service-priceFrom', {
        check: () => db.public.Service.select('id').where((f, fns) => fns.eq(f.priceFrom, null)).limit(1),
        run: () => db.public.Service.update({ priceFrom: '0.00' }).where((f, fns) => fns.eq(f.priceFrom, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'Service', column: 'priceFrom' }),
      this.setDefault({
        schema: 'public',
        table: 'Booking',
        column: 'budgetAmount',
        defaultSql: "DEFAULT '0.00'",
      }),
      this.setDefault({
        schema: 'public',
        table: 'Booking',
        column: 'priceEstimate',
        defaultSql: "DEFAULT '0.00'",
      }),
      this.setDefault({
        schema: 'public',
        table: 'Booking',
        column: 'quotedAmount',
        defaultSql: "DEFAULT '0.00'",
      }),
      this.setDefault({
        schema: 'public',
        table: 'Payment',
        column: 'amount',
        defaultSql: "DEFAULT '0.00'",
      }),
      this.setDefault({
        schema: 'public',
        table: 'PaymentWallet',
        column: 'balance',
        defaultSql: "DEFAULT '0.00'",
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'Payout',
        column: 'amount',
        defaultSql: "DEFAULT '0.00'",
      }),
      this.setDefault({
        schema: 'public',
        table: 'Service',
        column: 'priceFrom',
        defaultSql: "DEFAULT '0.00'",
      }),
      this.createIndex({
        schema: 'public',
        table: 'Invoice',
        index: 'Invoice_bookingId_idx',
        columns: ['bookingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Invoice',
        index: 'Invoice_clientId_idx',
        columns: ['clientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Invoice',
        index: 'Invoice_clientProjectId_idx',
        columns: ['clientProjectId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Invoice',
        index: 'Invoice_createdAt_idx',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Invoice',
        index: 'Invoice_createdById_idx',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Invoice',
        index: 'Invoice_dueAt_idx',
        columns: ['dueAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Invoice',
        index: 'Invoice_number_key',
        columns: ['number'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Invoice',
        index: 'Invoice_publicReference_key',
        columns: ['publicReference'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Invoice',
        index: 'Invoice_quoteId_idx',
        columns: ['quoteId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Invoice',
        index: 'Invoice_status_idx',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'InvoiceLineItem',
        index: 'InvoiceLineItem_invoiceId_idx',
        columns: ['invoiceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Opportunity',
        index: 'Opportunity_assignedToId_idx',
        columns: ['assignedToId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Opportunity',
        index: 'Opportunity_bookingId_idx',
        columns: ['bookingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Opportunity',
        index: 'Opportunity_clientId_idx',
        columns: ['clientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Opportunity',
        index: 'Opportunity_createdAt_idx',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Opportunity',
        index: 'Opportunity_leadId_idx',
        columns: ['leadId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Opportunity',
        index: 'Opportunity_publicReference_key',
        columns: ['publicReference'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Opportunity',
        index: 'Opportunity_stage_idx',
        columns: ['stage'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Quote',
        index: 'Quote_bookingId_idx',
        columns: ['bookingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Quote',
        index: 'Quote_clientId_idx',
        columns: ['clientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Quote',
        index: 'Quote_createdAt_idx',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Quote',
        index: 'Quote_createdById_idx',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Quote',
        index: 'Quote_number_key',
        columns: ['number'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Quote',
        index: 'Quote_opportunityId_idx',
        columns: ['opportunityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Quote',
        index: 'Quote_publicReference_key',
        columns: ['publicReference'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Quote',
        index: 'Quote_status_idx',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'QuoteLineItem',
        index: 'QuoteLineItem_productId_idx',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'QuoteLineItem',
        index: 'QuoteLineItem_quoteId_idx',
        columns: ['quoteId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'QuoteLineItem',
        index: 'QuoteLineItem_serviceId_idx',
        columns: ['serviceId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Invoice',
        foreignKey: {
          name: 'Invoice_quoteId_fkey',
          columns: ['quoteId'],
          references: { schema: 'public', table: 'Quote', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Invoice',
        foreignKey: {
          name: 'Invoice_bookingId_fkey',
          columns: ['bookingId'],
          references: { schema: 'public', table: 'Booking', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Invoice',
        foreignKey: {
          name: 'Invoice_clientProjectId_fkey',
          columns: ['clientProjectId'],
          references: { schema: 'public', table: 'ClientProject', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Invoice',
        foreignKey: {
          name: 'Invoice_clientId_fkey',
          columns: ['clientId'],
          references: { schema: 'public', table: 'Client', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Invoice',
        foreignKey: {
          name: 'Invoice_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'InvoiceLineItem',
        foreignKey: {
          name: 'InvoiceLineItem_invoiceId_fkey',
          columns: ['invoiceId'],
          references: { schema: 'public', table: 'Invoice', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Opportunity',
        foreignKey: {
          name: 'Opportunity_leadId_fkey',
          columns: ['leadId'],
          references: { schema: 'public', table: 'Lead', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Opportunity',
        foreignKey: {
          name: 'Opportunity_clientId_fkey',
          columns: ['clientId'],
          references: { schema: 'public', table: 'Client', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Opportunity',
        foreignKey: {
          name: 'Opportunity_bookingId_fkey',
          columns: ['bookingId'],
          references: { schema: 'public', table: 'Booking', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Opportunity',
        foreignKey: {
          name: 'Opportunity_assignedToId_fkey',
          columns: ['assignedToId'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Quote',
        foreignKey: {
          name: 'Quote_opportunityId_fkey',
          columns: ['opportunityId'],
          references: { schema: 'public', table: 'Opportunity', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Quote',
        foreignKey: {
          name: 'Quote_bookingId_fkey',
          columns: ['bookingId'],
          references: { schema: 'public', table: 'Booking', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Quote',
        foreignKey: {
          name: 'Quote_clientId_fkey',
          columns: ['clientId'],
          references: { schema: 'public', table: 'Client', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Quote',
        foreignKey: {
          name: 'Quote_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'QuoteLineItem',
        foreignKey: {
          name: 'QuoteLineItem_quoteId_fkey',
          columns: ['quoteId'],
          references: { schema: 'public', table: 'Quote', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'QuoteLineItem',
        foreignKey: {
          name: 'QuoteLineItem_serviceId_fkey',
          columns: ['serviceId'],
          references: { schema: 'public', table: 'Service', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'QuoteLineItem',
        foreignKey: {
          name: 'QuoteLineItem_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'Product', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
