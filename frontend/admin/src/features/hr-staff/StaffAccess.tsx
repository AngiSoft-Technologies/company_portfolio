import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, EmptyState, Field, PageHeader, Spinner, Table, inputClass } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';
import { toArr, type Rec } from '@/lib/records';
import { asStr } from '@/lib/format';

/**
 * Staff Access — per-employee permission and assignment editor.
 *
 * Talks to the real endpoints mounted under `/api/admin`:
 *   GET  /api/admin/employees            — staff list
 *   GET  /api/admin/staff/:id/access     — full access state for one employee
 *   PUT  /api/admin/staff/:id/access     — replace identity, direct permissions, assignments
 *
 * Precedence reminder (see docs/ANGISOFT_DIGITAL_HQ_PLAN.md §5.3):
 *   SYSTEM(60) → DENY(50) → GRANT(40) → ASSIGNMENT(30) → PRESET(20) → ROLE(10)
 * An explicit DENY always wins, including over SUPER_ADMIN.
 */

interface StaffRow {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface PermissionOption {
  key: string;
  display: string;
}

interface AccessState {
  employee: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    departmentId?: string | null;
    positionId?: string | null;
    seniorityLevel?: string | null;
    publicTitle?: string | null;
  };
  departments: Rec[];
  positions: Rec[];
  directPermissions: { key: string; effect: 'GRANT' | 'DENY' }[];
  rolePermissions: string[];
  positionDefaults: string[];
}

type Effect = 'GRANT' | 'DENY' | 'ROLE' | 'POSITION' | 'NONE';

const EFFECT_TONE: Record<Effect, 'green' | 'red' | 'blue' | 'slate'> = {
  GRANT: 'green',
  DENY: 'red',
  ROLE: 'blue',
  POSITION: 'blue',
  NONE: 'slate',
};

interface PermissionRow {
  id: string;
  key: string;
  effect: Effect;
  direct?: 'GRANT' | 'DENY';
  display?: string;
}

/** Reads a string field, treating missing/empty/unknown as the em-dash sentinel. */
function field(rec: Rec | undefined, key: string): string {
  if (!rec) return '';
  const value = asStr(rec, key);
  return value === '—' ? '' : value;
}

function staffName(rec: Rec): string {
  const name = asStr(rec, 'name');
  if (name !== '—') return name;
  const first = asStr(rec, 'firstName');
  const last = asStr(rec, 'lastName');
  const joined = [first, last].filter((v) => v && v !== '—').join(' ').trim();
  return joined || asStr(rec, 'email');
}

