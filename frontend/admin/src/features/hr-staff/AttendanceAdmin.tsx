import { useCallback, useEffect, useState } from 'react';
import { Button, Card, EmptyState, Field, PageHeader, Spinner, Table, inputClass } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';

interface AttendanceRow {
  id: string;
  employeeId: string;
  workDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: string;
  source: string;
  notes: string | null;
  employee?: { id: string; firstName?: string; lastName?: string; email?: string } | null;
}

interface EmployeeOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface Holiday {
  id: string;
  date: string;
  name: string;
  isHalfDay: boolean;
}

interface ScheduleRow {
  id: string;
  employeeId: string;
  weekday: number;
  startTime: string | null;
  endTime: string | null;
  isWorkingDay: boolean;
  employee?: { firstName?: string; lastName?: string; email?: string } | null;
}

interface ReportRow {
  id: string;
  employeeId: string;
  employee?: { firstName?: string; lastName?: string; email?: string } | null;
  records: number;
  hoursWorked: number;
  byStatus: Record<string, number>;
}

interface DayDraft {
  startTime: string;
  endTime: string;
  isWorkingDay: boolean;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const STATUSES = ['present', 'absent', 'leave', 'remote', 'holiday'];
const EMPTY = { employeeId: '', workDate: '', checkInAt: '', checkOutAt: '', status: 'present', notes: '' };
const EMPTY_HOLIDAY = { date: '', name: '', isHalfDay: false };

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const day = (iso: string) => new Date(iso).toLocaleDateString();
const empName = (e?: { firstName?: string; lastName?: string; email?: string } | null) =>
  e ? [e.firstName, e.lastName].filter(Boolean).join(' ') || e.email || '—' : '—';

export function AttendanceAdmin() {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [selfMsg, setSelfMsg] = useState<string | null>(null);

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidayForm, setHolidayForm] = useState({ ...EMPTY_HOLIDAY });
  const [holidayModal, setHolidayModal] = useState(false);

