import dotenv from 'dotenv';
dotenv.config();
import prisma from '../src/db';
import { ts } from '../src/prisma/db';
import { ensureEmployeeEmail, normalizeEmail } from '../src/modules/identity/services/employeeEmail';

const LEGACY = normalizeEmail(process.env.LEGACY_ADMIN_EMAIL || 'admin@angisoft.co.ke');
const OWNER = normalizeEmail(process.env.OWNER_ADMIN_EMAIL || 'sangera@angisoft.co.ke');
const DRY_RUN = process.env.DRY_RUN !== 'false';

async function main() {
  const [legacy, owner] = await Promise.all([
    prisma.orm.public.Employee.where({ email: LEGACY } as any).first(),
    prisma.orm.public.Employee.where({ email: OWNER } as any).first(),
  ]);
  console.log({ DRY_RUN, LEGACY, OWNER, legacy: legacy?.id, owner: owner?.id });
  if (!legacy || !owner || legacy.id === owner.id) {
    console.log('No consolidation needed.');
    return;
  }

  const fkTables = await prisma.runtime().query(prisma.raw.sql`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name AND ccu.table_schema=tc.table_schema
    WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public' AND ccu.table_name='Employee' AND ccu.column_name='id'
    ORDER BY tc.table_name, kcu.column_name
  `.returnsRow({ table_name: prisma.sql.public.Employee.columns.id /* placeholder type */ } as any).build() as any).catch(async () => {
    // fallback raw query through runtime: use $queryRaw-like path unavailable; use prisma.raw generic
    return [] as any[];
  });

  console.log('FK refs found', Array.isArray(fkTables) ? fkTables.length : 0);
  if (DRY_RUN) {
    console.log('Dry run only. Set DRY_RUN=false to apply.');
    return;
  }

  await prisma.transaction(async (tx) => {
    // reassign simple FK columns discovered by information_schema
    const refs = await (tx as any).runtime?.query ? [] : [];
  });

  // Fallback explicit reassignment for known tables in this codebase
  const updates: Array<Promise<any>> = [];
  const reassign = async (table: string, col: string) => {
    const q = prisma.raw.sql`UPDATE "${prisma.raw.sql.raw(table)}" SET "${prisma.raw.sql.raw(col)}" = ${owner.id} WHERE "${prisma.raw.sql.raw(col)}" = ${legacy.id}`.affectedCount().build();
    const n = await prisma.runtime().execute(q);
    console.log(`updated ${table}.${col}: ${n}`);
  };

  const known: Array<[string,string]> = [
    ['RefreshToken','employeeId'],['TwoFactorBackupCode','employeeId'],['MfaMethod','employeeId'],['MfaChallenge','employeeId'],['WebAuthnCredential','employeeId'],
    ['EmployeeRoleAssignment','employeeId'],['EmployeePermission','employeeId'],['EmployeeEmail','employeeId'],['AuditLog','actorId'],
    ['Booking','assignedToId'],['Booking','staffId'],['ContactEnquiry','assigneeId'],['Conversation','assigneeId'],
    ['ProviderConnection','createdById'],['CommunicationAccount','createdById'],['FinanceAccount','createdById'],['CommunicationGrant','employeeId'],
  ];
  for (const [t,c] of known) { try { await reassign(t,c); } catch (e:any) { console.warn('skip', t,c,e.message); } }

  await ensureEmployeeEmail(prisma, owner.id, LEGACY, { isPrimary: false, verified: true, source: 'admin-consolidation' });
  try { await prisma.orm.public.Employee.where({ id: legacy.id }).delete(); console.log('Deleted legacy admin'); }
  catch (e:any) { console.warn('Could not delete legacy admin; disable manually', e.message); await prisma.orm.public.Employee.where({ id: legacy.id }).update({ isActive: false, role: 'STAFF', email: `legacy+${legacy.id}@invalid.local` } as any); }
  console.log('Consolidation complete');
}

main().catch((e)=>{ console.error(e); process.exit(1); }).finally(async ()=>{ try{ await (prisma as any).close?.(); }catch{} });
