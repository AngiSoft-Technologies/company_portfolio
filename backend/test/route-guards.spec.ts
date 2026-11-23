import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Structural contract for Phase 1.2 (`ANGISOFT_DIGITAL_HQ_PLAN.md`):
 *
 *   "Migrate all route guards to `requirePermission(key)` using the canonical
 *    resolver — no hardcoded `requireRoles(...)`; every guard testable."
 *
 * This spec reads the route source files and proves that:
 *   1. no `requireRoles(...)` call survives anywhere in a route file, and
 *   2. every permission key passed to a guard exists in the registry.
 *
 * It is deliberately source-level: a typo in a guard key would otherwise only
 * surface as a 403 in production, which nobody notices until a customer does.
 */

import {
    PERMISSION_KEYS,
    LEGACY_KEY_ALIASES,
} from '../src/modules/identity/services/permissionRegistry';

const MODULES_DIR = join(__dirname, '..', 'src', 'modules');
const APP_SOURCE = readFileSync(join(__dirname, '..', 'src', 'app.ts'), 'utf8');

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            walk(full, out);
        } else if (entry.endsWith('.ts')) {
            out.push(full);
        }
    }
    return out;
}

const ROUTE_FILES = walk(MODULES_DIR).filter((f) => f.split(/[\\/]/).includes('routes'));

/** `requireAccess('a.b'` and `requirePermission('a.b'` literal calls. */
const GUARD_RE = /require(?:Access|Permission)\(\s*'([a-zA-Z0-9_.]+)'/g;
/** Declarative entries such as `{ slug, key, permission: 'a.b' }`. */
const DECLARED_PERM_RE = /permission:\s*'([a-zA-Z0-9_.]+)'/g;

function collectMatches(re: RegExp, source: string): string[] {
    const found: string[] = [];
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(source)) !== null) found.push(m[1]);
    return found;
}

describe('route guard migration (Phase 1.2)', () => {
    it('finds the route files it is supposed to inspect', () => {
        expect(ROUTE_FILES.length).toBeGreaterThan(20);
    });

    it('has no requireRoles(...) call left in any route file', () => {
        const offenders: string[] = [];
        for (const file of ROUTE_FILES) {
            const src = readFileSync(file, 'utf8');
            // Ignore comment lines that merely mention the old helper.
            const code = src
                .split('\n')
                .filter((line) => !line.trimStart().startsWith('*') && !line.trimStart().startsWith('//'))
                .join('\n');
            if (/\brequireRoles\s*\(/.test(code)) offenders.push(file);
        }
        expect(offenders, `still using requireRoles(): ${offenders.join(', ')}`).toEqual([]);
    });

    it('only passes canonical keys to permission guards', () => {
        const unknown: string[] = [];
        for (const file of ROUTE_FILES) {
            const src = readFileSync(file, 'utf8');
            for (const key of collectMatches(GUARD_RE, src)) {
                if (!PERMISSION_KEYS.includes(key)) unknown.push(`${file}: ${key}`);
            }
        }
        expect(unknown, `guards reference unknown keys:\n${unknown.join('\n')}`).toEqual([]);
    });

    it('only declares canonical keys in permission tables', () => {
        const unknown: string[] = [];
        for (const file of ROUTE_FILES) {
            const src = readFileSync(file, 'utf8');
            for (const key of collectMatches(DECLARED_PERM_RE, src)) {
                if (!PERMISSION_KEYS.includes(key)) unknown.push(`${file}: ${key}`);
            }
        }
        expect(unknown, `declarations reference unknown keys:\n${unknown.join('\n')}`).toEqual([]);
    });

    it('guards the generic settings CRUD mount with a canonical permission', () => {
        // The shared CRUD factory has no authorization of its own; the mount
        // must supply both authentication and a HIGH-risk permission check.
        expect(APP_SOURCE).toMatch(
            /app\.use\('\/v1\/settings',\s*requireAuth,\s*requireAccess\('administration\.settings'/,
        );
    });

    it('never reintroduces a retired legacy key as a live guard', () => {
        // A legacy key may still be *aliased* (so old grants keep working) but
        // a guard must not be written against one: it would silently resolve to
        // something the reviewer did not read.
        const legacy = new Set(Object.keys(LEGACY_KEY_ALIASES));
        const offenders: string[] = [];
        for (const file of ROUTE_FILES) {
            const src = readFileSync(file, 'utf8');
            for (const key of collectMatches(GUARD_RE, src)) {
                if (legacy.has(key)) offenders.push(`${file}: ${key}`);
            }
        }
        expect(offenders, `guards use retired keys:\n${offenders.join('\n')}`).toEqual([]);
    });
});
