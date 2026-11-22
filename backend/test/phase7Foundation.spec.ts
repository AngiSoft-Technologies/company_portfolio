import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import { CONFIG_REGISTRY } from '../src/shared/services/runtimeConfig';
import { PERMISSION_KEYS } from '../src/modules/identity/services/permissionRegistry';
import {
    dispatchProviderEvent,
    providerEventDedupeKey,
    registerProviderEventProcessor,
} from '../src/shared/services/providerEvents';

// Unit-only spec: stub the connection-URL guard at import time (the repo's
// standard pattern for specs that never touch the database).
vi.mock('../src/db', () => ({ default: {} }));
vi.mock('../src/prisma/db', () => ({
    db: {},
    default: {},
    ts: (value?: unknown) => (typeof value === 'string' ? value : new Date().toISOString()),
    newId: () => `test_${Math.random().toString(36).slice(2)}`,
}));

describe('Phase 7 foundation', () => {
    it('registers every communication and finance permission from the plan', () => {
        const required = [
            'communications.overview.view',
            'communications.accounts.connect',
            'communications.accounts.disconnect',
            'communications.email.send_as',
            'communications.whatsapp.respond',
            'communications.telegram.respond',
            'communications.social.respond',
            'communications.rules.manage',
            'communications.export',
            'finance.accounts.view',
            'finance.reconciliation.run',
            'finance.reconciliation.resolve',
            'finance.disputes.view',
            'finance.disputes.manage',
            'finance.audit.view',
        ];
        for (const key of required) expect(PERMISSION_KEYS).toContain(key);
    });

    it('keeps runtime config keys unique and Phase 7 ready', () => {
        const keys = CONFIG_REGISTRY.map((item) => item.key);
        expect(new Set(keys).size).toBe(keys.length);
        for (const key of [
            'ZOHO_CLIENT_ID',
            'ZOHO_REFRESH_TOKEN',
            'META_PAGE_ACCESS_TOKEN',
            'META_ADS_MCP_URL',
            'META_SOCIAL_MCP_URL',
            'META_WHATSAPP_MCP_URL',
            'META_MCP_ACCESS_TOKEN',
            'META_MCP_PROTOCOL_VERSION',
            'META_CAPI_ENABLED',
            'META_CAPI_DATASET_ID',
            'META_CAPI_ACCESS_TOKEN',
            'META_CAPI_TEST_EVENT_CODE',
            'META_CAPI_ALLOW_SERVICE_EVENTS',
            'THREADS_ACCESS_TOKEN',
            'THREADS_USER_ID',
            'META_CATALOG_ID',
            'META_CATALOG_FEED_URL',
            'META_APP_REVIEW_GRANTED',
            'TELEGRAM_BOT_TOKEN',
            'TIKTOK_ACCESS_TOKEN',
            'PESAFLOW_API_KEY',
            'MPESA_C2B_SHORTCODE',
            'MPESA_BALANCE_RESULT_URL',
            'COMMUNICATIONS_WHATSAPP_WINDOW_HOURS',
            'COMMUNICATIONS_SLA_RESPONSE_MINUTES',
        ]) {
            expect(keys).toContain(key);
        }
    });

    it('ships an additive migration for every completion model', () => {
        const sql = readFileSync(
            path.resolve(process.cwd(), 'prisma/migrations/20261122210000_phase7_completion/migration.sql'),
            'utf8',
        );
        for (const table of [
            'FinanceTransaction', 'Refund', 'Dispute', 'Settlement', 'ReconciliationItem',
            'Beneficiary', 'PayoutApproval', 'ConversationParticipant', 'RoutingRule',
            'EmailSendAsIdentity', 'EmailDraft', 'EmailThread', 'EmailFolder', 'EmailAttachment',
        ]) {
            expect(sql).toContain(`CREATE TABLE IF NOT EXISTS "${table}"`);
        }
        expect(sql).toContain('"windowExpiresAt"');
        expect(sql).toContain('"lastSyncAt"');
        expect(sql).toContain('"expiresAt"');
    });

    it('uses stable provider-event dedupe keys', () => {
        expect(providerEventDedupeKey('PAYPAL', ' evt-1 ', { x: 1 })).toBe('PAYPAL:evt-1');
        const fallbackA = providerEventDedupeKey('META', null, { a: 1 });
        const fallbackB = providerEventDedupeKey('META', null, { a: 1 });
        expect(fallbackA).toBe(fallbackB);
        expect(fallbackA).toMatch(/^META:hash:/);
    });

    it('dispatches provider events to a registered domain processor', async () => {
        const processor = vi.fn().mockResolvedValue(undefined);
        registerProviderEventProcessor('FINANCE', 'TEST_PROVIDER', processor);
        const result = await dispatchProviderEvent({} as never, {
            domain: 'FINANCE',
            provider: 'TEST_PROVIDER',
        });
        expect(result).toEqual({ dispatched: true, processed: true });
        expect(processor).toHaveBeenCalledTimes(1);

        const missing = await dispatchProviderEvent({} as never, {
            domain: 'FINANCE',
            provider: 'NO_PROCESSOR',
        });
        expect(missing).toEqual({ dispatched: false, processed: false });
    });
});
