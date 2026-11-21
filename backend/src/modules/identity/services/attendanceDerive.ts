import type { Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';

/**
 * Schedule-aware attendance derivation for a single work date:
 *  - company holiday (non-half-day) → every employee without a record gets
 *    a 'holiday' record (source 'schedule');
 *  - otherwise, employees whose WorkSchedule marks the weekday as a working
 *    day but who have no record → 'absent' (source 'schedule');
 *  - rest days, half-day holidays, and employees without a schedule row are
 *    skipped, as are employees who already have a record for the date.
 *
 * Idempotent: existing records are never overwritten, so it is safe to run
 * repeatedly (admin endpoint and the nightly worker share this).
 */
export async function deriveAttendanceForDate(
    prisma: Db,
    workDate: string,
): Promise<{ workDate: string; holiday: boolean; holidayMarked: number; absentCreated: number; skipped: number }> {
    const dayStart = (d: string) => ts(`${d}T00:00:00.000Z`);
    const weekday = new Date(`${workDate}T00:00:00.000Z`).getUTCDay();

    const holiday = await prisma.orm.public.Holiday
        .where({ date: dayStart(workDate) })
        .first();
    const isHoliday = !!holiday && !(holiday as any).isHalfDay;

    const employees = await prisma.orm.public.Employee.all();
    const schedules = isHoliday ? [] : await prisma.orm.public.WorkSchedule
        .where((s: any) => s.weekday.eq(weekday))
        .all();
    const working = new Map<string, boolean>(
        (schedules as any[]).map((s) => [s.employeeId, !!s.isWorkingDay]),
    );

    let holidayMarked = 0;
    let absentCreated = 0;
    let skipped = 0;
    for (const emp of employees as any[]) {
        const existing = await prisma.orm.public.AttendanceRecord
            .where({ employeeId: emp.id, workDate: dayStart(workDate) })
            .first();
        if (existing) { skipped += 1; continue; }
        if (isHoliday) {
            await prisma.orm.public.AttendanceRecord.create({
                id: newId(),
                employeeId: emp.id,
                workDate: dayStart(workDate),
                status: 'holiday',
                source: 'schedule',
                notes: `Company holiday: ${(holiday as any).name}`,
                updatedAt: ts(),
            });
            holidayMarked += 1;
        } else if (working.get(emp.id) === true) {
            await prisma.orm.public.AttendanceRecord.create({
                id: newId(),
                employeeId: emp.id,
                workDate: dayStart(workDate),
                status: 'absent',
                source: 'schedule',
                notes: 'No attendance recorded on a scheduled working day',
                updatedAt: ts(),
            });
            absentCreated += 1;
        } else {
            skipped += 1;
        }
    }
    return { workDate, holiday: isHoliday, holidayMarked, absentCreated, skipped };
}
