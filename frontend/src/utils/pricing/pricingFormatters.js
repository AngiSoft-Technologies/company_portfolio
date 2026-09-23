// Pricing display formatters for the Pricing page.
//
// Two distinct formats are used across the page:
//   - `formatKsh`     -> "KSh 15,000"   (estimated category ranges, per spec)
//   - `formatFrom`    -> "From KES 15,000" (individual service starting prices)
//
// Both use Intl.NumberFormat('en-KE', ...). No prices are invented here —
// callers pass already-real numeric values from the API.

const KENYA_LOCALE = 'en-KE';

const numberFormatter = new Intl.NumberFormat(KENYA_LOCALE, {
    maximumFractionDigits: 0,
});

const currencyFormatter = new Intl.NumberFormat(KENYA_LOCALE, {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
});

/**
 * Format a numeric amount as "KSh 15,000".
 * Returns null when no valid amount is supplied.
 * @param {number|null|undefined} amount
 * @returns {string|null}
 */
export function formatKsh(amount) {
    if (amount == null || Number.isNaN(Number(amount))) return null;
    const value = numberFormatter.format(Number(amount));
    return `KSh ${value}`;
}

/**
 * Format a numeric amount with its currency symbol: "KES 15,000".
 * Returns null when no valid amount is supplied.
 * @param {number|null|undefined} amount
 * @param {string} [currency]
 * @returns {string|null}
 */
export function formatCurrency(amount, currency = 'KES') {
    if (amount == null || Number.isNaN(Number(amount))) return null;
    if (currency !== 'KES') {
        const fmt = new Intl.NumberFormat(KENYA_LOCALE, {
            style: 'currency',
            currency,
            maximumFractionDigits: 0,
        });
        return fmt.format(Number(amount));
    }
    return currencyFormatter.format(Number(amount));
}

/**
 * Format a starting price as "From KES 15,000".
 * Returns null when no valid amount is supplied so callers can fall back to a
 * "Quote on request" prompt.
 * @param {number|null|undefined} amount
 * @param {string} [currency]
 * @returns {string|null}
 */
export function formatFrom(amount, currency = 'KES') {
    const formatted = formatCurrency(amount, currency);
    return formatted ? `From ${formatted}` : null;
}

/**
 * Format a price range such as "KSh 25,000 – KSh 120,000".
 * Returns null when neither bound is valid.
 * @param {number|null|undefined} min
 * @param {number|null|undefined} max
 * @returns {string|null}
 */
export function formatRange(min, max) {
    const minLabel = formatKsh(min);
    const maxLabel = formatKsh(max);
    if (minLabel && maxLabel && min !== max) return `${minLabel} – ${maxLabel}`;
    if (minLabel) return minLabel;
    if (maxLabel) return maxLabel;
    return null;
}

/**
 * Format a start amount as "Starting from KSh 25,000".
 * Returns the phrase only when a valid amount exists.
 * @param {number|null|undefined} amount
 * @returns {string|null}
 */
export function formatStartingFrom(amount) {
    const label = formatKsh(amount);
    return label ? `Starting from ${label}` : null;
}

export default {
    formatKsh,
    formatCurrency,
    formatFrom,
    formatRange,
    formatStartingFrom,
};
