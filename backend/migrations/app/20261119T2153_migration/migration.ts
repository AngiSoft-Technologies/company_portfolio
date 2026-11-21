#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/20c1428e2ac85f00dfe77d91a0391e773e556b1a649dec7d552a7b9933d6513e/contract';
import endContract from '../../snapshots/20c1428e2ac85f00dfe77d91a0391e773e556b1a649dec7d552a7b9933d6513e/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/4c54679f25cc25f326c6078dff33b07565556919b09a52a8dca25a2410f67f8a/contract';
import startContract from '../../snapshots/4c54679f25cc25f326c6078dff33b07565556919b09a52a8dca25a2410f67f8a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Employee',
        column: col('preferences', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
