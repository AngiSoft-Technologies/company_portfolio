/**
 * Pure SLA rules for the support-ticket monitor — kept DB-free so they can
 * be unit-tested without a database connection.
 */

export const OPEN_TICKET_STATUSES = new Set(['open', 'in_progress', 'pending']);

/** Hours a ticket may sit unresolved before breaching, per priority. */
export function slaHoursTable(): Record<string, number> {
    return {
        urgent: Number(process.env.SLA_HOURS_URGENT ?? 4),
        high: Number(process.env.SLA_HOURS_HIGH ?? 8),
        normal: Number(process.env.SLA_HOURS_NORMAL ?? 24),
        low: Number(process.env.SLA_HOURS_LOW ?? 72),
    };
}

export function slaHoursFor(priority: string | null | undefined): number {
    const table = slaHoursTable();
    return table[String(priority ?? 'normal').toLowerCase()] ?? table.normal;
}

export function isOpenStatus(status: string | null | undefined): boolean {
    return OPEN_TICKET_STATUSES.has(String(status ?? ''));
}

export function slaBreached(createdAt: Date | string, priority: string | null | undefined, now = Date.now()): boolean {
    const ageMs = now - new Date(createdAt).getTime();
    return ageMs >= slaHoursFor(priority) * 3600_000;
}
