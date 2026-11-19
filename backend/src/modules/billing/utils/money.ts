import type { Numeric } from '@prisma/orm-postgres/target/codec-types';

/**
 * Money helpers for `@angisoft/billing`.
 *
 * Prisma 8 `Numeric(18, 2)` columns are decimal text, not floats. All writes go
 * through `toMoney()`/`sumMoney()`/`addMoney()`, which compute in integer minor
 * units (cents) and return canonical `"1234.50"` strings. `fromMoney()` is only
 * for display or legacy paths that still need a JS number.
 */

export type Money = Numeric<18, 2>;
export type MoneyInput = number | string | null | undefined;

const MONEY_TEXT = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;
const CURRENCY_PREFIX = /^(?:KES|KSH|USD|EUR|GBP)\s*/i;

function invalidMoney(value: MoneyInput): never {
    throw new Error(`Invalid money value: ${String(value)}`);
}

function stripMoneyText(value: string): string {
    return value.trim().replace(/,/g, '').replace(CURRENCY_PREFIX, '');
}

function decimalTextToMinorUnits(text: string): bigint {
    if (!MONEY_TEXT.test(text)) return invalidMoney(text);

    const negative = text.startsWith('-');
    const unsigned = text.replace(/^[+-]/, '');
    const [integerPart, fractionPart = ''] = unsigned.split('.');
    const integerDigits = integerPart || '0';
    const fractionDigits = fractionPart.padEnd(2, '0');

    // Round half-up to cents without ever touching a float.
    const keptFraction = fractionDigits.slice(0, 2);
    const discarded = fractionDigits.slice(2);
    const roundUp = discarded.length > 0 && discarded[0] >= '5';

    const units = BigInt(integerDigits || '0');
    const cents = BigInt(keptFraction || '0') + (roundUp ? 1n : 0n);
    const minor = units * 100n + cents;

    return negative ? -minor : minor;
}

function toMinorUnits(value: MoneyInput): bigint {
    if (value === null || value === undefined || value === '') return 0n;

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return invalidMoney(value);
        // `toFixed(2)` is only used to hand a JS number to the exact decimal
        // parser; the arithmetic itself stays in integer minor units.
        return decimalTextToMinorUnits(value.toFixed(2));
    }

    const text = stripMoneyText(value);
    if (!text) return 0n;
    return decimalTextToMinorUnits(text);
}

function fromMinorUnits(minor: bigint): Money {
    const negative = minor < 0n;
    const absolute = negative ? -minor : minor;
    const units = absolute / 100n;
    const cents = absolute % 100n;
    return `${negative ? '-' : ''}${units}.${cents.toString().padStart(2, '0')}` as Money;
}

/** Canonical `"1234.50"` decimal text for a `Numeric(18, 2)` write. */
export function toMoney(value: MoneyInput): Money {
    return fromMinorUnits(toMinorUnits(value));
}

/** JS number in major units for display/legacy paths only. */
export function fromMoney(value: string | null): number {
    if (value === null || value === undefined || value === '') return 0;
    try {
        return Number(toMoney(value));
    } catch {
        return 0;
    }
}

/** Sum decimal inputs in minor units and return canonical decimal text. */
export function sumMoney(values: MoneyInput[]): Money {
    const total = values.reduce((acc, value) => acc + toMinorUnits(value), 0n);
    return fromMinorUnits(total);
}

/** Add two decimal inputs in minor units and return canonical decimal text. */
export function addMoney(a: MoneyInput, b: MoneyInput): Money {
    return fromMinorUnits(toMinorUnits(a) + toMinorUnits(b));
}

/** Subtract two decimal inputs in minor units and return canonical decimal text. */
export function subMoney(a: MoneyInput, b: MoneyInput): Money {
    return fromMinorUnits(toMinorUnits(a) - toMinorUnits(b));
}

/** Multiply a decimal amount by an integer factor (e.g. line-item quantity). */
export function mulMoney(value: MoneyInput, factor: number | bigint): Money {
    const minor = toMinorUnits(value);
    if (typeof factor === 'bigint') return fromMinorUnits(minor * factor);
    if (!Number.isInteger(factor)) return invalidMoney(factor);
    return fromMinorUnits(minor * BigInt(factor));
}

/**
 * Convert an integer minor-unit (cent) amount — e.g. Stripe/Paystack webhook
 * totals — into canonical major-unit decimal text for a `Numeric(18,2)` write.
 */
export function toMoneyFromMinorUnits(value: number | string | bigint | null | undefined): Money {
    if (value === null || value === undefined || value === '') return fromMinorUnits(0n);
    if (typeof value === 'bigint') return fromMinorUnits(value);
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return invalidMoney(value);
        return fromMinorUnits(BigInt(Math.round(value)));
    }
    const text = value.trim();
    if (!/^[+-]?\d+$/.test(text)) return invalidMoney(value);
    return fromMinorUnits(BigInt(text));
}

export default {
    toMoney,
    fromMoney,
    sumMoney,
    addMoney,
    subMoney,
    mulMoney,
    toMoneyFromMinorUnits,
};
