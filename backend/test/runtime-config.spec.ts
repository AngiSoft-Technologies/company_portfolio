import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getConfig, clearRuntimeConfigCache } from '../src/shared/services/runtimeConfig';
import { decryptSecret, encryptSecret, maskSecret } from '../src/shared/services/secrets';

/** Vault primitives: no plaintext in the admin view, env remains a safe fallback. */
describe('runtime config vault', () => {
  const keys = ['APP_ENCRYPTION_KEY', 'APP_ENCRYPTION_KEY_V2', 'APP_ENCRYPTION_KEY_ACTIVE_VERSION', 'PAYPAL_ENV', 'PAYPAL_CURRENCY', 'TEST_CONFIG_VALUE'];

  beforeEach(() => {
    clearRuntimeConfigCache();
    for (const key of keys) delete process.env[key];
    process.env.APP_ENCRYPTION_KEY = 'v1-key-for-unit-tests-only';
  });

  afterEach(() => {
    clearRuntimeConfigCache();
    for (const key of keys) delete process.env[key];
  });

  it('reads values from the environment when the vault mirror is empty', () => {
    process.env.TEST_CONFIG_VALUE = 'from-env';
    expect(getConfig('TEST_CONFIG_VALUE')).toBe('from-env');
    delete process.env.TEST_CONFIG_VALUE;
    expect(getConfig('TEST_CONFIG_VALUE')).toBe('');
  });

  it('uses the registry default for known keys with no value anywhere', () => {
    expect(getConfig('PAYPAL_ENV')).toBe('sandbox');
    expect(getConfig('PAYPAL_CURRENCY')).toBe('USD');
  });

  it('never returns a whole secret from the admin mask', () => {
    const secret = 'sk-live-abcdefghijklmnop';
    const masked = maskSecret(secret);
    expect(masked).not.toBe(secret);
    expect(masked).not.toContain(secret.slice(6, 20));
    expect(maskSecret('')).toBeNull();
  });

  it('encrypts and decrypts with the active version and keeps old rows readable', () => {
    const secret = 'a-rotating-credential';
    const v1 = encryptSecret(secret);
    expect(v1.keyVersion).toBe(1);
    expect(JSON.stringify(v1)).not.toContain(secret);
    expect(decryptSecret(v1)).toBe(secret);

    process.env.APP_ENCRYPTION_KEY_V2 = 'v2-key-for-unit-tests-only';
    process.env.APP_ENCRYPTION_KEY_ACTIVE_VERSION = '2';
    const v2 = encryptSecret(secret);
    expect(v2.keyVersion).toBe(2);
    // Old rows still decrypt with their recorded version after a key rotation.
    expect(decryptSecret(v1)).toBe(secret);
    expect(decryptSecret(v2)).toBe(secret);
  });
});
