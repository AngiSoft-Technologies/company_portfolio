import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Unit-only spec: runtimeConfig imports the Prisma client at module load.
vi.mock('../src/db', () => ({ default: {} }));
vi.mock('../src/prisma/db', () => ({
    db: {},
    default: {},
    ts: (value?: unknown) => (typeof value === 'string' ? value : new Date().toISOString()),
    newId: () => `test_${Math.random().toString(36).slice(2)}`,
}));

import { CONFIG_REGISTRY, getConfig } from '../src/shared/services/runtimeConfig';

const SRC_DIR = join(__dirname, '..', 'src');

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (full.endsWith('.ts')) out.push(full);
    }
    return out;
}

const UNSIGNED_WEBHOOK_FLAGS = [
    'WHATSAPP_ALLOW_UNSIGNED_WEBHOOKS',
    'META_ALLOW_UNSIGNED_WEBHOOKS',
    'TELEGRAM_ALLOW_UNSIGNED_WEBHOOKS',
    'TIKTOK_ALLOW_UNSIGNED_WEBHOOKS',
];

/** Keys read via dynamic helpers whose string literal is not `getConfig('KEY')`. */
const DYNAMIC_CONFIG_KEYS = [
    ...UNSIGNED_WEBHOOK_FLAGS,
    'META_WHATSAPP_BUSINESS_ACCOUNT_ID',
    'META_ADS_MCP_URL',
    'META_SOCIAL_MCP_URL',
    'META_WHATSAPP_MCP_URL',
];

describe('runtime config registry', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('registers every literal runtime config key used in source', () => {
        const registered = new Set(CONFIG_REGISTRY.map((item) => item.key));
        const used = new Set<string>(DYNAMIC_CONFIG_KEYS);

        for (const file of walk(SRC_DIR)) {
            const source = readFileSync(file, 'utf8');
            for (const match of source.matchAll(/getConfig\(\s*'([^']+)'/g)) {
                used.add(match[1]);
            }
        }

        const missing = [...used].filter((key) => !registered.has(key)).sort();
        expect(missing).toEqual([]);
    });

    it('forces every unsigned webhook escape hatch off in production', () => {
        vi.stubEnv('NODE_ENV', 'production');
        for (const flag of UNSIGNED_WEBHOOK_FLAGS) vi.stubEnv(flag, 'true');

        for (const flag of UNSIGNED_WEBHOOK_FLAGS) {
            expect(getConfig(flag)).toBe('false');
        }
    });

    it('keeps the registry unique and complete', () => {
        const keys = CONFIG_REGISTRY.map((item) => item.key);
        expect(new Set(keys).size).toBe(keys.length);
        expect(keys.length).toBeGreaterThanOrEqual(137);
    });
});
