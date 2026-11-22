import { useCallback, useEffect, useState } from 'react';
import { Button, Card, EmptyState, Field, PageHeader, Spinner, Table, inputClass } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';

interface Payslip {
  id: string;
  employeeId: string;
  period: string;
  grossAmount: string | number;
  deductions: Array<{ label: string; amount: number }> | null;
  netAmount: string | number;
  currency: string;
  status: string;
  notes: string | null;
  paidAt: string | null;
  employee?: { id: string; firstName?: string; lastName?: string; email?: string } | null;
}

interface EmployeeOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface PayrollRun {
  id: string;
  period: string;
  name: string | null;
  status: string;
  currency: string;
  payslipCount: number;
  grossTotal: string | number;
  deductionTotal: string | number;
  netTotal: string | number;
  completedAt: string | null;
}

interface RunDetail extends PayrollRun {
  payslips?: Payslip[];
}

interface LineItem {
  label: string;
  amount: number;
  statutory?: boolean;
}

interface SalaryStructure {
  id: string;
  employeeId: string;
  basicSalary: string | number;
  currency: string;
  allowances: LineItem[] | null;
  deductions: LineItem[] | null;
  isActive: boolean;
  employee?: { id: string; firstName?: string; lastName?: string; email?: string } | null;
}

const EMPTY = { employeeId: '', period: '', grossAmount: '', deductions: '', netAmount: '', currency: 'KES', payrollRunId: '', notes: '' };
const EMPTY_RUN = { period: '', name: '', notes: '' };
const EMPTY_STRUCT = { employeeId: '', basicSalary: '', currency: 'KES', allowances: '', deductions: '', isActive: true };

const empName = (e?: { firstName?: string; lastName?: string; email?: string } | null) =>
  e ? [e.firstName, e.lastName].filter(Boolean).join(' ') || e.email || '—' : '—';

const money = (amount: string | number, currency: string) =>
  `${currency} ${Number(amount).toLocaleString()}`;

