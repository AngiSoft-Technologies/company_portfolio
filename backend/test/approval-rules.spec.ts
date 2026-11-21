import { describe, expect, it } from 'vitest';
import { approvalRuleFor, requiresApproval } from '../src/modules/crm/services/approvalRules';

describe('approval rules engine', () => {
  it('requires approval at or above the quote threshold', () => {
    const threshold = approvalRuleFor('quote').threshold;
    expect(requiresApproval('quote', threshold)).toBe(true);
    expect(requiresApproval('quote', threshold + 1)).toBe(true);
    expect(requiresApproval('quote', threshold - 0.01)).toBe(false);
  });

  it('maps each entity to its configured permission', () => {
    expect(approvalRuleFor('quote').requiredPermission).toBe('quotes.approve');
    expect(approvalRuleFor('invoice').requiredPermission).toBe('invoices.issue');
  });

  it('handles string amounts, null and non-finite values safely', () => {
    const threshold = approvalRuleFor('invoice').threshold;
    expect(requiresApproval('invoice', String(threshold))).toBe(true);
    expect(requiresApproval('invoice', null)).toBe(false);
    expect(requiresApproval('invoice', undefined)).toBe(false);
    expect(requiresApproval('invoice', 'not-a-number')).toBe(false);
  });

  it('leave threshold of 0 days means every leave request needs approval', () => {
    expect(requiresApproval('leave', 0)).toBe(true);
  });
});
