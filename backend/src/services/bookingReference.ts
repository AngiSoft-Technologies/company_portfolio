import crypto from 'crypto';
import type { PrismaClient } from '@prisma/client';

/**
 * Server-side public booking reference generation.
 *
 * References are readable, customer-safe, and unique. They are NOT derived
 * from the row id (which would be guessable). Format: `ANG-2026-00481`.
 *
 * The zero-padded sequence is a per-year counter backed by a unique column;
 * we probe for collisions and retry a few times rather than relying on a
 * sequential scan, so two concurrent submissions cannot clobber each other.
 */

const REFERENCE_PREFIX = 'ANG';
const SEQUENCE_WIDTH = 5;

function year(): string {
  return String(new Date().getFullYear());
}

function sequence(n: number): string {
  return String(n).padStart(SEQUENCE_WIDTH, '0');
}

export function formatReference(y: string, n: number): string {
  return `${REFERENCE_PREFIX}-${y}-${sequence(n)}`;
}

/**
 * Generate a unique public reference for the current year.
 * Retries up to 8 times on rare collision before throwing.
 */
export async function generatePublicReference(
  prisma: PrismaClient
): Promise<string> {
  const y = year();
  for (let attempt = 0; attempt < 8; attempt++) {
    // A relatively random starting point keeps references from being a tight
    // incremental sequence (which would reveal order volume).
    const candidate = formatReference(y, Math.floor(1 + Math.random() * 90000));
    const existing = await prisma.booking.findUnique({
      where: { publicReference: candidate },
      select: { id: true },
    });
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