export function PayrollAdmin() {
  const [rows, setRows] = useState<Payslip[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [structureModal, setStructureModal] = useState(false);
  const [structureForm, setStructureForm] = useState({ ...EMPTY_STRUCT });
  const [editingStructureEmp, setEditingStructureEmp] = useState<string | null>(null);
  const [generatePeriod, setGeneratePeriod] = useState('');
  const [generateRunId, setGenerateRunId] = useState('');
  const [genStatutory, setGenStatutory] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);
  const [previewGross, setPreviewGross] = useState('');
  const [previewLines, setPreviewLines] = useState<LineItem[] | null>(null);
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runForm, setRunForm] = useState({ ...EMPTY_RUN });
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Payslip | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (periodFilter) params.set('period', periodFilter);
      if (employeeFilter) params.set('employeeId', employeeFilter);
      const qs = params.toString();
      const [payslips, payrollRuns, salaryStructures] = await Promise.all([
        apiFetch(`/v1/payroll/admin${qs ? `?${qs}` : ''}`),
        apiFetch('/v1/payroll/runs'),
        apiFetch('/v1/payroll/admin/structures'),
      ]);
      setRows(Array.isArray(payslips) ? payslips : []);
      setRuns(Array.isArray(payrollRuns) ? payrollRuns : []);
      setStructures(Array.isArray(salaryStructures) ? salaryStructures : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payslips');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, periodFilter, employeeFilter]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    apiFetch('/v1/admin/employees')
      .then((data) => {
        const list = Array.isArray(data) ? data : (data as { data?: unknown[] })?.data ?? [];
        setEmployees(Array.isArray(list) ? (list as EmployeeOption[]) : []);
      })
      .catch(() => setEmployees([]));
  }, []);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setModalOpen(true); };
  const openEdit = (r: Payslip) => {
    setEditing(r);
    setForm({
      employeeId: r.employeeId,
      period: r.period,
      grossAmount: String(r.grossAmount),
      deductions: Array.isArray(r.deductions) ? r.deductions.map((d) => `${d.label}: ${d.amount}`).join('\n') : '',
      netAmount: String(r.netAmount),
      currency: r.currency,
      payrollRunId: '',
      notes: r.notes ?? '',
    });
    setModalOpen(true);
  };

  const deductionsPayload = () =>
    form.deductions.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const idx = l.lastIndexOf(':');
      if (idx === -1) return { label: l, amount: 0 };
      return { label: l.slice(0, idx).trim(), amount: Number(l.slice(idx + 1).replace(/[^0-9.]/g, '')) || 0 };
    });

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const deductions = deductionsPayload();
      if (editing) {
        await apiFetch(`/v1/payroll/admin/${editing.id}`, {
          method: 'PUT',
          body: {
            grossAmount: Number(form.grossAmount),
            deductions,
            ...(form.netAmount !== '' ? { netAmount: Number(form.netAmount) } : {}),
            currency: form.currency,
            notes: form.notes || null,
          },
        });
      } else {
        await apiFetch('/v1/payroll/admin', {
          method: 'POST',
          body: {
            employeeId: form.employeeId,
            period: form.period,
            grossAmount: Number(form.grossAmount),
            deductions,
            ...(form.netAmount !== '' ? { netAmount: Number(form.netAmount) } : {}),
            currency: form.currency,
            ...(form.payrollRunId ? { payrollRunId: form.payrollRunId } : {}),
            notes: form.notes || null,
          },
        });
      }
      setModalOpen(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const act = async (id: string, action: string) => {
    setBusy(true);
    try {
      await apiFetch(`/v1/payroll/admin/${id}/${action}`, { method: 'POST' });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setBusy(false);
    }
  };

  const sendPayslip = async (r: Payslip) => {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = (await apiFetch(`/v1/payroll/admin/${r.id}/send`, { method: 'POST' })) as { sentTo: string };
      setNotice(`Payslip emailed to ${res.sentTo}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  };

  const payOut = async (r: Payslip) => {
    const emp = employees.find((e) => e.id === r.employeeId);
    const phone = window.prompt(
      `Pay out ${money(r.netAmount, r.currency)} to ${empName(emp)} via mobile money.\nEnter phone number (leave blank to use the employee's phone on file):`,
      (emp?.phone ?? ''),
    );
    if (phone === null) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = (await apiFetch(`/v1/payroll/admin/${r.id}/pay-out`, {
        method: 'POST',
        body: phone.trim() ? { phone: phone.trim() } : {},
      })) as { reused?: boolean };
      setNotice(res.reused ? 'Payout already exists for this payslip.' : 'Payout initiated — payslip marked paid.');
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payout failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r: Payslip) => {
    if (!window.confirm(`Delete payslip for ${r.period}?`)) return;
    setBusy(true);
    try {
      await apiFetch(`/v1/payroll/admin/${r.id}`, { method: 'DELETE' });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const draftRunsForPeriod = runs.filter((r) => r.status === 'draft' && r.period === form.period);

  const openRunDetail = async (id: string) => {
    try {
      const data = (await apiFetch(`/v1/payroll/runs/${id}`)) as RunDetail;
      setRunDetail(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load run');
    }
  };

  const saveRun = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/v1/payroll/runs', {
        method: 'POST',
        body: { period: runForm.period, name: runForm.name || null, notes: runForm.notes || null },
      });
      setRunModalOpen(false);
      setRunForm({ ...EMPTY_RUN });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create run');
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (id: string, action: 'complete' | 'cancel') => {
    setBusy(true);
    try {
      await apiFetch(`/v1/payroll/runs/${id}/${action}`, { method: 'POST' });
      if (runDetail?.id === id) await openRunDetail(id);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setBusy(false);
    }
  };

  const linesToText = (items: LineItem[] | null) =>
    (Array.isArray(items) ? items : []).map((i) => `${i.label}: ${i.amount}${i.statutory ? ' (statutory)' : ''}`).join('\n');

  const textToLines = (text: string, allowStatutory: boolean): LineItem[] =>
    text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const statutory = allowStatutory && /\(statutory\)\s*$/i.test(l);
      const clean = statutory ? l.replace(/\(statutory\)\s*$/i, '').trim() : l;
      const idx = clean.lastIndexOf(':');
      if (idx === -1) return { label: clean, amount: 0, ...(statutory ? { statutory: true } : {}) };
      return { label: clean.slice(0, idx).trim(), amount: Number(clean.slice(idx + 1).replace(/[^0-9.]/g, '')) || 0, ...(statutory ? { statutory: true } : {}) };
    });

  const openStructure = (s: SalaryStructure | null) => {
    setEditingStructureEmp(s?.employeeId ?? null);
    setStructureForm(s ? {
      employeeId: s.employeeId,
      basicSalary: String(s.basicSalary),
      currency: s.currency,
      allowances: linesToText(s.allowances),
      deductions: linesToText(s.deductions),
      isActive: s.isActive,
    } : { ...EMPTY_STRUCT });
    setStructureModal(true);
  };

  const saveStructure = async () => {
    const employeeId = editingStructureEmp ?? structureForm.employeeId;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/v1/payroll/admin/structures/${encodeURIComponent(employeeId)}`, {
        method: 'PUT',
        body: {
          basicSalary: Number(structureForm.basicSalary),
          currency: structureForm.currency,
          allowances: textToLines(structureForm.allowances, false),
          deductions: textToLines(structureForm.deductions, true),
          isActive: structureForm.isActive,
        },
      });
      setStructureModal(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save salary structure');
    } finally {
      setBusy(false);
    }
  };

  const removeStructure = async (s: SalaryStructure) => {
    if (!window.confirm(`Delete salary structure for ${empName(s.employee)}?`)) return;
    setBusy(true);
    try {
      await apiFetch(`/v1/payroll/admin/structures/${encodeURIComponent(s.employeeId)}`, { method: 'DELETE' });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const runStatutoryPreview = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = (await apiFetch(`/v1/payroll/admin/statutory-preview?gross=${encodeURIComponent(previewGross)}`)) as { deductions: LineItem[] };
      setPreviewLines(data.deductions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview failed');
    } finally {
      setBusy(false);
    }
  };

  const runGenerate = async () => {
    setBusy(true);
    setGenMsg(null);
    setError(null);
    try {
      const res = (await apiFetch('/v1/payroll/admin/generate', {
        method: 'POST',
        body: { period: generatePeriod, ...(generateRunId ? { payrollRunId: generateRunId } : {}), applyStatutory: genStatutory },
      })) as { created: number; skipped: number };
      setGenMsg(`Generated ${res.created} payslip(s); skipped ${res.skipped} existing.`);
      setGeneratePeriod('');
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payroll"
        subtitle="Payslips with draft → approved → paid workflow. Employees see their own payslips."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setRunForm({ ...EMPTY_RUN }); setRunModalOpen(true); }}>New run</Button>
            <Button variant="outline" onClick={() => openStructure(null)}>Salary structure</Button>
            <Button onClick={openCreate}>New payslip</Button>
          </div>
        }
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {notice && <p className="text-sm text-[var(--text-secondary)]">{notice}</p>}

      {runs.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Payroll runs</h2>
          <Table<PayrollRun>
            rows={runs}
            columns={[
              { key: 'period', header: 'Period', render: (r) => r.period },
              { key: 'name', header: 'Name', render: (r) => r.name ?? '—' },
              { key: 'payslips', header: 'Payslips', render: (r) => r.payslipCount },
              { key: 'net', header: 'Net total', render: (r) => money(r.netTotal, r.currency) },
              { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'completed' ? 'green' : r.status === 'cancelled' ? 'red' : 'amber'}>{r.status}</Badge> },
              { key: 'actions', header: '', render: (r) => (
                <div className="flex flex-wrap gap-1.5">
                  <Button variant="outline" onClick={() => void openRunDetail(r.id)}>View</Button>
                  {r.status === 'draft' && <Button variant="outline" disabled={busy} onClick={() => void runAction(r.id, 'complete')}>Complete</Button>}
                  {r.status === 'draft' && <Button variant="danger" disabled={busy} onClick={() => void runAction(r.id, 'cancel')}>Cancel</Button>}
                </div>
              ) },
            ]}
          />
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <h2 className="mr-auto text-sm font-semibold">Salary structures</h2>
          <input className={inputClass + ' w-auto'} type="month" value={generatePeriod} onChange={(e) => setGeneratePeriod(e.target.value)} aria-label="Generate period" />
          <select className={inputClass + ' w-auto'} value={generateRunId} onChange={(e) => setGenerateRunId(e.target.value)} aria-label="Payroll run">
            <option value="">No run</option>
            {runs.filter((r) => r.status === 'draft').map((r) => <option key={r.id} value={r.id}>{r.name ? `${r.name} — ` : ''}{r.period}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <input type="checkbox" checked={genStatutory} onChange={(e) => setGenStatutory(e.target.checked)} />
            Statutory
          </label>
          <Button variant="outline" disabled={busy || !generatePeriod} onClick={() => void runGenerate()}>Generate payslips</Button>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input className={inputClass + ' w-36'} type="number" min="0" placeholder="Gross for preview" value={previewGross} onChange={(e) => setPreviewGross(e.target.value)} aria-label="Statutory preview gross" />
          <Button variant="ghost" disabled={busy || !previewGross} onClick={() => void runStatutoryPreview()}>Preview statutory</Button>
          {previewLines && (
            <span className="text-xs text-[var(--text-muted)]">
              {previewLines.map((l) => `${l.label} ${money(l.amount, 'KES')}`).join(' · ')}
            </span>
          )}
        </div>
        {genMsg && <p className="mb-2 text-xs text-[var(--text-muted)]">{genMsg}</p>}
        {structures.length === 0 ? <EmptyState title="No salary structures" /> : (
          <Table<SalaryStructure>
            rows={structures}
            columns={[
              { key: 'employee', header: 'Employee', render: (s) => empName(s.employee) },
              { key: 'basic', header: 'Basic salary', render: (s) => money(s.basicSalary, s.currency) },
              { key: 'allow', header: 'Allowances', render: (s) => (Array.isArray(s.allowances) ? s.allowances.length : 0) },
              { key: 'ded', header: 'Deductions', render: (s) => (Array.isArray(s.deductions) ? s.deductions.length : 0) },
              { key: 'active', header: 'Status', render: (s) => <Badge tone={s.isActive ? 'success' : 'neutral'}>{s.isActive ? 'active' : 'inactive'}</Badge> },
              { key: 'actions', header: '', render: (s) => (
                <div className="flex flex-wrap gap-1.5">
                  <Button variant="outline" onClick={() => openStructure(s)}>Edit</Button>
                  <Button variant="danger" disabled={busy} onClick={() => void removeStructure(s)}>Delete</Button>
                </div>
              ) },
            ]}
          />
        )}
      </Card>

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          <select className={inputClass + ' w-auto'} value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
            <option value="">All employees</option>
            {employees.map((emp) => <option key={emp.id} value={emp.id}>{[emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.email}</option>)}
          </select>
          <input className={inputClass + ' w-auto'} type="month" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} aria-label="Period" />
          <select className={inputClass + ' w-auto'} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {['draft', 'approved', 'paid'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {loading ? <Spinner /> : rows.length === 0 ? <EmptyState title="No payslips" /> : (
          <Table<Payslip>
            rows={rows}
            columns={[
              { key: 'period', header: 'Period', render: (r) => r.period },
              { key: 'employee', header: 'Employee', render: (r) => empName(r.employee) },
              { key: 'gross', header: 'Gross', render: (r) => money(r.grossAmount, r.currency) },
              { key: 'net', header: 'Net', render: (r) => money(r.netAmount, r.currency) },
              { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'paid' ? 'success' : r.status === 'approved' ? 'accent' : 'neutral'}>{r.status}</Badge> },
              { key: 'actions', header: '', render: (r) => (
                <div className="flex flex-wrap gap-1.5">
                  {r.status === 'draft' && <Button variant="outline" onClick={() => openEdit(r)}>Edit</Button>}
                  {r.status === 'draft' && <Button variant="outline" disabled={busy} onClick={() => void act(r.id, 'approve')}>Approve</Button>}
                  {r.status === 'approved' && <Button variant="outline" disabled={busy} onClick={() => void act(r.id, 'mark-paid')}>Mark paid</Button>}
                  {r.status === 'approved' && <Button variant="outline" disabled={busy} onClick={() => void payOut(r)}>Pay out</Button>}
                  {r.status === 'draft' && <Button variant="danger" disabled={busy} onClick={() => void remove(r)}>Delete</Button>}
                  {r.status !== 'draft' && <Button variant="outline" disabled={busy} onClick={() => void sendPayslip(r)}>Send</Button>}
                </div>
              ) },
            ]}
          />
        )}
      </Card>

      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)} title={editing ? 'Edit payslip' : 'New payslip'} footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void save()} disabled={busy || !form.grossAmount || (!editing && (!form.employeeId || !/^\d{4}-\d{2}$/.test(form.period)))}>{busy ? 'Saving…' : 'Save'}</Button>
          </>
        }>
          <div className="space-y-3">
            {!editing && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Employee">
                  <select className={inputClass} value={form.employeeId} onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))}>
                    <option value="">Select…</option>
                    {employees.map((emp) => <option key={emp.id} value={emp.id}>{[emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.email}</option>)}
                  </select>
                </Field>
                <Field label="Period (YYYY-MM)"><input className={inputClass} placeholder="2026-11" value={form.period} onChange={(e) => setForm((p) => ({ ...p, period: e.target.value }))} /></Field>
              </div>
            )}
            {!editing && draftRunsForPeriod.length > 0 && (
              <Field label="Add to payroll run (optional)">
                <select className={inputClass} value={form.payrollRunId} onChange={(e) => setForm((p) => ({ ...p, payrollRunId: e.target.value }))}>
                  <option value="">No run</option>
                  {draftRunsForPeriod.map((r) => <option key={r.id} value={r.id}>{r.name ? `${r.name} — ` : ''}{r.period}</option>)}
                </select>
              </Field>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Gross amount"><input className={inputClass} type="number" min="0" step="0.01" value={form.grossAmount} onChange={(e) => setForm((p) => ({ ...p, grossAmount: e.target.value }))} /></Field>
              <Field label="Net amount (optional)"><input className={inputClass} type="number" min="0" step="0.01" value={form.netAmount} onChange={(e) => setForm((p) => ({ ...p, netAmount: e.target.value }))} placeholder="auto = gross − deductions" /></Field>
              <Field label="Currency"><input className={inputClass} maxLength={3} value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} /></Field>
            </div>
            <Field label="Deductions (one per line: Label: amount)">
              <textarea className={inputClass} rows={3} value={form.deductions} onChange={(e) => setForm((p) => ({ ...p, deductions: e.target.value }))} placeholder={'PAYE: 30000\nNHIF: 1700'} />
            </Field>
            <Field label="Notes"><textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></Field>
          </div>
        </Modal>
      )}

      {structureModal && (
        <Modal onClose={() => setStructureModal(false)} title={editingStructureEmp ? 'Edit salary structure' : 'New salary structure'} wide footer={
          <>
            <Button variant="ghost" onClick={() => setStructureModal(false)}>Cancel</Button>
            <Button onClick={() => void saveStructure()} disabled={busy || !structureForm.basicSalary || (!editingStructureEmp && !structureForm.employeeId)}>{busy ? 'Saving…' : 'Save'}</Button>
          </>
        }>
          <div className="space-y-3">
            {!editingStructureEmp && (
              <Field label="Employee">
                <select className={inputClass} value={structureForm.employeeId} onChange={(e) => setStructureForm((p) => ({ ...p, employeeId: e.target.value }))}>
                  <option value="">Select…</option>
                  {employees.map((emp) => <option key={emp.id} value={emp.id}>{[emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.email}</option>)}
                </select>
              </Field>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Basic salary (monthly)"><input className={inputClass} type="number" min="0" step="0.01" value={structureForm.basicSalary} onChange={(e) => setStructureForm((p) => ({ ...p, basicSalary: e.target.value }))} /></Field>
              <Field label="Currency"><input className={inputClass} maxLength={3} value={structureForm.currency} onChange={(e) => setStructureForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} /></Field>
            </div>
            <Field label="Allowances (one per line: Label: amount)">
              <textarea className={inputClass} rows={2} value={structureForm.allowances} onChange={(e) => setStructureForm((p) => ({ ...p, allowances: e.target.value }))} placeholder={'Housing: 10000\nTransport: 5000'} />
            </Field>
            <Field label="Deductions (one per line: Label: amount — append (statutory) to flag)">
              <textarea className={inputClass} rows={3} value={structureForm.deductions} onChange={(e) => setStructureForm((p) => ({ ...p, deductions: e.target.value }))} placeholder={'PAYE: 24000 (statutory)\nNSSF: 3600 (statutory)'} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input type="checkbox" checked={structureForm.isActive} onChange={(e) => setStructureForm((p) => ({ ...p, isActive: e.target.checked }))} />
              Active (included in payslip generation)
            </label>
          </div>
        </Modal>
      )}

      {runModalOpen && (
        <Modal onClose={() => setRunModalOpen(false)} title="New payroll run" footer={
          <>
            <Button variant="ghost" onClick={() => setRunModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void saveRun()} disabled={busy || !/^\d{4}-\d{2}$/.test(runForm.period)}>{busy ? 'Saving…' : 'Create run'}</Button>
          </>
        }>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Period (YYYY-MM)"><input className={inputClass} type="month" value={runForm.period} onChange={(e) => setRunForm((p) => ({ ...p, period: e.target.value }))} /></Field>
              <Field label="Name (optional)"><input className={inputClass} value={runForm.name} onChange={(e) => setRunForm((p) => ({ ...p, name: e.target.value }))} placeholder="November 2026 payroll" /></Field>
            </div>
            <Field label="Notes"><textarea className={inputClass} rows={2} value={runForm.notes} onChange={(e) => setRunForm((p) => ({ ...p, notes: e.target.value }))} /></Field>
          </div>
        </Modal>
      )}

      {runDetail && (
        <Modal onClose={() => setRunDetail(null)} title={`Run — ${runDetail.name ?? runDetail.period}`} wide footer={
          runDetail.status === 'draft' ? (
            <>
              <Button variant="ghost" onClick={() => setRunDetail(null)}>Close</Button>
              <Button variant="danger" disabled={busy} onClick={() => void runAction(runDetail.id, 'cancel')}>Cancel run</Button>
              <Button disabled={busy} onClick={() => void runAction(runDetail.id, 'complete')}>Complete run</Button>
            </>
          ) : undefined
        }>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><span className="text-[var(--text-muted)]">Status:</span> <Badge tone={runDetail.status === 'completed' ? 'green' : runDetail.status === 'cancelled' ? 'red' : 'amber'}>{runDetail.status}</Badge></div>
              <div><span className="text-[var(--text-muted)]">Payslips:</span> {runDetail.payslipCount}</div>
              <div><span className="text-[var(--text-muted)]">Gross:</span> {money(runDetail.grossTotal, runDetail.currency)}</div>
              <div><span className="text-[var(--text-muted)]">Net:</span> {money(runDetail.netTotal, runDetail.currency)}</div>
            </div>
            {(runDetail.payslips ?? []).length === 0 ? (
              <EmptyState title="No payslips in this run" />
            ) : (
              <Table<Payslip>
                rows={runDetail.payslips ?? []}
                columns={[
                  { key: 'period', header: 'Period', render: (r) => r.period },
                  { key: 'employee', header: 'Employee', render: (r) => empName(r.employee) },
                  { key: 'gross', header: 'Gross', render: (r) => money(r.grossAmount, r.currency) },
                  { key: 'net', header: 'Net', render: (r) => money(r.netAmount, r.currency) },
                  { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
                ]}
              />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default PayrollAdmin;
