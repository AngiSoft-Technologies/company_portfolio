import crypto from 'crypto';

const KEY_ENV = 'APP_ENCRYPTION_KEY';
const VERSION_ENV = 'APP_ENCRYPTION_KEY_ACTIVE_VERSION';

/**
 * Keyring: version 1 is the original APP_ENCRYPTION_KEY (kept for backwards
 * compatibility with existing ProviderSecret rows). New secrets are encrypted
 * with the active version, which may be raised by setting
 * APP_ENCRYPTION_KEY_ACTIVE_VERSION=2 and providing APP_ENCRYPTION_KEY_V2.
 * Decryption always selects the key recorded on the row, so rotating does not
 * invalidate previously stored values.
 */
export function activeKeyVersion(): number {
  const raw = Number(process.env[VERSION_ENV] || 1);
  return Number.isInteger(raw) && raw >= 1 ? raw : 1;
}

function keyEnvForVersion(version: number): string {
  return version === 1 ? KEY_ENV : `${KEY_ENV}_V${version}`;
}

function deriveKey(raw: string): Buffer {
  // Accept hex(64), base64(32 bytes), or passphrase-derived key.
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  const b64 = Buffer.from(raw, 'base64');
  if (b64.length === 32) return b64;
  return crypto.createHash('sha256').update(raw).digest();
}

function getKey(version: number): Buffer {
  const envName = keyEnvForVersion(version);
  const raw = process.env[envName];
  if (!raw) {
    throw new Error(`${envName} is required to use key version ${version}`);
  }
  return deriveKey(raw);
}

export type EncryptedSecret = {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
};

export function encryptSecret(plaintext: string): EncryptedSecret {
  const version = activeKeyVersion();
  const key = getKey(version);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    keyVersion: version,
  };
}

export function decryptSecret(value: EncryptedSecret): string {
  const key = getKey(value.keyVersion || 1);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(value.authTag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

export function maskSecret(value?: string | null): string | null {
  if (!value) return null;
  if (value.length <= 8) return '••••';
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export function hasEncryptionKey(): boolean {
  return Boolean(process.env[keyEnvForVersion(activeKeyVersion())]);
}
