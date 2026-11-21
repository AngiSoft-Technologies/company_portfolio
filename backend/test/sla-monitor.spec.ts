import { describe, expect, it } from 'vitest';
import { isOpenStatus, slaBreached, slaHoursFor } from '../src/workers/slaRules';

describe('SLA monitor rules', () => {
  it('maps priorities to SLA hours with normal as fallback', () => {
    expect(slaHoursFor('urgent')).toBe(4);
    expect(slaHoursFor('high')).toBe(8);
    expect(slaHoursFor('normal')).toBe(24);
    expect(slaHoursFor('low')).toBe(72);
    expect(slaHoursFor('unknown')).toBe(24);
    expect(slaHoursFor(null)).toBe(24);
  });

  it('treats open-ish statuses as monitorable', () => {
    expect(isOpenStatus('open')).toBe(true);
    expect(isOpenStatus('in_progress')).toBe(true);
    expect(isOpenStatus('pending')).toBe(true);
    expect(isOpenStatus('resolved')).toBe(false);
    expect(isOpenStatus('closed')).toBe(false);
  });

  it('uses each priority window correctly', () => {
    const now = Date.now();
    const age = (h: number) => new Date(now - h * 3600_000).toISOString();

    expect(slaBreached(age(5), 'urgent', now)).toBe(true); // > 4h
    expect(slaBreached(age(5), 'high', now)).toBe(false); // < 8h
    expect(slaBreached(age(9), 'high', now)).toBe(true); // > 8h
    expect(slaBreached(age(25), 'normal', now)).toBe(true); // > 24h
    expect(slaBreached(age(25), 'low', now)).toBe(false); // < 72h
    expect(slaBreached(age(73), 'low', now)).toBe(true); // > 72h
  });
});
