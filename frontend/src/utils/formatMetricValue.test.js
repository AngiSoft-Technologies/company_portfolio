import { describe, it, expect } from 'vitest';
import {
  formatMetricValue,
  resolveValueType,
  resolveGrouping,
} from './formatMetricValue';

describe('formatMetricValue — year', () => {
  it('renders 2024 without a thousands separator', () => {
    expect(formatMetricValue({ value: 2024, valueType: 'year' })).toBe('2024');
  });

  it('never renders 2,024 for a year', () => {
    expect(formatMetricValue({ value: 2024, valueType: 'year' })).not.toBe('2,024');
  });
});

describe('formatMetricValue — count', () => {
  it('uses grouping for large counts', () => {
    expect(formatMetricValue({ value: 1000, valueType: 'count' })).toBe('1,000');
  });

  it('appends a single suffix without duplication', () => {
    expect(formatMetricValue({ value: 6, valueType: 'count', suffix: '+' })).toBe('6+');
  });
});

describe('formatMetricValue — identifier', () => {
  it('preserves leading zeros', () => {
    expect(formatMetricValue({ value: '001024', valueType: 'identifier' })).toBe('001024');
  });

  it('does not group identifiers', () => {
    expect(formatMetricValue({ value: '1002003', valueType: 'identifier' })).toBe('1002003');
  });
});

describe('formatMetricValue — percentage', () => {
  it('appends % exactly once', () => {
    expect(formatMetricValue({ value: 75, valueType: 'percentage' })).toBe('75%');
  });

  it('does not double a trailing % already in value text', () => {
    expect(formatMetricValue({ value: 75, valueType: 'percentage', suffix: '%' })).toBe('75%');
  });
});

describe('formatMetricValue — currency', () => {
  it('uses Intl currency formatting for KES', () => {
    const out = formatMetricValue({ value: 125000, valueType: 'currency', currency: 'KES' });
    expect(out).toContain('125,000');
    expect(out).toMatch(/KES|KSh|Ksh/);
  });

  it('respects an explicit useGrouping override', () => {
    const out = formatMetricValue({
      value: 125000,
      valueType: 'currency',
      currency: 'KES',
      useGrouping: false,
    });
    expect(out).not.toContain(',');
  });
});

describe('formatMetricValue — decimal', () => {
  it('preserves configured decimals', () => {
    expect(formatMetricValue({ value: 4.5, valueType: 'decimal' })).toBe('4.5');
  });
});

describe('formatMetricValue — date', () => {
  it('formats a valid date with DateTimeFormat', () => {
    const out = formatMetricValue({ value: new Date(2026, 6, 18), valueType: 'date' });
    expect(out).toBe('18 July 2026');
  });

  it('does not run a number formatter over a timestamp', () => {
    const out = formatMetricValue({ value: new Date(2024, 11, 1), valueType: 'date' });
    expect(out).toContain('2024');
    expect(out).not.toMatch(/,024/);
  });
});

describe('formatMetricValue — invalid numbers', () => {
  it('does not render NaN', () => {
    expect(formatMetricValue({ value: 'not-a-number', valueType: 'count' })).toBe('not-a-number');
  });
});

describe('formatMetricValue — type resolution & fallback', () => {
  it('normalizes valueType/type/format and falls back to plain', () => {
    expect(resolveValueType({ type: 'year' })).toBe('year');
    expect(resolveValueType({ format: 'count' })).toBe('count');
    expect(resolveValueType({})).toBe('plain');
  });

  it('conservative plain default disables grouping', () => {
    expect(resolveGrouping({ valueType: 'plain' })).toBe(false);
    expect(resolveGrouping({ valueType: 'year' })).toBe(false);
    expect(resolveGrouping({ valueType: 'count' })).toBe(true);
  });

  it('explicit useGrouping overrides the type rule', () => {
    expect(resolveGrouping({ valueType: 'year', useGrouping: true })).toBe(true);
    expect(resolveGrouping({ valueType: 'count', useGrouping: false })).toBe(false);
  });
});
