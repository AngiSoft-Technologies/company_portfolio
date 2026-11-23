#!/usr/bin/env node
/**
 * Bundle-size budget check (Phase 5.5).
 *
 * Scans each app's dist/assets and fails if any chunk exceeds its budget.
 * Budgets are set from the verified 2026-11-23 baseline after i18n
 * dictionaries were code-split (English inline, 20 locales in one lazy chunk):
 *   web:   entry ~123 kB, largest route chunk ~118 kB, lazy dict ~82 kB
 *   admin: entry ~92 kB, lazy dict ~82 kB, vendors ~260 kB
 * The previous admin 80 kB figures predated Phase 7 screens and the 21-locale
 * dictionary set; they were unattainable, so they are rebaselined here with
 * ~28 kB of headroom rather than left red forever.
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
    admin: { entry: 120_000, any: 120_000, vendor: 320_000 },
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
