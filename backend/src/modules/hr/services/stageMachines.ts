/**
 * Pure stage machines for the Full ERP/HR closeout.
 *
 * These are deliberately free of Express/Prisma imports so the transition
 * rules can be unit-tested without a database. Statuses are plain strings in
 * the contract (like Booking.currentStage), which keeps the vocabulary
 * extensible without a migration; the machines below are the code-level
 * guardrail that stops a caller from jumping straight to a terminal state.
 */

export interface StageMachine {
  /** Column that holds the workflow position. */
  field: 'status' | 'stage';
  initial: string;
  states: readonly string[];
  transitions: Readonly<Record<string, readonly string[]>>;
  terminal: readonly string[];
}

export class StageTransitionError extends Error {
  constructor(
    public readonly machine: string,
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`Cannot transition ${machine} from "${from}" to "${to}"`);
    this.name = 'StageTransitionError';
  }
}

export const REQUISITION_MACHINE: StageMachine = {
  field: 'status',
  initial: 'draft',
  states: ['draft', 'open', 'on_hold', 'closed', 'cancelled'],
  transitions: {
    draft: ['open', 'cancelled'],
    open: ['on_hold', 'closed', 'cancelled'],
    on_hold: ['open', 'closed', 'cancelled'],
    closed: [],
    cancelled: [],
  },
  terminal: ['closed', 'cancelled'],
};

export const CANDIDATE_MACHINE: StageMachine = {
  field: 'stage',
  initial: 'new',
  states: ['new', 'screening', 'interview', 'on_hold', 'offer', 'hired', 'rejected'],
  transitions: {
    new: ['screening', 'rejected'],
    screening: ['interview', 'rejected'],
    interview: ['offer', 'on_hold', 'rejected'],
    on_hold: ['interview', 'rejected'],
    offer: ['hired', 'rejected'],
    hired: [],
    rejected: [],
  },
  terminal: ['hired', 'rejected'],
};

export const OFFER_MACHINE: StageMachine = {
  field: 'status',
  initial: 'draft',
  states: ['draft', 'sent', 'accepted', 'contracted', 'rejected', 'expired', 'withdrawn'],
  transitions: {
    draft: ['sent', 'withdrawn'],
    sent: ['accepted', 'rejected', 'expired', 'withdrawn'],
    accepted: ['contracted', 'withdrawn'],
    contracted: [],
    rejected: [],
    expired: [],
    withdrawn: [],
  },
  terminal: ['contracted', 'rejected', 'expired', 'withdrawn'],
};

export const CONTRACT_MACHINE: StageMachine = {
  field: 'status',
  initial: 'draft',
  states: ['draft', 'approved', 'sent', 'signed', 'active', 'expired', 'terminated', 'cancelled'],
  transitions: {
    draft: ['approved', 'cancelled'],
    approved: ['sent', 'cancelled'],
    sent: ['signed', 'cancelled'],
    signed: ['active', 'cancelled'],
    active: ['expired', 'terminated'],
    expired: [],
    terminated: [],
    cancelled: [],
  },
  terminal: ['expired', 'terminated', 'cancelled'],
};

export const ORDER_MACHINE: StageMachine = {
  field: 'status',
  initial: 'draft',
  states: ['draft', 'confirmed', 'processing', 'fulfilled', 'invoiced', 'paid', 'cancelled'],
  transitions: {
    draft: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['fulfilled', 'cancelled'],
    fulfilled: ['invoiced'],
    invoiced: ['paid'],
    paid: [],
    cancelled: [],
  },
  terminal: ['paid', 'cancelled'],
};

export function isKnownStage(machine: StageMachine, stage: unknown): stage is string {
  return typeof stage === 'string' && machine.states.includes(stage);
}

export function availableTransitions(machine: StageMachine, from: string): readonly string[] {
  return machine.transitions[from] ?? [];
}

export function isLegalTransition(machine: StageMachine, from: string, to: string): boolean {
  return availableTransitions(machine, from).includes(to);
}

export function assertLegalTransition(
  machineName: string,
  machine: StageMachine,
  from: string,
  to: string,
): void {
  if (!isKnownStage(machine, from) || !isKnownStage(machine, to) || !isLegalTransition(machine, from, to)) {
    throw new StageTransitionError(machineName, from, to);
  }
}

/** Minimal patch that moves a row to `to`; routes add workflow-specific stamps. */
export function transitionPatch(
  machine: StageMachine,
  to: string,
  now: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return { [machine.field]: to, updatedAt: now, ...extra };
}
