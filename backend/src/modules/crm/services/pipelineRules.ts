export const OPPORTUNITY_STAGE_ORDER = [
  'new',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
] as const;

export const OPPORTUNITY_STAGE_FLOW: Record<string, string[]> = {
  new: ['qualified', 'lost'],
  qualified: ['proposal', 'lost'],
  proposal: ['negotiation', 'lost'],
  negotiation: ['won', 'lost'],
  won: [],
  lost: [],
};

export function isLegalOpportunityTransition(from: string, to: string): boolean {
  if (from === to) return true;
  return Boolean(OPPORTUNITY_STAGE_FLOW[from]?.includes(to));
}

export function defaultOpportunityProbability(stage: string): number {
  const probabilities: Record<string, number> = {
    new: 10,
    qualified: 30,
    proposal: 50,
    negotiation: 70,
    won: 100,
    lost: 0,
  };
  return probabilities[stage] ?? 0;
}

export const QUOTE_STATUS_ORDER = ['draft', 'sent', 'accepted', 'expired', 'rejected'] as const;

export const QUOTE_STAGE_FLOW: Record<string, string[]> = {
  draft: ['sent', 'rejected'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: [],
  expired: [],
  rejected: [],
};

export function isLegalQuoteTransition(from: string, to: string): boolean {
  if (from === to) return true;
  return Boolean(QUOTE_STAGE_FLOW[from]?.includes(to));
}

export const INVOICE_STATUS_ORDER = ['draft', 'sent', 'partially_paid', 'paid', 'void'] as const;

export const INVOICE_STAGE_FLOW: Record<string, string[]> = {
  draft: ['sent', 'void'],
  sent: ['partially_paid', 'paid', 'void'],
  partially_paid: ['paid', 'void'],
  paid: [],
  void: [],
};

export function isLegalInvoiceTransition(from: string, to: string): boolean {
  if (from === to) return true;
  return Boolean(INVOICE_STAGE_FLOW[from]?.includes(to));
}
