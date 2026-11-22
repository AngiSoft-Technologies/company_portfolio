import { describe, expect, it } from 'vitest';
import { matchC2bConfirmations } from '../src/modules/finance/services/c2bMatching';

describe('read-only C2B reconciliation suggestions', () => {
  const invoices = [
    {
      id: 'inv-1',
      number: 'I-ABCDEFGH',
      publicReference: 'INV-ABCDEFGH',
      status: 'SENT',
      currency: 'KES',
      total: 1500,
      balanceDue: 1500,
    },
    {
      id: 'inv-2',
      number: 'I-ZZZZZZZZ',
      publicReference: 'INV-ZZZZZZZZ',
      status: 'DRAFT',
      currency: 'KES',
      total: 250,
      balanceDue: 250,
    },
  ];

  it('matches a BillRefNumber against number and publicReference case/whitespace-insensitively', () => {
    const result = matchC2bConfirmations([
      {
        id: 'evt-1',
        externalEventId: 'C2B_CONFIRMATION:TransID:ABC123',
        createdAt: '2026-11-22T10:00:00.000Z',
        payload: {
          transId: 'ABC123',
          billRefNumber: ' inv-abcdefgh ',
          amount: 1500,
          matchKey: 'BillRefNumber',
          matchValue: ' inv-abcdefgh ',
        },
      },
    ], invoices);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      eventId: 'evt-1',
      externalEventId: 'C2B_CONFIRMATION:TransID:ABC123',
      transId: 'ABC123',
      billRefNumber: 'inv-abcdefgh',
      amount: 1500,
      status: 'MATCHED',
      matchedOn: 'publicReference',
    });
    expect(result[0].invoice).toMatchObject({ id: 'inv-1', number: 'I-ABCDEFGH' });
  });

  it('flags an amount mismatch instead of settling or rejecting', () => {
    const result = matchC2bConfirmations([
      {
        id: 'evt-2',
        payload: { transId: 'DEF456', billRefNumber: 'I-ABCDEFGH', amount: 999 },
      },
    ], invoices);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('AMOUNT_MISMATCH');
    expect(result[0].reasons.join(' ')).toMatch(/differs|Review manually/i);
  });

  it('returns an UNMATCHED suggestion for unknown references, never dropping the event', () => {
    const result = matchC2bConfirmations([
      { id: 'evt-3', payload: { transId: 'GHI789', billRefNumber: 'INV-UNKNOWN', amount: 100 } },
    ], invoices);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('UNMATCHED');
    expect(result[0].invoice).toBeNull();
    expect(result[0].reasons.join(' ')).toMatch(/No invoice/i);
  });

  it('surfaces confirmations with no BillRefNumber rather than silently ignoring them', () => {
    const result = matchC2bConfirmations([
      { id: 'evt-4', payload: { transId: 'JKL000', amount: 50 } },
    ], invoices);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('UNMATCHED');
    expect(result[0].reasons.join(' ')).toMatch(/no BillRefNumber/i);
  });

  it('reads raw Safaricom callback field names defensively', () => {
    const result = matchC2bConfirmations([
      {
        id: 'evt-5',
        payload: { TransID: 'MNO111', BillRefNumber: 'INV-ZZZZZZZZ', Amount: 250 },
      },
    ], invoices);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      transId: 'MNO111',
      billRefNumber: 'INV-ZZZZZZZZ',
      amount: 250,
      status: 'MATCHED',
    });
  });

  it('returns no suggestions for an empty event list', () => {
    expect(matchC2bConfirmations([], invoices)).toEqual([]);
  });
});
