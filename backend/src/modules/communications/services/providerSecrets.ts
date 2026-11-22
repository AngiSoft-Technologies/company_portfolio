/**
 * Encrypted ProviderSecret access for communications adapters.
 *
 * Secrets are only ever read from the vault in server-side service code and
 * are never returned by an API response or included in an error/log message.
 */

import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { decryptSecret, encryptSecret, hasEncryptionKey, type EncryptedSecret } from '../../../shared/services/secrets';
import { getConfig } from '../../../shared/services/runtimeConfig';

export class ProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderConfigurationError';
  }
}

export type ProviderSecretKind =
  | 'OAUTH_REFRESH'
  | 'ACCESS_TOKEN'
  | 'API_KEY'
  | 'API_SECRET'
  | 'WEBHOOK_SECRET'
  | 'OTHER';

/** Read the newest secret of a kind for a connection, or null when absent. */
export async function readProviderSecret(prisma: Db, connectionId: string, kind: ProviderSecretKind | string): Promise<string | null> {
  const row = await prisma.orm.public.ProviderSecret
    .where({ connectionId, kind } as any)
    .orderBy((s: any) => s.createdAt.desc())
    .first()
    .catch(() => null) as any;
  if (!row) return null;
  return decryptSecret({
    ciphertext: row.ciphertext,
    iv: row.iv,
    authTag: row.authTag,
    keyVersion: Number(row.keyVersion || 1),
  } as EncryptedSecret);
}

/**
 * Store (rotate) a secret. Older rows keep their key version so a key rotation
 * does not invalidate still-encrypted history; readers always take the newest.
 */
export async function storeProviderSecret(
  prisma: Db,
  input: { connectionId: string; kind: ProviderSecretKind | string; value: string; actorId?: string | null },
): Promise<{ id: string; kind: string; rotatedAt: string }> {
  const value = String(input.value ?? '');
  if (!value) throw new ProviderConfigurationError('Refusing to store an empty provider secret');
  if (!hasEncryptionKey()) {
    throw new ProviderConfigurationError('APP_ENCRYPTION_KEY is required to store provider secrets');
  }
  const enc = encryptSecret(value);
  const now = ts();
  const previous = await prisma.orm.public.ProviderSecret
    .where({ connectionId: input.connectionId, kind: input.kind } as any)
    .all()
    .then((rows: any[]) => rows, () => [] as any[]) as any[];
  for (const row of previous) {
    await prisma.orm.public.ProviderSecret.where({ id: row.id }).update({ rotatedAt: now } as any).then(() => undefined, () => undefined);
  }
  const created = await prisma.orm.public.ProviderSecret.create({
    id: newId(),
    connectionId: input.connectionId,
    kind: input.kind,
    ciphertext: enc.ciphertext,
    iv: enc.iv,
    authTag: enc.authTag,
    keyVersion: enc.keyVersion,
    rotatedAt: null,
    createdById: input.actorId ?? null,
    createdAt: now,
    updatedAt: now,
  } as any);
  return { id: (created as any).id, kind: input.kind, rotatedAt: String(now) };
}

/** Read a config-backed secret (DB vault / env via runtimeConfig), with fallback. */
export function requireConfigValue(key: string, label?: string): string {
  const value = getConfig(key);
  if (!value || value === '__SET_IN_ADMIN__') {
    throw new ProviderConfigurationError(`${label || key} is not configured`);
  }
  return value;
}

/** Redacted diagnostic shape — safe to include in API responses and audits. */
export function secretMetadata(kind: string) {
  return { kind, stored: true, value: '••••' };
}
