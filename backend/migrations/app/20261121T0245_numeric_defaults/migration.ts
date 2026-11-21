#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/01393c828ad0b87d8aedea9902e046bd866f0fe148cf29c8a8fcd77716757ef0/contract';
import endContract from '../../snapshots/01393c828ad0b87d8aedea9902e046bd866f0fe148cf29c8a8fcd77716757ef0/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/9baa864354cce1f12ce419a5522ba7086a46b3f0ae05e61f9b5a87701d93d9d9/contract';
import startContract from '../../snapshots/9baa864354cce1f12ce419a5522ba7086a46b3f0ae05e61f9b5a87701d93d9d9/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.setDefault({
        schema: 'public',
        table: 'Booking',
        column: 'budgetAmount',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'Booking',
        column: 'priceEstimate',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'Booking',
        column: 'quotedAmount',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'Expense',
        column: 'amount',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'Invoice',
        column: 'amountPaid',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'Invoice',
        column: 'balanceDue',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'Invoice',
        column: 'subtotal',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'Invoice',
        column: 'tax',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'Invoice',
        column: 'total',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'Payment',
        column: 'amount',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'PaymentWallet',
        column: 'balance',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'Payout',
        column: 'amount',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'PayrollRun',
        column: 'deductionTotal',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'PayrollRun',
        column: 'grossTotal',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'PayrollRun',
        column: 'netTotal',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'Payslip',
        column: 'grossAmount',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'Payslip',
        column: 'netAmount',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'PricingPackage',
        column: 'price',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'Quote',
        column: 'discount',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'Quote',
        column: 'subtotal',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'Quote',
        column: 'tax',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'Quote',
        column: 'total',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'SalaryStructure',
        column: 'basicSalary',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
      this.setDefault({
        schema: 'public',
        table: 'Service',
        column: 'priceFrom',
        defaultSql: 'DEFAULT 0',
        operationClass: 'widening',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
