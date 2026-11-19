import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  addMoney,
  fromMoney,
  mulMoney,
  subMoney,
  sumMoney,
  toMoney,
  toMoneyFromMinorUnits,
} from '../src/modules/billing/utils/money';
import {
  defaultOpportunityProbability,
  isLegalInvoiceTransition,
  isLegalOpportunityTransition,
  isLegalQuoteTransition,
} from '../src/modules/crm/services/pipelineRules';

const ROUTES_DIR = join(__dirname, '..', 'src', 'modules', 'crm', 'routes');

describe('money helpers (Numeric(18,2) decimal text)', () => {
  it('normalizes major-unit input to canonical two-decimal text', () => {
    expect(toMoney(1234.5)).toBe('1234.50');
    expect(toMoney('19.9')).toBe('19.90');
    expect(toMoney(0)).toBe('0.00');
    expect(toMoney(null)).toBe('0.00');
  });

  it('adds, subtracts, sums and scales in integer minor units', () => {
    expect(addMoney('0.10', '0.20')).toBe('0.30');
    expect(subMoney('10.00', '0.30')).toBe('9.70');
    expect(sumMoney(['10.10', '0.20', '5'])).toBe('15.30');
    expect(mulMoney('19.99', 3)).toBe('59.97');
    expect(fromMoney('59.97')).toBe(59.97);
  });

  it('converts provider minor units to major-unit decimal text', () => {
    expect(toMoneyFromMinorUnits(1999)).toBe('19.99');
    expect(toMoneyFromMinorUnits('2500')).toBe('25.00');
    expect(toMoneyFromMinorUnits(0)).toBe('0.00');
  });

  it('rejects non-decimal input', () => {
    expect(() => toMoney('not-money')).toThrow();
    expect(() => mulMoney('10.00', 1.5)).toThrow();
  });
});

describe('sales pipeline stage machines', () => {
  it('enforces the opportunity lifecycle', () => {
    expect(isLegalOpportunityTransition('new', 'qualified')).toBe(true);
    expect(isLegalOpportunityTransition('negotiation', 'won')).toBe(true);
    expect(isLegalOpportunityTransition('new', 'won')).toBe(false);
    expect(isLegalOpportunityTransition('won', 'lost')).toBe(false);
    expect(defaultOpportunityProbability('won')).toBe(100);
    expect(defaultOpportunityProbability('lost')).toBe(0);
  });

  it('enforces the quote lifecycle', () => {
    expect(isLegalQuoteTransition('draft', 'sent')).toBe(true);
    expect(isLegalQuoteTransition('sent', 'accepted')).toBe(true);
    expect(isLegalQuoteTransition('accepted', 'draft')).toBe(false);
    expect(isLegalQuoteTransition('draft', 'accepted')).toBe(false);
  });

  it('enforces the invoice lifecycle', () => {
    expect(isLegalInvoiceTransition('draft', 'sent')).toBe(true);
    expect(isLegalInvoiceTransition('sent', 'partially_paid')).toBe(true);
    expect(isLegalInvoiceTransition('partially_paid', 'paid')).toBe(true);
    expect(isLegalInvoiceTransition('paid', 'void')).toBe(false);
  });
});

describe('sales pipeline routes', () => {
  const cases: Array<{ file: string; keys: string[] }> = [
    {
      file: 'opportunities.ts',
      keys: [
        'opportunities.view',
        'opportunities.create',
        'opportunities.update',
        'opportunities.delete',
      ],
    },
    {
      file: 'quotes.ts',
      keys: ['quotes.view', 'quotes.create', 'quotes.update', 'invoices.create'],
    },
    {
      file: 'invoices.ts',
      keys: [
        'invoices.view',
        'invoices.create',
        'invoices.update',
        'invoices.delete',
      ],
    },
  ];

  for (const { file, keys } of cases) {
    it(`${file} guards every route with canonical permission keys`, () => {
      const src = readFileSync(join(ROUTES_DIR, file), 'utf8');
      expect(src).toContain('export default function');
      expect(src).toContain('requireAuth');
      for (const key of keys) {
        expect(src).toContain(`requirePermission('${key}')`);
      }
      expect(src).not.toContain('new Map<string');
    });
  }
});
