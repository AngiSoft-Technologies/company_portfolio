#!/usr/bin/env node
/**
 * Bundle-size budget check (Phase 5.5).
 *
 * Scans each app's dist/assets and fails if any chunk exceeds its budget.
 * Budgets are set from the post-code-splitting baseline (2026-11-20):
 *   web:   entry ~112 kB, largest route chunk ~117 kB, vendors ~260 kB
 *   admin: entry ~37 kB after lazy routing, vendors ~260 kB
 *
 * Usage: node scripts/check-bundle-budget.mjs [web|admin|all]
 * Run AFTER `pnpm build` in the respective app.
 */
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

// Per-app budgets in bytes (uncompressed). `entry` matches the index-*.js
// chunk; `any` applies to every other chunk; `vendor` to vendor-*.js.
const BUDGETS = {
    web:   { entry: 160_000, any: 200_000, vendor: 320_000 },
    admin: { entry: 80_000,  any: 80_000,  vendor: 320_000 },
};

function checkApp(app) {
    const dir = join(ROOT, 'frontend', app, 'dist', 'assets');
    if (!existsSync(dir)) {
        console.error(`✗ ${app}: no dist/assets — run the build first`);
        return false;
    }
    const budget = BUDGETS[app];
    let ok = true;
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
        const size = statSync(join(dir, f)).size;
        const isEntry = /^index-.*\.js$/.test(f);
        const isVendor = /^vendor-.*\.js$/.test(f);
        const limit = isEntry ? budget.entry : isVendor ? budget.vendor : budget.any;
        const kind = isEntry ? 'entry' : isVendor ? 'vendor' : 'chunk ';
        const flag = size > limit ? '✗ OVER' : '  ok  ';
        if (size > limit) ok = false;
        console.log(`${flag} ${app}/${kind} ${f} ${(size / 1024).toFixed(1)} kB (budget ${(limit / 1024).toFixed(0)} kB)`);
    }
    return ok;
}

const target = process.argv[2] ?? 'all';
const apps = target === 'all' ? Object.keys(BUDGETS) : [target];
let ok = true;
for (const app of apps) ok = checkApp(app) && ok;
process.exit(ok ? 0 : 1);
