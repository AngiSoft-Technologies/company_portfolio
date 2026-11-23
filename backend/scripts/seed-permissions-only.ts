/**
 * Narrow, idempotent permission/role seed for production hardening.
 *
 * The comprehensive `prisma/seed.ts` also seeds employees, content and demo
 * data; running it against a live database is deliberately avoided. This
 * script only brings the `Permission`, `AppRole` and `RolePermission` tables
 * into line with the canonical registry from
 * `src/modules/identity/services/permissionRegistry.ts`.
 *
 * It is ADDITIVE: missing rows and missing grants are created, existing rows
 * are never deleted and explicit per-employee DENY/GRANT rows are untouched.
 *
 * Usage (from backend/):
 *   npx ts-node scripts/seed-permissions-only.ts --dry-run
 *   npx ts-node scripts/seed-permissions-only.ts
 */
import 'dotenv/config';
import prisma from '../src/db';
import { ts, newId } from '../src/prisma/db';
import {
    PERMISSIONS,
    PERMISSION_KEYS,
    ROLE_DEFAULT_PERMISSIONS,
    validateRegistryIntegrity,
} from '../src/modules/identity/services/permissionRegistry';

const dryRun = process.argv.includes('--dry-run');

const ROLES: ReadonlyArray<{ key: string; name: string; description: string; permissions: readonly string[] }> = [
    { key: 'SUPER_ADMIN', name: 'Super Admin', description: 'Full platform ownership', permissions: ROLE_DEFAULT_PERMISSIONS.ADMIN },
    { key: 'ADMIN', name: 'Admin', description: 'Manage public content and operations', permissions: ROLE_DEFAULT_PERMISSIONS.ADMIN },
    { key: 'MARKETING', name: 'Marketing', description: 'Manage public marketing content', permissions: ROLE_DEFAULT_PERMISSIONS.MARKETING },
    { key: 'CONTENT_CREATOR', name: 'Content Creator', description: 'Create and update public content drafts', permissions: ROLE_DEFAULT_PERMISSIONS.CONTENT_CREATOR },
    { key: 'BLOG_MANAGER', name: 'Blog Manager', description: 'Manage blog and learning content', permissions: ROLE_DEFAULT_PERMISSIONS.BLOG_MANAGER },
    { key: 'HR', name: 'HR', description: 'Manage careers and staff public profiles', permissions: ROLE_DEFAULT_PERMISSIONS.HR },
    { key: 'DEVELOPER', name: 'Developer', description: 'Manage assigned technical content and portfolio', permissions: ROLE_DEFAULT_PERMISSIONS.DEVELOPER },
    { key: 'STAFF', name: 'Staff', description: 'Manage own public staff profile and portfolio', permissions: ROLE_DEFAULT_PERMISSIONS.STAFF },
];

async function main(): Promise<void> {
    const integrity = validateRegistryIntegrity();
    if (!integrity.ok) {
        throw new Error(`Canonical registry is inconsistent:\n${integrity.problems.join('\n')}`);
    }
    console.log(`Registry: ${PERMISSION_KEYS.length} keys, ${ROLES.length} roles — integrity OK`);

    const existingPermissions = await prisma.orm.public.Permission.where((p) => p.key.in([...PERMISSION_KEYS])).all();
    const existingByKey = new Map(existingPermissions.map((p) => [p.key, p]));
    const missingPermissions = PERMISSIONS.filter((p) => !existingByKey.has(p.key));
    console.log(`Permissions: ${existingPermissions.length} present, ${missingPermissions.length} missing${dryRun ? ' (dry-run)' : ''}`);

    if (!dryRun) {
        for (const permission of missingPermissions) {
            await prisma.transaction(async (tx) => {
                await tx.orm.public.Permission.create({
                    id: newId(),
                    key: permission.key,
                    description: permission.description ?? permission.key.replace(/\./g, ' '),
                    updatedAt: ts(),
                });
            });
        }
    }

    // Refresh after creation so grants can resolve every canonical key.
    const allPermissions = dryRun
        ? existingPermissions
        : await prisma.orm.public.Permission.where((p) => p.key.in([...PERMISSION_KEYS])).all();
    const permissionIdByKey = new Map(allPermissions.map((p) => [p.key, p.id]));

    let rolesCreated = 0;
    let grantsCreated = 0;
    const roleProblems: string[] = [];

    for (const definition of ROLES) {
        const existing = await prisma.orm.public.AppRole.where({ key: definition.key }).first();
        let roleId = existing?.id;
        if (!roleId) {
            if (dryRun) {
                rolesCreated += 1;
                roleId = `dry-run:${definition.key}`;
            } else {
                const created = await prisma.transaction(async (tx) => tx.orm.public.AppRole.create({
                    id: newId(),
                    key: definition.key,
                    name: definition.name,
                    description: definition.description,
                    system: true,
                    updatedAt: ts(),
                }));
                roleId = created.id;
                rolesCreated += 1;
            }
        }

        const expected = definition.permissions.filter((key) => permissionIdByKey.has(key));
        if (expected.length !== definition.permissions.length) {
            roleProblems.push(`${definition.key}: ${definition.permissions.length - expected.length} keys absent from Permission table`);
        }
        const existingGrants = dryRun
            ? []
            : await prisma.orm.public.RolePermission.where({ roleId }).all();
        const grantedIds = new Set(existingGrants.map((grant) => grant.permissionId));
        const missingGrants = expected.filter((key) => !grantedIds.has(permissionIdByKey.get(key)!));

        for (const key of missingGrants) {
            if (!dryRun) {
                const permissionId = permissionIdByKey.get(key)!;
                await prisma.transaction(async (tx) => tx.orm.public.RolePermission.create({ roleId, permissionId }));
            }
            grantsCreated += 1;
        }
    }

    console.log(`Roles: ${rolesCreated} missing${dryRun ? ' (would be created)' : ' created'}`);
    console.log(`Grants: ${grantsCreated} missing${dryRun ? ' (would be created)' : ' created'}`);
    if (roleProblems.length) console.warn(`Warnings:\n${roleProblems.join('\n')}`);
    console.log(dryRun ? 'Dry run complete: no writes performed.' : 'Permission seed complete.');
}

main()
    .catch((error) => {
        if (process.env.DEBUG_CONTRACT) console.error(error);
        console.error('Permission seed failed:', error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.close().catch(() => undefined);
    });
