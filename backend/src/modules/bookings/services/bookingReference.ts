import crypto from 'crypto';
import type { Db } from '../../../db';

/**
 * Server-side public booking reference generation.
 *
 * References are readable, customer-safe, and unique. They are NOT derived
 * from the row id or a sequential counter. Format: `ANG-2026-A1B2C3D4`.
 *
 * The random suffix gives ~4 billion possibilities per year; we still probe
 * for collisions and retry a few times against the unique column.
 */

const REFERENCE_PREFIX = 'ANG';
const RANDOM_BYTES = 4;

function year(): string {
  return String(new Date().getFullYear());
}

/** Random, non-sequential suffix. The format stays human-readable/customer-safe. */
export function formatReference(y: string, n: number): string {
  return `${REFERENCE_PREFIX}-${y}-${n.toString(16).toUpperCase().padStart(RANDOM_BYTES * 2, '0')}`;
}

function randomReference(): string {
  return formatReference(year(), crypto.randomBytes(RANDOM_BYTES).readUInt32BE(0));
}

/**
 * Generate a unique public reference for the current year.
 * Retries up to 8 times on rare collision before throwing.
 */
export async function generatePublicReference(
  prisma: Db
): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = randomReference();
    const existing = await prisma.orm.public.Booking
      .where({ publicReference: candidate })
      .select('id')
      .first();
    if (!existing) return candidate;
  }
  throw new Error('Unable to allocate a unique booking reference');
}

/**
 * Secure, unguessable token used for guest (email-less) tracking.
 * Stored on the booking row and never derived from the public reference.
 */
export function generateTrackingToken(): string {
  return crypto.randomBytes(24).toString('hex');
}
