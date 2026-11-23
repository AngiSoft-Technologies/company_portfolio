/**
 * Emits idempotent, additive SQL that reconciles Permission / AppRole /
 * RolePermission with the canonical registry. Used by the production
 * enablement runbook; prints SQL only, never connects to a database.
 *
 * Usage: npx ts-node --transpile-only scripts/generate-permission-seed-sql.ts
 */
import {
    PERMISSIONS,
    ROLE_DEFAULT_PERMISSIONS,
    validateRegistryIntegrity,
} from '../src/modules/identity/services/permissionRegistry';

const integrity = validateRegistryIntegrity();
if (!integrity.ok) throw new Error(integrity.problems.join('\n'));

const q = (value: string) => `'${value.replace(/'/g, "''")}'`;
// `createdAt`/`updatedAt` are `timestamp without time zone`; `now() AT TIME
// ZONE 'UTC'` already returns that type, unlike to_char() which returns text.
const timestamp = "(now() AT TIME ZONE 'UTC')";
const id = 'md5(gen_random_uuid()::text || clock_timestamp()::text)';

const roles: ReadonlyArray<{ key: string; name: string; description: string; permissions: readonly string[] }> = [
    { key: 'SUPER_ADMIN', name: 'Super Admin', description: 'Full platform ownership', permissions: ROLE_DEFAULT_PERMISSIONS.ADMIN },
    { key: 'ADMIN', name: 'Admin', description: 'Manage public content and operations', permissions: ROLE_DEFAULT_PERMISSIONS.ADMIN },
    { key: 'MARKETING', name: 'Marketing', description: 'Manage public marketing content', permissions: ROLE_DEFAULT_PERMISSIONS.MARKETING },
    { key: 'CONTENT_CREATOR', name: 'Content Creator', description: 'Create and update public content drafts', permissions: ROLE_DEFAULT_PERMISSIONS.CONTENT_CREATOR },
    { key: 'BLOG_MANAGER', name: 'Blog Manager', description: 'Manage blog and learning content', permissions: ROLE_DEFAULT_PERMISSIONS.BLOG_MANAGER },
    { key: 'HR', name: 'HR', description: 'Manage careers and staff public profiles', permissions: ROLE_DEFAULT_PERMISSIONS.HR },
    { key: 'DEVELOPER', name: 'Developer', description: 'Manage assigned technical content and portfolio', permissions: ROLE_DEFAULT_PERMISSIONS.DEVELOPER },
    { key: 'STAFF', name: 'Staff', description: 'Manage own public staff profile and portfolio', permissions: ROLE_DEFAULT_PERMISSIONS.STAFF },
];

const statements: string[] = [];

statements.push(`INSERT INTO "Permission" (id, key, description, "createdAt", "updatedAt")
SELECT ${id}, v.key, v.description, ${timestamp}, ${timestamp}
FROM (VALUES
${PERMISSIONS.map((p) => `  (${q(p.key)}, ${q(p.description ?? p.key.replace(/\./g, ' '))})`).join(',\n')}
) AS v(key, description)
ON CONFLICT (key) DO NOTHING;`);

statements.push(`INSERT INTO "AppRole" (id, key, name, description, system, "createdAt", "updatedAt")
SELECT ${id}, v.key, v.name, v.description, true, ${timestamp}, ${timestamp}
FROM (VALUES
${roles.map((r) => `  (${q(r.key)}, ${q(r.name)}, ${q(r.description)})`).join(',\n')}
) AS v(key, name, description)
ON CONFLICT (key) DO NOTHING;`);

const allKeys = [...new Set(roles.flatMap((r) => r.permissions as readonly string[]))];
const roleKeyPairs = roles.flatMap((r) => (r.permissions as readonly string[]).map((key) => [r.key, key] as const));

statements.push(`INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r.id, p.id
FROM (VALUES
${roleKeyPairs.map(([role, key]) => `  (${q(role)}, ${q(key)})`).join(',\n')}
) AS v(role_key, permission_key)
JOIN "AppRole" r ON r.key = v.role_key
JOIN "Permission" p ON p.key = v.permission_key
ON CONFLICT DO NOTHING;`);

if (process.argv.includes('--json')) {
    console.log(JSON.stringify({
        counts: {
            permissions: PERMISSIONS.length,
            roles: roles.length,
            grants: roleKeyPairs.length,
            distinctGrantedKeys: allKeys.length,
        },
        statements,
    }, null, 2));
} else {
    console.log(`-- ${PERMISSIONS.length} permissions, ${roles.length} roles, ${roleKeyPairs.length} grants, ${allKeys.length} distinct granted keys`);
    console.log(statements.join('\n\n'));
}