export function StaffAccess() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [access, setAccess] = useState<AccessState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [seniorityLevel, setSeniorityLevel] = useState('');
  const [publicTitle, setPublicTitle] = useState('');

  const loadStaff = useCallback(async () => {
    setStaffLoading(true);
    try {
      const json = (await apiFetch('/api/admin/employees')) as unknown;
      setStaff(
        toArr(json).map((r) => ({
          id: field(r, 'id'),
          name: staffName(r),
          email: field(r, 'email'),
          role: field(r, 'role') || undefined,
        })),
      );
    } catch (e) {
      setError((e as Error).message || 'Failed to load staff');
    } finally {
      setStaffLoading(false);
    }
  }, []);

  const loadAccess = useCallback(async (employeeId: string) => {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const json = (await apiFetch(`/api/admin/staff/${encodeURIComponent(employeeId)}/access`)) as AccessState;
      setAccess({
        ...json,
        directPermissions: json.directPermissions ?? [],
        rolePermissions: json.rolePermissions ?? [],
        positionDefaults: json.positionDefaults ?? [],
        departments: toArr(json.departments),
        positions: toArr(json.positions),
      });
      setDepartmentId(json.employee?.departmentId ?? '');
      setPositionId(json.employee?.positionId ?? '');
      setSeniorityLevel(json.employee?.seniorityLevel ?? '');
      setPublicTitle(json.employee?.publicTitle ?? '');
    } catch (e) {
      setError((e as Error).message || 'Failed to load access');
      setAccess(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    if (selectedId) void loadAccess(selectedId);
  }, [selectedId, loadAccess]);

  const effectFor = useCallback(
    (key: string): { effect: Effect; direct?: 'GRANT' | 'DENY' } => {
      if (!access) return { effect: 'NONE' };
      const direct = access.directPermissions.find((d) => d.key === key);
      if (direct) return { effect: direct.effect, direct: direct.effect };
      if (access.rolePermissions.includes(key)) return { effect: 'ROLE' };
      if (access.positionDefaults.includes(key)) return { effect: 'POSITION' };
      return { effect: 'NONE' };
    },
    [access],
  );

  const rows = useMemo<PermissionRow[]>(() => {
    const keys = new Set<string>();
    if (access) {
      for (const d of access.directPermissions) keys.add(d.key);
      for (const k of access.rolePermissions) keys.add(k);
      for (const k of access.positionDefaults) keys.add(k);
    }
    return [...keys]
      .sort()
      .map((key) => {
        const { effect, direct } = effectFor(key);
        return { id: key, key, effect, direct };
      });
  }, [access, effectFor]);

  const toggle = (key: string) => {
    setAccess((prev) => {
      if (!prev) return prev;
      const existing = prev.directPermissions.find((d) => d.key === key);
      let next: { key: string; effect: 'GRANT' | 'DENY' }[];
      if (!existing) {
        // Inherited → the useful action is an explicit DENY.
        next = [...prev.directPermissions, { key, effect: 'DENY' }];
      } else if (existing.effect === 'DENY') {
        next = prev.directPermissions.filter((d) => d.key !== key);
      } else {
        next = prev.directPermissions.map((d) => (d.key === key ? { ...d, effect: 'DENY' as const } : d));
      }
      return { ...prev, directPermissions: next };
    });
    setSaved(false);
  };

  const save = async () => {
    if (!access) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await apiFetch(`/api/admin/staff/${encodeURIComponent(access.employee.id)}/access`, {
        method: 'PUT',
        body: {
          departmentId: departmentId || null,
          positionId: positionId || null,
          seniorityLevel: seniorityLevel || null,
          publicTitle: publicTitle || null,
          directPermissions: access.directPermissions,
          assignmentScopes: { products: [], projects: [], bookings: [], enquiries: [] },
        },
      });
      setSaved(true);
      await loadAccess(access.employee.id);
    } catch (e) {
      setSaveError((e as Error).message || 'Failed to save access');
    } finally {
      setSaving(false);
    }
  };

  const positionsForDepartment = useMemo(() => {
    const all = toArr(access?.positions);
    return departmentId ? all.filter((p) => field(p, 'departmentId') === departmentId) : all;
  }, [access, departmentId]);

  return (
    <div>
      <PageHeader
        title="Staff Access"
        subtitle="Assign departments, positions, and explicit permission grants or denials."
      />

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Team members</h2>
          {staffLoading ? (
            <Spinner />
          ) : staff.length === 0 ? (
            <EmptyState title="No staff found" />
          ) : (
            <ul className="space-y-1">
              {staff.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setSelectedId(s.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedId === s.id ? 'bg-[#0875FF] text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block font-medium">{s.name || s.id}</span>
                    {s.role ? <span className="block text-xs opacity-70">{s.role}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          {!selectedId ? (
            <Card>
              <EmptyState title="Select a team member" />
            </Card>
          ) : loading ? (
            <Card>
              <Spinner />
            </Card>
          ) : access ? (
            <>
              <Card>
                <h2 className="mb-4 text-sm font-semibold text-slate-700">Identity</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Department">
                    <select
                      className={inputClass}
                      value={departmentId}
                      onChange={(e) => {
                        setDepartmentId(e.target.value);
                        setPositionId('');
                        setSaved(false);
                      }}
                    >
                      <option value="">— none —</option>
                      {toArr(access.departments).map((d) => (
                        <option key={field(d, 'id')} value={field(d, 'id')}>
                          {field(d, 'name')}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Position">
                    <select
                      className={inputClass}
                      value={positionId}
                      onChange={(e) => {
                        setPositionId(e.target.value);
                        setSaved(false);
                      }}
                    >
                      <option value="">— none —</option>
                      {positionsForDepartment.map((p) => (
                        <option key={field(p, 'id')} value={field(p, 'id')}>
                          {field(p, 'title')}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Seniority level">
                    <input
                      className={inputClass}
                      value={seniorityLevel}
                      onChange={(e) => {
                        setSeniorityLevel(e.target.value);
                        setSaved(false);
                      }}
                      placeholder="e.g. senior"
                    />
                  </Field>
                  <Field label="Public title">
                    <input
                      className={inputClass}
                      value={publicTitle}
                      onChange={(e) => {
                        setPublicTitle(e.target.value);
                        setSaved(false);
                      }}
                      placeholder="Shown on the public staff profile"
                    />
                  </Field>
                </div>
              </Card>

              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-700">Permissions</h2>
                  {saved ? <Badge tone="green">Saved</Badge> : null}
                </div>
                <p className="mb-4 text-xs text-slate-500">
                  Inherited permissions come from the assigned role and position defaults. Toggling adds an explicit{' '}
                  <strong>DENY</strong>, which always wins — toggle again to remove the override and restore inheritance.
                </p>
                {saveError ? (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saveError}</div>
                ) : null}
                {rows.length === 0 ? (
                  <EmptyState title="No permissions or assignments for this employee" />
                ) : (
                  <Table<PermissionRow>
                    rows={rows}
                    columns={[
                      {
                        key: 'key',
                        header: 'Permission',
                        render: (r) => <span className="font-mono text-xs text-slate-700">{r.key}</span>,
                      },
                      {
                        key: 'effect',
                        header: 'Effective',
                        render: (r) => {
                          const label =
                            r.effect === 'DENY'
                              ? 'DENY (explicit)'
                              : r.effect === 'GRANT'
                                ? 'GRANT (explicit)'
                                : r.effect === 'ROLE'
                                  ? 'Inherited — role'
                                  : r.effect === 'POSITION'
                                    ? 'Inherited — position'
                                    : 'Not granted';
                          return <Badge tone={EFFECT_TONE[r.effect]}>{label}</Badge>;
                        },
                      },
                      {
                        key: 'toggle',
                        header: 'Override',
                        render: (r) => {
                          const isDenied = r.direct === 'DENY';
                          return (
                            <button
                              onClick={() => toggle(r.key)}
                              disabled={saving}
                              className={`rounded px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                                isDenied
                                  ? 'border border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                  : 'border border-red-200 text-red-600 hover:bg-red-50'
                              }`}
                            >
                              {isDenied ? 'Remove deny' : 'Deny'}
                            </button>
                          );
                        },
                      },
                    ]}
                  />
                )}
              </Card>

              <div className="flex items-center gap-3">
                <Button onClick={() => void save()} disabled={saving}>
                  {saving ? 'Saving…' : 'Save access'}
                </Button>
                <Button variant="outline" onClick={() => void loadAccess(access.employee.id)} disabled={loading}>
                  Reset
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default StaffAccess;