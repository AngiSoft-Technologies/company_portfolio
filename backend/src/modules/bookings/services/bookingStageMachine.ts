/**
 * Booking stage machine — the authoritative stage vocabulary, transition
 * table and derived workflow metadata.
 *
 * Extracted from `modules/bookings/routes/bookings.ts` so the rules can be
 * unit-tested without a database. This module is intentionally pure: no
 * Prisma client, network or Express imports. Route handlers remain the only
 * place that performs the writes; they simply ask this module which
 * transitions/actions are legal.
 */

/** Machine stages mirror the frontend's canonical workflow order. */
export const STAGE_ORDER = [
    'request_submitted',
    'requirements_review',
    'clarification_needed',
    'scope_and_quotation',
    'awaiting_confirmation',
    'scheduled',
    'in_progress',
    'customer_review',
    'completed',
] as const;

export type WorkflowStage = (typeof STAGE_ORDER)[number];

/**
 * Stages outside the linear happy path: `rejected` and `cancelled` are
 * reachable via the cancel/reject actions, `changes_requested` is reached from
 * customer review. They are accepted by the admin stage endpoint but are not
 * part of `STAGE_ORDER`'s progress index.
 */
export const ADDITIONAL_KNOWN_STAGES = ['rejected', 'cancelled'] as const;

/**
 * Explicit transition table. A no-op (from === to) is allowed by
 * `isLegalStageTransition` for every stage, including terminal ones.
 * Everything not listed here is an illegal transition (HTTP 409).
 */
export const STAGE_FLOW: Record<string, string[]> = {
    request_submitted: ['requirements_review', 'cancelled'],
    requirements_review: ['clarification_needed', 'scope_and_quotation', 'rejected', 'cancelled'],
    clarification_needed: ['requirements_review', 'scope_and_quotation', 'cancelled'],
    scope_and_quotation: ['awaiting_confirmation', 'cancelled'],
    awaiting_confirmation: ['scheduled', 'cancelled'],
    scheduled: ['in_progress', 'cancelled'],
    in_progress: ['customer_review', 'cancelled'],
    customer_review: ['completed', 'changes_requested'],
    changes_requested: ['in_progress'],
    completed: [],
    cancelled: [],
    rejected: [],
};

/** No-op transitions are allowed; every other transition must appear in STAGE_FLOW. */
export function isLegalStageTransition(from: string, to: string): boolean {
    if (from === to) return true;
    return Boolean(STAGE_FLOW[from]?.includes(to));
}

/** Stages accepted by the admin PATCH /stage endpoint. */
export function isKnownStage(stage: string): boolean {
    return (STAGE_ORDER as readonly string[]).includes(stage)
        || (ADDITIONAL_KNOWN_STAGES as readonly string[]).includes(stage);
}

/** BookingStatus values stored in the native pg enum (mirrored as literals). */
export const BOOKING_STATUSES = [
    'SUBMITTED',
    'UNDER_REVIEW',
    'ACCEPTED',
    'REJECTED',
    'TERMS_ACCEPTED',
    'DEPOSIT_PAID',
    'IN_PROGRESS',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Map a status change to the machine stage it implies. */
export const STATUS_TO_STAGE: Partial<Record<BookingStatus, string>> = {
    SUBMITTED: 'request_submitted',
    UNDER_REVIEW: 'requirements_review',
    ACCEPTED: 'awaiting_confirmation',
    REJECTED: 'rejected',
    TERMS_ACCEPTED: 'scheduled',
    DEPOSIT_PAID: 'scheduled',
    IN_PROGRESS: 'in_progress',
    DELIVERED: 'customer_review',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

export function stageForStatus(status: BookingStatus, currentStage: string): string {
    return STATUS_TO_STAGE[status] ?? currentStage;
}

/** Customer-visible actions derived from the current stage (server-authoritative). */
export const STAGE_ACTIONS: Record<string, string[]> = {
    request_submitted: ['UPLOAD_FILES'],
    requirements_review: ['UPLOAD_FILES', 'RESPOND_TO_CLARIFICATION'],
    clarification_needed: ['UPLOAD_FILES', 'RESPOND_TO_CLARIFICATION'],
    scope_and_quotation: ['UPLOAD_FILES'],
    awaiting_confirmation: ['ACCEPT_QUOTATION', 'DECLINE_QUOTATION', 'UPLOAD_FILES'],
    scheduled: ['UPLOAD_FILES', 'CANCEL_BOOKING'],
    in_progress: ['UPLOAD_FILES', 'REQUEST_CHANGES', 'CANCEL_BOOKING'],
    customer_review: ['CONFIRM_DELIVERY', 'REQUEST_CHANGES'],
    changes_requested: ['UPLOAD_FILES'],
    completed: [],
    cancelled: [],
    rejected: [],
};

export function availableActions(stage: string): string[] {
    return STAGE_ACTIONS[stage] ?? [];
}

/** A customer may cancel only while the booking is still active. */
export const CANCELLABLE_STAGES = [
    'request_submitted',
    'requirements_review',
    'clarification_needed',
    'scope_and_quotation',
    'awaiting_confirmation',
    'scheduled',
    'in_progress',
] as const;

export function canCancel(stage: string): boolean {
    return (CANCELLABLE_STAGES as readonly string[]).includes(stage);
}

/** Progress metadata embedded in the serialized customer view. */
export function stageProgress(stage: string): { order: typeof STAGE_ORDER; currentIndex: number } {
    return {
        order: STAGE_ORDER,
        currentIndex: STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]),
    };
}

/**
 * Customer action → target stage. Unknown actions are a no-op on the stage
 * (they still record a `progress_updated` event in the route, as before).
 */
export function customerActionStage(action: string, currentStage: string): string {
    switch (action) {
        case 'ACCEPT_QUOTATION': return 'scheduled';
        case 'DECLINE_QUOTATION': return 'scope_and_quotation';
        case 'REQUEST_CHANGES': return 'changes_requested';
        case 'CONFIRM_DELIVERY': return 'completed';
        default: return currentStage;
    }
}
