import { randomUUID } from 'node:crypto';

/**
 * Human-readable references for the new HR/ERP records. The inferred contract
 * has no database sequence defaults, so every write supplies these eagerly.
 * The UUID suffix keeps them collision-free without a migration.
 */
export function publicReference(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
}

export function documentNumber(prefix: string, now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  return `${prefix}-${year}-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}
