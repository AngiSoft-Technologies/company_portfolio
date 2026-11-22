/** Row shapes returned by /v1/opportunities, /v1/quotes, /v1/invoices.
 * Money fields are Prisma Numeric(18,2) — serialized as decimal strings. */

export interface MoneyLineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: string | number;
  lineTotal?: string | number;
  sortOrder?: number;
}

export interface Opportunity {
  id: string;
  publicReference?: string;
  title: string;
  leadId?: string | null;
  clientId?: string | null;
  bookingId?: string | null;
  stage: string;
  value?: string | number | null;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string | null;
  assignedToId?: string | null;
  lostReason?: string | null;
  notes?: string | null;
  source?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Quote {
  id: string;
  publicReference?: string;
  number?: string;
  opportunityId?: string | null;
  bookingId?: string | null;
  clientId?: string | null;
  status: string;
  subtotal?: string | number;
  discount?: string | number;
  tax?: string | number;
  total?: string | number;
  currency?: string;
  validUntil?: string | null;
  issuedAt?: string | null;
  acceptedAt?: string | null;
  notes?: string | null;
  lineItems?: MoneyLineItem[];
  createdAt?: string;
}

export interface Invoice {
  id: string;
  publicReference?: string;
  number?: string;
  quoteId?: string | null;
  bookingId?: string | null;
  clientProjectId?: string | null;
  clientId?: string | null;
  status: string;
  subtotal?: string | number;
  tax?: string | number;
  total?: string | number;
  amountPaid?: string | number;
  balanceDue?: string | number;
  currency?: string;
  issuedAt?: string | null;
  dueAt?: string | null;
  paidAt?: string | null;
  notes?: string | null;
  lineItems?: MoneyLineItem[];
  createdAt?: string;
}

export interface LeadOption {
  id: string;
  name?: string;
  email?: string;
}

/** Mirrors backend/src/modules/crm/services/pipelineRules.ts — keep in sync. */
export const OPPORTUNITY_STAGES = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;
export const OPPORTUNITY_FLOW: Record<string, string[]> = {
  new: ['qualified', 'lost'],
  qualified: ['proposal', 'lost'],
  proposal: ['negotiation', 'lost'],
  negotiation: ['won', 'lost'],
  won: [],
  lost: [],
};

export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'expired', 'rejected'] as const;
export const QUOTE_FLOW: Record<string, string[]> = {
  draft: ['sent', 'rejected'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: [],
  expired: [],
  rejected: [],
};

export const INVOICE_STATUSES = ['draft', 'sent', 'partially_paid', 'paid', 'void'] as const;
export const INVOICE_FLOW: Record<string, string[]> = {
  draft: ['sent', 'void'],
  sent: ['partially_paid', 'paid', 'void'],
  partially_paid: ['paid', 'void'],
  paid: [],
  void: [],
};
