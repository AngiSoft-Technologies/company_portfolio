import prisma from '../db';
import { deriveAttendanceForDate } from '../modules/identity/services/attendanceDerive';

/**
 * Nightly attendance derivation (DIGITAL_HQ_PLAN — HR automation).
 *
 * Runs the same schedule-aware derivation exposed at
 * POST /v1/attendance/admin/derive for *yesterday* (UTC): company holidays
 * get 'holiday' records and scheduled working days with no check-in get
 * 'absent' records (source 'schedule'). Idempotent — existing records are
 * never touched, and a late check-in flips an auto-'absent' back to
 * 'present' via the check-in endpoint.
 */

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h — re-derives yesterday until stable
const DAY_MS = 24 * 60 * 60 * 1000;

function yesterdayKey(): string {
    return new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);
}

export async function sweepAttendanceDerivation(): Promise<void> {
    const result = await deriveAttendanceForDate(prisma, yesterdayKey());
    if (result.holidayMarked || result.absentCreated) {
        console.log(`attendance derive (${result.workDate}): ${result.holidayMarked} holiday, ${result.absentCreated} absent, ${result.skipped} skipped`);
    }
}

export function startAttendanceDeriveMonitor(): NodeJS.Timeout | null {
    const intervalMs = Number(process.env.ATTENDANCE_DERIVE_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return null;

    const timer = setInterval(() => {
        sweepAttendanceDerivation().catch((err) => console.warn('Attendance derive sweep failed:', err?.message || err));
    }, intervalMs);
    timer.unref?.();
    // Stagger the boot sweep so it doesn't collide with the other monitors.
    const boot = setTimeout(() => {
        sweepAttendanceDerivation().catch((err) => console.warn('Attendance derive boot sweep failed:', err?.message || err));
    }, 120_000);
    boot.unref?.();
    return timer;
}
