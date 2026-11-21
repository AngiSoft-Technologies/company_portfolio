/**
 * Approval rules engine (DIGITAL_HQ_PLAN Phase 4.2, v1).
 *
 * Maps (entityType, amount, currency) → the permission an actor must hold to
 * push the entity past its approval threshold. Thresholds are env-tunable;
 * defaults are deliberately conservative so existing flows are unaffected
 * until an admin opts in by setting the env var.
 *
 * Richer rules (per-department matrices, multi-step chains, scheduled
 * policies) are a follow-up; this engine is the seam they plug into.
 */

export type ApprovalEntity = 'quote' | 'invoice' | 'expense' | 'leave';

interface ApprovalRule {
  /** Amount (major units) at or above which approval is required. */
  threshold: number;
  /** Effective-permission key the actor must hold. */
  requiredPermission: string;
}

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

const RULES: Record<ApprovalEntity, ApprovalRule> = {
  quote: {
    threshold: envNumber('APPROVAL_THRESHOLD_QUOTE', 1_000_000),
    requiredPermission: 'quotes.approve',
  },
  invoice: {
    threshold: envNumber('APPROVAL_THRESHOLD_INVOICE', 1_000_000),
    requiredPermission: 'invoices.issue',
  },
  expense: {
    threshold: envNumber('APPROVAL_THRESHOLD_EXPENSE', 50_000),
    requiredPermission: 'expenses.approve',
  },
  leave: {
    threshold: envNumber('APPROVAL_THRESHOLD_LEAVE_DAYS', 0),
    requiredPermission: 'leave.approve',
  },
};

export function approvalRuleFor(entity: ApprovalEntity): ApprovalRule {
  return RULES[entity];
}

/** True when `amount` meets or exceeds the entity's approval threshold. */
export function requiresApproval(entity: ApprovalEntity, amount: number | string | null | undefined): boolean {
  const rule = RULES[entity];
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return false;
  return value >= rule.threshold;
}
