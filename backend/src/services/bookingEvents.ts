import type { PrismaClient, Prisma, BookingStatus } from '@prisma/client';

/**
 * Booking workflow event catalog + persistence helper.
 *
 * Event `type` values are stored as Strings (not a Prisma enum) so the catalog
 * can grow without a migration. The frontend only ever sees events whose
 * `visibility` is `customer` (or `staff` for authenticated staff).
 */

export const BOOKING_EVENT_TYPES = {
  BOOKING_SUBMITTED: 'booking_submitted',
  STAGE_CHANGED: 'stage_changed',
  INFORMATION_REQUESTED: 'information_requested',
  CUSTOMER_REPLIED: 'customer_replied',
  FILE_UPLOADED: 'file_uploaded',
  QUOTATION_CREATED: 'quotation_created',
  QUOTATION_SENT: 'quotation_sent',
  QUOTATION_ACCEPTED: 'quotation_accepted',
  QUOTATION_REJECTED: 'quotation_rejected',
  PAYMENT_REQUESTED: 'payment_requested',
  PAYMENT_RECEIVED: 'payment_received',
  WORK_STARTED: 'work_started',
  PROGRESS_UPDATED: 'progress_updated',
  CUSTOMER_REVIEW_REQUESTED: 'customer_review_requested',
  CHANGES_REQUESTED: 'changes_requested',
  BOOKING_COMPLETED: 'booking_completed',
  BOOKING_CANCELLED: 'booking_cancelled',
} as const;

export type BookingEventType =
  (typeof BOOKING_EVENT_TYPES)[keyof typeof BOOKING_EVENT_TYPES];

/** Visibility levels: who may see the event. */
export const EVENT_VISIBILITY = {
  CUSTOMER: 'customer',
  STAFF: 'staff',
  INTERNAL: 'internal',
} as const;

export interface LogBookingEventArgs {
  bookingId: string;
  type: BookingEventType | string;
  title: string;
  description?: string | null;
  stage?: string | null;
  status?: BookingStatus | null;
  visibility?: string; // defaults to 'customer'
  actorType?: string; // client | staff | system
  actorId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}

/**
 * Persist a single booking event inside a transaction. Pass the `tx` handle
 * from `$transaction([...])` so the event is rolled back if the parent
 * booking write fails — a booking must never exist without its seed event.
 */
export async function logBookingEvent(
  prisma: PrismaClient | Prisma.TransactionClient,
  args: LogBookingEventArgs
): Promise<void> {
  await prisma.bookingEvent.create({
    data: {
      bookingId: args.bookingId,
      type: args.type,
      title: args.title,
      description: args.description ?? null,
      stage: args.stage ?? null,
      status: args.status ?? null,
      visibility: args.visibility ?? EVENT_VISIBILITY.CUSTOMER,
      actorType: args.actorType ?? 'system',
      actorId: args.actorId ?? null,
      metadata:
      args.metadata === undefined || args.metadata === null
        ? undefined
        : (args.metadata as Prisma.InputJsonValue),    },
  });
}
