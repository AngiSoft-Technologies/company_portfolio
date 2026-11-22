import { describe, expect, it } from 'vitest';
import {
  annotateDarajaEvents,
  listDarajaResultReference,
  resultCodeFromPayload,
} from '../src/modules/finance/services/darajaResultReference';

describe('read-only Daraja result-code reference', () => {
  it('publishes only documented codes with a non-authoritative disclaimer', () => {
    const reference = listDarajaResultReference();
    expect(reference.advisoryOnly).toBe(true);
    expect(reference.provenance).toMatch(/community/i);
    expect(reference.provenance).toMatch(/non-authoritative/i);
    expect(reference.resultCodes.map((entry) => entry.code)).toEqual([
      '1', '1001', '1032', '1037', '2001', '400.002.02', '400.002.05', '403.002.01',
    ]);
    expect(reference.resultCodes.every((entry) => entry.hint.length > 0)).toBe(true);
    expect(reference.httpHints.map((entry) => entry.status)).toEqual([401, 400]);
  });

  it('extracts result codes from the shapes the finance processor records', () => {
    expect(resultCodeFromPayload({ Body: { stkCallback: { ResultCode: 1032 } } })).toBe('1032');
    expect(resultCodeFromPayload({ Result: { ResultCode: '1037' } })).toBe('1037');
    expect(resultCodeFromPayload({ resultCode: 2001 })).toBe('2001');
    expect(resultCodeFromPayload({ ResponseCode: '400.002.02' })).toBe('400.002.02');
  });

  it('returns null rather than guessing when no code is present', () => {
    expect(resultCodeFromPayload(null)).toBeNull();
    expect(resultCodeFromPayload({})).toBeNull();
    expect(resultCodeFromPayload({ Body: {} })).toBeNull();
  });

  it('annotates documented failed MPESA events without mutating the source', () => {
    const events = [
      { id: 'a', provider: 'MPESA', payload: { Body: { stkCallback: { ResultCode: 1037 } } } },
      { id: 'b', provider: 'MPESA', payload: { Body: { stkCallback: { ResultCode: 0 } } } },
      { id: 'c', provider: 'MPESA', payload: { Body: { stkCallback: { ResultCode: 9999 } } } },
      { id: 'd', provider: 'PAYHERO', payload: { resultCode: 1032 } },
    ];
    const annotated = annotateDarajaEvents(events);

    expect(annotated[0].operatorHint).toMatch(/timeout/i);
    expect(annotated[1].operatorHint).toBeUndefined();
    expect(annotated[2].operatorHint).toBeUndefined();
    expect(annotated[3].operatorHint).toBeUndefined();
    expect(events[0]).not.toHaveProperty('operatorHint');
  });

  it('never echoes raw payload fields or credentials into the hint', () => {
    const [annotated] = annotateDarajaEvents([
      {
        id: 'x',
        provider: 'MPESA',
        payload: { Body: { stkCallback: { ResultCode: 1032, Password: 'super-secret', token: 'abc123' } } },
      },
    ]);
    expect(annotated.operatorHint).toMatch(/cancelled/i);
    expect(JSON.stringify(annotated)).not.toMatch(/super-secret|abc123/);
  });
});
