/**
 * Kenyan statutory payroll deductions (PAYE, SHIF, NSSF, Housing Levy).
 * Rates/thresholds are env-tunable so they can be updated without a deploy;
 * defaults approximate the 2024/25 schedules. All amounts are monthly KES.
 *
 * PAYE bands are configured via PAYROLL_PAYE_BANDS as a JSON array of
 * [upperBound, rate] pairs applied progressively; PAYROLL_PAYE_RELIEF is a
 * flat monthly tax credit subtracted after band computation.
 */

export interface StatutoryLine {
    label: string;
    amount: number;
    statutory: true;
}

interface PayeBand { upTo: number; rate: number }

const num = (env: string | undefined, fallback: number) => {
    const v = Number(env);
    return Number.isFinite(v) && env !== undefined && env !== '' ? v : fallback;
};

const DEFAULT_PAYE_BANDS: PayeBand[] = [
    { upTo: 24000, rate: 0.10 },
    { upTo: 32333, rate: 0.25 },
    { upTo: 500000, rate: 0.30 },
    { upTo: 800000, rate: 0.325 },
    { upTo: Infinity, rate: 0.35 },
];

function payeBands(): PayeBand[] {
    const raw = process.env.PAYROLL_PAYE_BANDS;
    if (!raw) return DEFAULT_PAYE_BANDS;
    try {
        const parsed = JSON.parse(raw) as Array<[number, number]>;
        if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PAYE_BANDS;
        return parsed.map(([upTo, rate]) => ({ upTo, rate }));
    } catch {
        return DEFAULT_PAYE_BANDS;
    }
}

function progressiveTax(taxable: number, bands: PayeBand[]): number {
    let tax = 0;
    let prev = 0;
    for (const band of bands) {
        if (taxable <= prev) break;
        const slice = Math.min(taxable, band.upTo) - prev;
        if (slice > 0) tax += slice * band.rate;
        prev = band.upTo;
    }
    return tax;
}

/**
 * Compute the standard statutory deduction set for a monthly gross amount.
 * Returns labelled line items compatible with Payslip.deductions.
 */
export function computeStatutoryDeductions(grossAmount: number): StatutoryLine[] {
    const gross = Math.max(0, Number(grossAmount) || 0);
    if (gross <= 0) return [];

    const lines: StatutoryLine[] = [];

    // SHIF (Social Health Insurance Fund; formerly NHIF): % of gross, min/max capped.
    const shifRate = num(process.env.PAYROLL_SHIF_RATE, 0.0275);
    const shifMin = num(process.env.PAYROLL_SHIF_MIN, 300);
    const shifMax = num(process.env.PAYROLL_SHIF_MAX, 9500);
    const shif = Math.min(shifMax, Math.max(shifMin, gross * shifRate));
    if (shif > 0) lines.push({ label: 'SHIF', amount: round2(shif), statutory: true });

    // NSSF: employee contribution rate on pensionable pay up to the UEL.
    const nssfRate = num(process.env.PAYROLL_NSSF_RATE, 0.06);
    const nssfUel = num(process.env.PAYROLL_NSSF_UEL, 108000);
    const nssf = Math.min(gross, nssfUel) * nssfRate;
    if (nssf > 0) lines.push({ label: 'NSSF', amount: round2(nssf), statutory: true });

    // Housing Levy: % of gross (employee share).
    const levyRate = num(process.env.PAYROLL_HOUSING_LEVY_RATE, 0.015);
    const levy = gross * levyRate;
    if (levy > 0) lines.push({ label: 'Housing Levy', amount: round2(levy), statutory: true });

    // PAYE: progressive bands minus monthly relief.
    const relief = num(process.env.PAYROLL_PAYE_RELIEF, 2400);
    const peye = Math.max(0, progressiveTax(gross, payeBands()) - relief);
    if (peye > 0) lines.push({ label: 'PAYE', amount: round2(peye), statutory: true });

    return lines;
}

export function statutoryTotal(lines: StatutoryLine[]): number {
    return lines.reduce((s, l) => s + l.amount, 0);
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}
