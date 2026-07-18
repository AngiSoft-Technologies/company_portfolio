/**
 * Type-aware numeric/date formatting for metrics and counters.
 *
 * The AngiSoft UI previously grouped EVERY numeric value by default, so a year
 * such as 2024 was rendered as "2,024". This formatter makes grouping a
 * property of the value's SEMANTIC TYPE, never of its label text.
 *
 * Consumers pass a `valueType` (or legacy `type`/`format`). Grouping is then
 * decided by a fixed rule set below, with an explicit `useGrouping` override
 * available for genuinely unusual cases.
 */

// Types that must NEVER receive thousands separators.
const GROUPING_DISABLED_TYPES = new Set([
  'year',
  'month',
  'day',
  'date',
  'identifier',
  'plain',
]);

// Types best presented with decimal places handled by the caller / config.
// (kept explicit so future editors see the supported set at a glance)
export const SUPPORTED_VALUE_TYPES = [
  'year',
  'count',
  'integer',
  'decimal',
  'percentage',
  'currency',
  'month',
  'day',
  'duration',
  'date',
  'identifier',
  'plain',
];

// Resolve the semantic type from the widest range of field names we accept.
export const resolveValueType = (stat) => {
  if (!stat || typeof stat !== 'object') return 'plain';

  const raw =
    stat.valueType ||
    stat.type ||
    stat.format ||
    (stat.valueKind || '');

  const normalized = String(raw || '').trim().toLowerCase();
  if (SUPPORTED_VALUE_TYPES.includes(normalized)) return normalized;

  return 'plain';
};

// Decide grouping from type + optional explicit override.
export const resolveGrouping = ({ valueType, useGrouping }) => {
  if (typeof useGrouping === 'boolean') return useGrouping;
  return !GROUPING_DISABLED_TYPES.has(valueType);
};

// Coerce a string/number into a finite Number or null if not numeric.
const toFiniteNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim();
    if (cleaned === '') return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

/**
 * Format a single metric value.
 *
 * @param {Object}   options
 * @param {*}        options.value          Raw value (number, numeric string, or Date-ish for `date`).
 * @param {string}   [options.valueType]    Semantic type; falls back to type/format/plain.
 * @param {string}   [options.locale]       Intl locale (default 'en-KE').
 * @param {string}   [options.currency]     ISO currency for `currency` type (default 'KES').
 * @param {number}   [options.minimumFractionDigits]
 * @param {number}   [options.maximumFractionDigits]
 * @param {boolean}  [options.useGrouping]  Explicit override of grouping.
 * @param {string}   [options.prefix]       Rendered before the value.
 * @param {string}   [options.suffix]       Rendered after the value (collapses to avoid duplication).
 * @returns {string} Formatted, display-ready string (never 'NaN').
 */
export const formatMetricValue = ({
  value,
  valueType,
  locale = 'en-KE',
  currency = 'KES',
  minimumFractionDigits,
  maximumFractionDigits,
  useGrouping,
  prefix = '',
  suffix = '',
} = {}) => {
  const type = valueType && SUPPORTED_VALUE_TYPES.includes(valueType)
    ? valueType
    : resolveValueType(valueType ? { valueType } : undefined);

  const grouping = resolveGrouping({ valueType: type, useGrouping });

  // ── Identifier: leading zeros are semantic data, never coerce to Number ──
  if (type === 'identifier') {
    return `${prefix}${String(value ?? '').replace(/\s+/g, ' ').trim()}${suffix}`;
  }

  // ── Date types: never run a number formatter over a timestamp ──
  if (type === 'date') {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value ?? '');
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  if (type === 'month') {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat(locale, {
        month: 'long',
        year: 'numeric',
      }).format(date);
    }
    // Fall through to numeric formatting for plain month numbers.
  }

  const num = toFiniteNumber(value);

  // Non-numeric, non-date: preserve the source text (e.g. identifiers, labels).
  if (num === null) {
    return `${prefix}${String(value ?? '').replace(/\s+/g, ' ').trim()}${suffix}`;
  }

  // Base number-format options.
  const fmtOptions = {
    useGrouping: grouping,
    minimumFractionDigits:
      typeof minimumFractionDigits === 'number'
        ? minimumFractionDigits
        : type === 'decimal'
        ? 1
        : 0,
    maximumFractionDigits:
      typeof maximumFractionDigits === 'number'
        ? maximumFractionDigits
        : type === 'decimal'
        ? 2
        : 0,
  };

  let body;

  if (type === 'currency') {
    body = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      ...fmtOptions,
    }).format(num);
  } else if (type === 'percentage') {
    // Append a single %; Intl percent style *scales* the value, so we format
    // manually to avoid turning 75 into 7500%.
    body = `${new Intl.NumberFormat(locale, fmtOptions).format(num)}%`;
  } else {
    body = new Intl.NumberFormat(locale, fmtOptions).format(num);
  }

  // Collapse accidental double suffixes (e.g. value already ending in '%').
  const trimmedBody = body.trim();
  const dedupSuffix =
    suffix && trimmedBody.endsWith(suffix) ? '' : suffix;

  return `${prefix}${trimmedBody}${dedupSuffix}`;
};

export default formatMetricValue;
