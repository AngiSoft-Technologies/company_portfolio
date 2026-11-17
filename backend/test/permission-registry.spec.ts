import { describe, it, expect } from 'vitest';

/**
 * The permission registry is the single source of truth for access control
 * (ANGISOFT_DIGITAL_HQ_PLAN.md §5.2). These specs are the contract that makes
 * it safe to extend: a broken key is a test failure, not a silent denial of
 * service for some user.
 *
 * DB-free by design — the registry is pure data, so no connection is needed.
 */

import {
    PERMISSIONS,
    PERMISSION_KEYS,
    PERMISSION_GROUPS,
    LEGACY_KEY_ALIASES,
    ROLE_DEFAULT_PERMISSIONS,
    canonicalKey,
    isCanonicalKey,
    validateRegistryIntegrity,
} from '../src/modules/identity/services/permissionRegistry';

describe('permission registry integrity', () => {
    it('has no duplicate keys', () => {
        const seen = new Set<string>();
        const dupes: string[] = [];
        for (const p of PERMISSIONS) {
            if (seen.has(p.key)) dupes.push(p.key);
            seen.add(p.key);
        }
        expect(dupes).toEqual([]);
    });

    it('has no orphan groups or empty descriptions', () => {
        for (const p of PERMISSIONS) {
            expect(PERMISSION_GROUPS).toContain(p.group);
            expect(p.display.length).toBeGreaterThan(0);
            expect(p.description.length).toBeGreaterThan(0);
            expect(['LOW', 'MEDIUM', 'HIGH']).toContain(p.risk);
            // Keys are lower_snake.case with a dot-namespace.
            expect(p.key).toMatch(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/);
        }
    });

    it('passes its own runtime validator', () => {
        const result = validateRegistryIntegrity();
        expect(result.problems).toEqual([]);
        expect(result.ok).toBe(true);
    });
});

describe('legacy alias map', () => {
    it('only maps keys that are NOT already canonical', () => {
        // An entry whose source is canonical would be a no-op that hides a typo.
        for (const oldKey of Object.keys(LEGACY_KEY_ALIASES)) {
            expect(isCanonicalKey(oldKey)).toBe(false);
        }
    });

    it('only targets real canonical keys', () => {
        for (const [oldKey, newKey] of Object.entries(LEGACY_KEY_ALIASES)) {
            expect(PERMISSION_KEYS).toContain(newKey);
        }
    });

    it('canonicalKey() is idempotent for canonical input', () => {
        for (const key of PERMISSION_KEYS) {
            expect(canonicalKey(key)).toBe(key);
        }
    });

    it('canonicalKey() retires every legacy key', () => {
        for (const [oldKey, newKey] of Object.entries(LEGACY_KEY_ALIASES)) {
            expect(canonicalKey(oldKey)).toBe(newKey);
        }
    });

    it('leaves unknown keys untouched (never silently remaps)', () => {
        expect(canonicalKey('totally.made.up')).toBe('totally.made.up');
    });

    it('covers every key the three legacy vocabularies actually used', () => {
        // Extracted from seed.ts, staff-access.ts and the route guards.
        // If a legacy key survives unmapped, some existing grant stops working.
        const legacyKeysInUse = [
            'content.view', 'content.manage', 'content.publish', 'content.delete',
            'settings.view', 'settings.manage',
            'roles.view', 'roles.manage',
            'staff.manage', 'staff.profile.manage',
            'products.manage',
            'services.manage',
            'blog.manage',
            'careers.manage',
            'profile.view', 'profile.edit', 'profile.manage',
            'publications.view', 'publications.manage',
            'pricing.view', 'pricing.manage',
            'bookings.view', 'bookings.manage',
            'enquiries.view', 'enquiries.manage',
            'reviews.view', 'reviews.manage',
            'media.view',
            'page_content.view', 'page_content.manage',
        ];
        for (const key of legacyKeysInUse) {
            // Either canonical outright, or it must have a mapping.
            const mapped = isCanonicalKey(key) || key in LEGACY_KEY_ALIASES;
            expect(mapped, `legacy key ${key} is neither canonical nor mapped`).toBe(true);
        }
    });
});

describe('role default permission sets', () => {
    it('only grants canonical keys', () => {
        for (const [role, keys] of Object.entries(ROLE_DEFAULT_PERMISSIONS)) {
            for (const key of keys) {
                expect(PERMISSION_KEYS, `role ${role} key ${key}`).toContain(key);
            }
        }
    });

    it('grants ADMIN the full registry', () => {
        expect(ROLE_DEFAULT_PERMISSIONS.ADMIN.sort()).toEqual([...PERMISSION_KEYS].sort());
    });

    it('never grants ADMIN-only administration keys to STAFF', () => {
        const administrative = PERMISSIONS.filter(
            (p) => p.group === 'Administration',
        ).map((p) => p.key);
        const staff = new Set(ROLE_DEFAULT_PERMISSIONS.STAFF);
        for (const key of administrative) {
            expect(staff.has(key)).toBe(false);
        }
    });

    it('never grants a HIGH-risk permission to CONTENT_CREATOR', () => {
        const highRisk = new Set(
            PERMISSIONS.filter((p) => p.risk === 'HIGH').map((p) => p.key),
        );
        for (const key of ROLE_DEFAULT_PERMISSIONS.CONTENT_CREATOR) {
            expect(highRisk.has(key)).toBe(false);
        }
    });

    it('gives every role at least its own profile permissions', () => {
        for (const [role, keys] of Object.entries(ROLE_DEFAULT_PERMISSIONS)) {
            expect(keys, `role ${role}`).toContain('profile.view_own');
        }
    });
});

// NOTE: effective-permission *precedence* (DENY beating the SUPER_ADMIN
// wildcard) is a resolver concern, not a registry-data concern, and is covered
// end-to-end in security.spec.ts where the Express stack and the mocked Prisma
// contract shape are available.