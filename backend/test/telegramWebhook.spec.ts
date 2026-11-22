import { describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  getConfig: vi.fn((_key: string, fallback = '') => fallback),
  readProviderSecret: vi.fn(async () => null as string | null),
}));

vi.mock('../src/shared/services/runtimeConfig', () => ({ getConfig: h.getConfig }));
vi.mock('../src/modules/communications/services/providerSecrets', async () => {
  const actual = await vi.importActual<typeof import('../src/modules/communications/services/providerSecrets')>(
    '../src/modules/communications/services/providerSecrets',
  );
  return {
    ...actual,
    readProviderSecret: h.readProviderSecret,
  };
});

import { safeEqual, verifyTelegramWebhook } from '../src/modules/communications/services/telegram';
import type { Db } from '../src/db';

const prisma = {} as Db;

describe('Telegram webhook verification', () => {
  it('compares tokens in constant time and rejects missing/mismatched values', () => {
    expect(safeEqual('secret-token', 'secret-token')).toBe(true);
    expect(safeEqual('secret-token', 'secret-tokeN')).toBe(false);
    expect(safeEqual('secret-token', 'short')).toBe(false);
    expect(safeEqual(null, 'secret-token')).toBe(false);
    expect(safeEqual('secret-token', undefined)).toBe(false);
  });

  it('accepts the exact configured token and rejects a near-miss', async () => {
    h.getConfig.mockImplementation((key, fallback = '') => key === 'TELEGRAM_WEBHOOK_TOKEN' ? 'top-secret' : fallback);
    await expect(verifyTelegramWebhook(prisma, { headerToken: 'top-secret' })).resolves.toBe(true);
    await expect(verifyTelegramWebhook(prisma, { headerToken: 'top-secreT' })).resolves.toBe(false);
    await expect(verifyTelegramWebhook(prisma, {})).resolves.toBe(false);
  });

  it('fails closed in production when no token is configured', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    h.getConfig.mockImplementation((key, fallback = '') => key === 'TELEGRAM_WEBHOOK_TOKEN' ? '' : fallback);
    try {
      await expect(verifyTelegramWebhook(prisma, {})).resolves.toBe(false);
      await expect(verifyTelegramWebhook(prisma, { headerToken: 'anything' })).resolves.toBe(false);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