  const [scheduleEmp, setScheduleEmp] = useState('');
  const [scheduleDays, setScheduleDays] = useState<Record<number, DayDraft>>({});
  const [scheduleModal, setScheduleModal] = useState(false);

  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportRows, setReportRows] = useState<ReportRow[] | null>(null);

  const [importModal, setImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<string | null>(null);

  const [deriveDate, setDeriveDate] = useState('');
  const [deriveMsg, setDeriveMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (employeeFilter) params.set('employeeId', employeeFilter);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      const [attendance, holidayRows] = await Promise.all([
        apiFetch(`/api/attendance/admin${qs ? `?${qs}` : ''}`),
        apiFetch('/api/attendance/admin/holidays'),
      ]);
      setRows(Array.isArray(attendance) ? attendance : []);
      setHolidays(Array.isArray(holidayRows) ? holidayRows : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [employeeFilter, from, to]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    apiFetch('/api/admin/employees')
      .then((data) => {
        const list = Array.isArray(data) ? data : (data as { data?: unknown[] })?.data ?? [];
        setEmployees(Array.isArray(list) ? (list as EmployeeOption[]) : []);
      })
      .catch(() => setEmployees([]));
  }, []);

  const selfCheck = async (action: 'check-in' | 'check-out') => {
    setBusy(true);
    setSelfMsg(null);
    try {
      await apiFetch(`/api/attendance/${action}`, { method: 'POST' });
      setSelfMsg(action === 'check-in' ? 'Checked in.' : 'Checked out.');
      void load();
    } catch (e) {
      setSelfMsg(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/attendance/admin', {
        method: 'POST',
        body: {
          employeeId: form.employeeId,
          workDate: form.workDate,
          checkInAt: form.checkInAt || null,
          checkOutAt: form.checkOutAt || null,
          status: form.status,
          notes: form.notes || null,
        },
      });
      setModalOpen(false);
      setForm({ ...EMPTY });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r: AttendanceRow) => {
    if (!window.confirm('Delete this attendance record?')) return;
    setBusy(true);
    try {
      await apiFetch(`/api/attendance/admin/${r.id}`, { method: 'DELETE' });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const saveHoliday = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/attendance/admin/holidays', {
        method: 'POST',
        body: { date: holidayForm.date, name: holidayForm.name, isHalfDay: holidayForm.isHalfDay },
      });
      setHolidayModal(false);
      setHolidayForm({ ...EMPTY_HOLIDAY });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save holiday');
    } finally {
      setBusy(false);
    }
  };

  const deleteHoliday = async (h: Holiday) => {
    if (!window.confirm(`Delete holiday "${h.name}"?`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/attendance/admin/holidays/${h.id}`, { method: 'DELETE' });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const openSchedule = async () => {
    if (!scheduleEmp) return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/attendance/admin/schedules?employeeId=${encodeURIComponent(scheduleEmp)}`);
      const days: Record<number, DayDraft> = {};
      for (let i = 0; i < 7; i++) days[i] = { startTime: '', endTime: '', isWorkingDay: false };
      for (const row of (Array.isArray(data) ? data : []) as ScheduleRow[]) {
        days[row.weekday] = {
          startTime: row.startTime ?? '',
          endTime: row.endTime ?? '',
          isWorkingDay: row.isWorkingDay,
        };
      }
      setScheduleDays(days);
      setScheduleModal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load schedule');
    } finally {
      setBusy(false);
    }
  };

  const loadReport = async () => {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (reportFrom) params.set('from', reportFrom);
      if (reportTo) params.set('to', reportTo);
      if (employeeFilter) params.set('employeeId', employeeFilter);
      const qs = params.toString();
      const data = await apiFetch(`/api/attendance/admin/report${qs ? `?${qs}` : ''}`);
      const list = (data as { employees?: Omit<ReportRow, 'id'>[] })?.employees ?? [];
      setReportRows(list.map((r) => ({ ...r, id: r.employeeId })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report');
    } finally {
      setBusy(false);
    }
  };

  // Accepts JSON array of row objects, or CSV lines:
  //   employee (id or email), workDate, status, checkInAt, checkOutAt, notes
  const parseImport = (): unknown[] | null => {
    const text = importText.trim();
    if (!text) return null;
    if (text.startsWith('[')) {
      try { return JSON.parse(text) as unknown[]; } catch { return null; }
    }
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const rows: unknown[] = [];
    for (const line of lines) {
      const cols = line.split(',').map((c) => c.trim());
      if (cols.length < 2) continue;
      const [who, workDate, status, checkInAt, checkOutAt, ...rest] = cols;
      const row: Record<string, string> = { workDate };
      if (who.includes('@')) row.employeeEmail = who; else row.employeeId = who;
      if (status) row.status = status;
      if (checkInAt) row.checkInAt = checkInAt;
      if (checkOutAt) row.checkOutAt = checkOutAt;
      if (rest.length) row.notes = rest.join(',');
      rows.push(row);
    }
    return rows.length ? rows : null;
  };

  const runImport = async () => {
    const rows = parseImport();
    if (!rows) {
      setImportResult('Nothing to import — paste a JSON array or CSV lines.');
      return;
    }
    setBusy(true);
    setImportResult(null);
    setError(null);
    try {
      const res = (await apiFetch('/api/attendance/admin/import', {
        method: 'POST',
        body: { rows },
      })) as { created: number; updated: number; errors: Array<{ row: number; error: string }> };
      setImportResult(
        `Imported: ${res.created} created, ${res.updated} updated` +
        (res.errors.length ? `, ${res.errors.length} row error(s): ${res.errors.slice(0, 3).map((e) => `row ${e.row}`).join(', ')}${res.errors.length > 3 ? '…' : ''}` : ''),
      );
      void load();
    } catch (e) {
      setImportResult(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const runDerive = async () => {
    setBusy(true);
    setDeriveMsg(null);
    setError(null);
    try {
      const res = (await apiFetch('/api/attendance/admin/derive', {
        method: 'POST',
        body: deriveDate ? { workDate: deriveDate } : {},
      })) as { workDate: string; holiday: boolean; holidayMarked: number; absentCreated: number; skipped: number };
      setDeriveMsg(
        `${res.workDate}: ${res.holiday ? `${res.holidayMarked} holiday record(s)` : `${res.absentCreated} absent record(s)`} created, ${res.skipped} skipped.`,
      );
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Derivation failed');
    } finally {
      setBusy(false);
    }
  };

  const saveSchedule = async () => {
    setBusy(true);
    setError(null);
    try {
      const days = Object.entries(scheduleDays).map(([weekday, d]) => ({
        weekday: Number(weekday),
        startTime: d.startTime || null,
        endTime: d.endTime || null,
        isWorkingDay: d.isWorkingDay,
      }));
      await apiFetch(`/api/attendance/admin/schedules/${encodeURIComponent(scheduleEmp)}`, {
        method: 'PUT',
        body: { days },
      });
      setScheduleModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save schedule');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Attendance"
        subtitle="Staff check-in/out records. Self-service check-in/out is available to all staff."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={() => void selfCheck('check-in')}>Check in</Button>
            <Button variant="outline" disabled={busy} onClick={() => void selfCheck('check-out')}>Check out</Button>
            <Button variant="outline" onClick={() => { setImportText(''); setImportResult(null); setImportModal(true); }}>Import</Button>
            <Button onClick={() => setModalOpen(true)}>Add record</Button>
          </div>
        }
      />
      {selfMsg && <p className="text-sm text-[var(--text-secondary)]">{selfMsg}</p>}
      {deriveMsg && <p className="text-sm text-[var(--text-secondary)]">{deriveMsg}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Card className="p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          <select className={inputClass + ' w-auto'} value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
            <option value="">All employees</option>
            {employees.map((emp) => <option key={emp.id} value={emp.id}>{[emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.email}</option>)}
          </select>
          <input className={inputClass + ' w-auto'} type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
          <input className={inputClass + ' w-auto'} type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
          <span className="mx-1 h-5 w-px bg-[var(--border)]" />
          <input className={inputClass + ' w-auto'} type="date" value={deriveDate} onChange={(e) => setDeriveDate(e.target.value)} aria-label="Derive date" />
          <span title="Create holiday/absent records from schedules"><Button variant="outline" disabled={busy} onClick={() => void runDerive()}>Derive</Button></span>
        </div>
        {loading ? <Spinner /> : rows.length === 0 ? <EmptyState title="No attendance records" /> : (
          <Table<AttendanceRow>
            rows={rows}
            columns={[
              { key: 'workDate', header: 'Date', render: (r) => day(r.workDate) },
              { key: 'employee', header: 'Employee', render: (r) => empName(r.employee) },
              { key: 'checkInAt', header: 'In', render: (r) => fmt(r.checkInAt) },
              { key: 'checkOutAt', header: 'Out', render: (r) => fmt(r.checkOutAt) },
              { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'present' ? 'success' : 'neutral'}>{r.status}</Badge> },
              { key: 'notes', header: 'Notes', render: (r) => <span className="line-clamp-1 max-w-40 text-xs">{r.notes ?? '—'}</span> },
              { key: 'actions', header: '', render: (r) => (
                <Button variant="danger" disabled={busy} onClick={() => void remove(r)}>Delete</Button>
              ) },
            ]}
          />
        )}
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Company holidays</h2>
          <Button variant="outline" onClick={() => { setHolidayForm({ ...EMPTY_HOLIDAY }); setHolidayModal(true); }}>Add holiday</Button>
        </div>
        {holidays.length === 0 ? <EmptyState title="No holidays configured" /> : (
          <Table<Holiday>
            rows={holidays}
            columns={[
              { key: 'date', header: 'Date', render: (h) => day(h.date) },
              { key: 'name', header: 'Name', render: (h) => h.name },
              { key: 'half', header: 'Type', render: (h) => (h.isHalfDay ? 'Half day' : 'Full day') },
              { key: 'actions', header: '', render: (h) => (
                <Button variant="danger" disabled={busy} onClick={() => void deleteHoliday(h)}>Delete</Button>
              ) },
            ]}
          />
        )}
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <h2 className="mr-auto text-sm font-semibold">Work schedules</h2>
          <select className={inputClass + ' w-auto'} value={scheduleEmp} onChange={(e) => setScheduleEmp(e.target.value)}>
            <option value="">Select employee…</option>
            {employees.map((emp) => <option key={emp.id} value={emp.id}>{[emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.email}</option>)}
          </select>
          <Button variant="outline" disabled={!scheduleEmp || busy} onClick={() => void openSchedule()}>Edit schedule</Button>
        </div>
        <p className="text-xs text-[var(--text-muted)]">Weekly schedule per employee — working days with optional start/end times; unmarked days are rest days.</p>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <h2 className="mr-auto text-sm font-semibold">Attendance report</h2>
          <input className={inputClass + ' w-auto'} type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} aria-label="Report from" />
          <input className={inputClass + ' w-auto'} type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} aria-label="Report to" />
          <Button variant="outline" disabled={busy} onClick={() => void loadReport()}>Run report</Button>
        </div>
        {reportRows === null ? (
          <p className="text-xs text-[var(--text-muted)]">Pick a date range and run the report to see per-employee totals.</p>
        ) : reportRows.length === 0 ? <EmptyState title="No attendance records in range" /> : (
          <Table<ReportRow>
            rows={reportRows}
            columns={[
              { key: 'employee', header: 'Employee', render: (r) => empName(r.employee) },
              { key: 'records', header: 'Records', render: (r) => r.records },
              { key: 'hours', header: 'Hours worked', render: (r) => r.hoursWorked },
              { key: 'status', header: 'By status', render: (r) => STATUSES.filter((s) => r.byStatus[s]).map((s) => `${s}: ${r.byStatus[s]}`).join(' · ') || '—' },
            ]}
          />
        )}
      </Card>

      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)} title="Add attendance record" footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void save()} disabled={busy || !form.employeeId || !form.workDate}>{busy ? 'Saving…' : 'Save'}</Button>
          </>
        }>
          <div className="space-y-3">
            <Field label="Employee">
              <select className={inputClass} value={form.employeeId} onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))}>
                <option value="">Select…</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{[emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.email}</option>)}
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date"><input className={inputClass} type="date" value={form.workDate} onChange={(e) => setForm((p) => ({ ...p, workDate: e.target.value }))} /></Field>
              <Field label="Status">
                <select className={inputClass} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Check-in at"><input className={inputClass} type="datetime-local" value={form.checkInAt} onChange={(e) => setForm((p) => ({ ...p, checkInAt: e.target.value }))} /></Field>
              <Field label="Check-out at"><input className={inputClass} type="datetime-local" value={form.checkOutAt} onChange={(e) => setForm((p) => ({ ...p, checkOutAt: e.target.value }))} /></Field>
            </div>
            <Field label="Notes"><textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></Field>
          </div>
        </Modal>
      )}

      {importModal && (
        <Modal onClose={() => setImportModal(false)} title="Import attendance" wide footer={
          <>
            <Button variant="ghost" onClick={() => setImportModal(false)}>Close</Button>
            <Button onClick={() => void runImport()} disabled={busy}>{busy ? 'Importing…' : 'Import'}</Button>
          </>
        }>
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-muted)]">
              Paste a JSON array of row objects, or CSV lines — one per row:
              <code className="mx-1">employee (id or email), workDate (YYYY-MM-DD), status, checkInAt, checkOutAt, notes</code>.
              Existing records for the same employee + date are updated; new ones are created with source <em>import</em>. Max 500 rows.
            </p>
            <textarea
              className={inputClass}
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={'ada@x.co, 2026-11-10, present, 2026-11-10T08:00:00.000Z, 2026-11-10T17:00:00.000Z\nemp_123, 2026-11-11, remote'}
            />
            {importResult && <p className="text-sm text-[var(--text-secondary)]">{importResult}</p>}
          </div>
        </Modal>
      )}

      {holidayModal && (
        <Modal onClose={() => setHolidayModal(false)} title="Add holiday" footer={
          <>
            <Button variant="ghost" onClick={() => setHolidayModal(false)}>Cancel</Button>
            <Button onClick={() => void saveHoliday()} disabled={busy || !holidayForm.date || !holidayForm.name}>{busy ? 'Saving…' : 'Save'}</Button>
          </>
        }>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date"><input className={inputClass} type="date" value={holidayForm.date} onChange={(e) => setHolidayForm((p) => ({ ...p, date: e.target.value }))} /></Field>
              <Field label="Name"><input className={inputClass} value={holidayForm.name} onChange={(e) => setHolidayForm((p) => ({ ...p, name: e.target.value }))} placeholder="Christmas Day" /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input type="checkbox" checked={holidayForm.isHalfDay} onChange={(e) => setHolidayForm((p) => ({ ...p, isHalfDay: e.target.checked }))} />
              Half day
            </label>
          </div>
        </Modal>
      )}

      {scheduleModal && (
        <Modal onClose={() => setScheduleModal(false)} title="Weekly schedule" wide footer={
          <>
            <Button variant="ghost" onClick={() => setScheduleModal(false)}>Cancel</Button>
            <Button onClick={() => void saveSchedule()} disabled={busy}>{busy ? 'Saving…' : 'Save schedule'}</Button>
          </>
        }>
          <div className="space-y-2">
            {WEEKDAYS.map((name, i) => {
              const d = scheduleDays[i] ?? { startTime: '', endTime: '', isWorkingDay: false };
              return (
                <div key={i} className="grid grid-cols-[110px_1fr_1fr_auto] items-center gap-2 text-sm">
                  <span className="font-medium">{name}</span>
                  <input
                    className={inputClass}
                    type="time"
                    value={d.startTime}
                    disabled={!d.isWorkingDay}
                    onChange={(e) => setScheduleDays((p) => ({ ...p, [i]: { ...d, startTime: e.target.value } }))}
                    aria-label={`${name} start`}
                  />
                  <input
                    className={inputClass}
                    type="time"
                    value={d.endTime}
                    disabled={!d.isWorkingDay}
                    onChange={(e) => setScheduleDays((p) => ({ ...p, [i]: { ...d, endTime: e.target.value } }))}
                    aria-label={`${name} end`}
                  />
                  <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <input
                      type="checkbox"
                      checked={d.isWorkingDay}
                      onChange={(e) => setScheduleDays((p) => ({ ...p, [i]: { ...d, isWorkingDay: e.target.checked } }))}
                    />
                    working
                  </label>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default AttendanceAdmin;
