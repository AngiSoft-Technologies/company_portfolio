import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;
const files = [
  'prisma/migrations/20261122120000_add_employee_additional_emails/migration.sql',
  'prisma/migrations/20261122150000_phase7_comms_finance_foundation/migration.sql',
  'prisma/migrations/20261122180000_backfill_employee_emails/migration.sql',
  'prisma/migrations/20261122190000_phase7_reconciliation_templates/migration.sql',
  'prisma/migrations/20261122200000_money_decimal_normalization/migration.sql',
];

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL missing'); process.exit(1); }
const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  for (const f of files) {
    const sql = fs.readFileSync(path.resolve(process.cwd(), f), 'utf8');
    console.log('Applying', f);
    try {
      await client.query(sql);
      console.log('Applied', f);
    } catch (e) {
      console.error('Failed', f, e?.message || e);
      // Continue: allows reruns where objects already exist / partial drift.
    }
  }
  console.log('Phase 7 SQL apply pass complete');
} finally {
  await client.end();
}
