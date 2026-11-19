import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, EmptyState, Field, PageHeader, Spinner, inputClass } from '@/components';
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
  description?: string;
  group?: string;
  risk?: string;
}

interface AssignmentScopes {
  products: string[];
  projects: string[];
  bookings: string[];
  enquiries: string[];
}

const NO_SCOPES: AssignmentScopes = { products: [], projects: [], bookings: [], enquiries: [] };

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
  /** Product / project / booking / enquiry ids this employee is assigned to. */
  assignmentScopes: AssignmentScopes;
  /** Canonical registry catalogue, so the editor can grant new permissions. */
  catalogs?: PermissionOption[];
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
  group?: string;
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

function inheritedNote(rows: PermissionRow[]): string {
  const grants = rows.filter((r) => r.direct === 'GRANT').length;
  const denies = rows.filter((r) => r.direct === 'DENY').length;
  if (!grants && !denies) {
    return 'No explicit overrides — every permission is inherited from role and position.';
  }
  return `${grants} explicit grant(s), ${denies} explicit denial(s). Everything else is inherited.`;
}

/**
 * The API returns the access state in two halves — `current` (what is stored)
 * and `effective` (what the resolver computes from it). Older builds returned a
 * flat payload, so both shapes are accepted here; reading only one of them is
 * what left the permission list empty.
 */
interface RawAccess {
  employee?: AccessState['employee'];
  departments?: unknown;
  positions?: unknown;
  presets?: unknown;
  catalogs?: AccessState['catalogs'];
  current?: {
    identity?: Partial<{
      departmentId: string | null;
      positionId: string | null;
      seniorityLevel: string | null;
      publicTitle: string | null;
    }>;
    directPermissions?: AccessState['directPermissions'];
    rolePermissions?: string[];
    presetPermissions?: string[];
    assignmentScopes?: Partial<AssignmentScopes>;
  };
  // Flat shape (kept for compatibility).
  directPermissions?: AccessState['directPermissions'];
  rolePermissions?: string[];
  positionDefaults?: string[];
}

function flattenAccess(raw: RawAccess): AccessState {
  const current = raw.current;
  const scopes = (current?.assignmentScopes ?? {}) as Partial<AssignmentScopes>;
  return {
    employee: {
      id: raw.employee?.id ?? '',
      firstName: raw.employee?.firstName,
      lastName: raw.employee?.lastName,
      email: raw.employee?.email,
      role: raw.employee?.role,
      departmentId: current?.identity?.departmentId ?? raw.employee?.departmentId ?? null,
      positionId: current?.identity?.positionId ?? raw.employee?.positionId ?? null,
      seniorityLevel: current?.identity?.seniorityLevel ?? raw.employee?.seniorityLevel ?? null,
      publicTitle: current?.identity?.publicTitle ?? raw.employee?.publicTitle ?? null,
    },
    departments: toArr(raw.departments),
    positions: toArr(raw.positions),
    directPermissions: current?.directPermissions ?? raw.directPermissions ?? [],
    rolePermissions: current?.rolePermissions ?? raw.rolePermissions ?? [],
    // The API calls it `presetPermissions`; the UI has always called the same
    // thing `positionDefaults` (they are the position's default keys).
    positionDefaults: current?.presetPermissions ?? raw.positionDefaults ?? [],
    assignmentScopes: {
      products: scopes.products ?? [],
      projects: scopes.projects ?? [],
      bookings: scopes.bookings ?? [],
      enquiries: scopes.enquiries ?? [],
    },
    catalogs: raw.catalogs ?? [],
  };
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
  const [permFilter, setPermFilter] = useState('');

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
      const raw = (await apiFetch(`/api/admin/staff/${encodeURIComponent(employeeId)}/access`)) as RawAccess;
      const next = flattenAccess(raw);
      setAccess(next);
      setDepartmentId(next.employee.departmentId ?? '');
      setPositionId(next.employee.positionId ?? '');
      setSeniorityLevel(next.employee.seniorityLevel ?? '');
      setPublicTitle(next.employee.publicTitle ?? '');
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
    const meta = new Map<string, { display?: string; group?: string }>();
    for (const c of access?.catalogs ?? []) meta.set(c.key, { display: c.display, group: c.group });

    // Keys that exist on the employee but not in the registry are surfaced too,
    // so a retired/legacy grant cannot hide from the administrator.
    const extra = new Set<string>();
    if (access) {
      for (const d of access.directPermissions) if (!meta.has(d.key)) extra.add(d.key);
      for (const k of access.rolePermissions) if (!meta.has(k)) extra.add(k);
      for (const k of access.positionDefaults) if (!meta.has(k)) extra.add(k);
    }

    return [...meta.keys(), ...[...extra].sort()].map((key) => {
      const { effect, direct } = effectFor(key);
      const m = meta.get(key);
      return { id: key, key, effect, direct, display: m?.display, group: m?.group };
    });
  }, [access, effectFor]);

  const filteredRows = useMemo(() => {
    const needle = permFilter.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.key.toLowerCase().includes(needle) ||
        (r.display ?? '').toLowerCase().includes(needle) ||
        (r.group ?? '').toLowerCase().includes(needle),
    );
  }, [rows, permFilter]);

  const groupedRows = useMemo(() => {
    const groups = new Map<string, PermissionRow[]>();
    for (const row of filteredRows) {
      const group = row.group ?? 'Other';
      const bucket = groups.get(group);
      if (bucket) bucket.push(row);
      else groups.set(group, [row]);
    }
    return [...groups.entries()];
  }, [filteredRows]);

  /** Set an explicit override, or clear it to restore inheritance. */
  const setDirect = (key: string, effect: 'GRANT' | 'DENY' | null) => {
    setAccess((prev) => {
      if (!prev) return prev;
      const rest = prev.directPermissions.filter((d) => d.key !== key);
      return {
        ...prev,
        directPermissions: effect ? [...rest, { key, effect }] : rest,
      };
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
          // Send back what was loaded: the PUT replaces these rows, so an empty
          // default here would silently unassign the employee from everything.
          assignmentScopes: access.assignmentScopes,
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
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">Team members</h2>
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
                      selectedId === s.id ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
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
                <h2 className="mb-4 text-sm font-semibold text-[var(--text-secondary)]">Identity</h2>
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
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--text-secondary)]">Assignments</h2>
                  <Badge tone="slate">Preserved on save</Badge>
                </div>
                <p className="mb-3 text-xs text-[var(--text-muted)]">
                  Scoped work this employee is attached to. Saving this screen replaces
                  direct permissions and identity only — these assignments are written
                  back unchanged, so nothing is unassigned by accident.
                </p>
                <div className="grid gap-2 sm:grid-cols-4">
                  {(
                    [
                      ['Products', access.assignmentScopes.products],
                      ['Projects', access.assignmentScopes.projects],
                      ['Bookings', access.assignmentScopes.bookings],
                      ['Enquiries', access.assignmentScopes.enquiries],
                    ] as const
                  ).map(([label, ids]) => (
                    <div key={label} className="rounded-lg border border-[var(--border)] px-3 py-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        {label}
                      </div>
                      <div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{ids.length}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-[var(--text-secondary)]">Permissions</h2>
                  <div className="flex items-center gap-3">
                    {saved ? <Badge tone="green">Saved</Badge> : null}
                    <input
                      className={`${inputClass} max-w-xs`}
                      value={permFilter}
                      onChange={(e) => setPermFilter(e.target.value)}
                      placeholder="Filter permissions"
                      disabled={saving}
                    />
                  </div>
                </div>
                <p className="mb-4 text-xs text-[var(--text-muted)]">
                  <strong>Inherit</strong> uses the role and position defaults. <strong>Grant</strong> adds an explicit
                  grant for this employee only. <strong>Deny</strong> always wins — even over SUPER_ADMIN.
                </p>
                {saveError ? (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saveError}</div>
                ) : null}
                {rows.length === 0 ? (
                  <EmptyState title="No permissions in the registry" />
                ) : (
                  <div className="space-y-6">
                    {groupedRows.map(([group, groupRows]) => (
                      <div key={group}>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                          {group}
                        </h3>
                        <div className="divide-y divide-[var(--border-light)] rounded-lg border border-[var(--border)]">
                          {groupRows.map((r) => {
                            return (
                              <div
                                key={r.key}
                                className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <div className="text-sm text-[var(--text-primary)]">{r.display ?? r.key}</div>
                                  <div className="font-mono text-[11px] text-[var(--text-muted)]">{r.key}</div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Badge tone={EFFECT_TONE[r.effect]}>
                                    {r.effect === 'DENY'
                                      ? 'DENY'
                                      : r.effect === 'GRANT'
                                        ? 'GRANT · explicit'
                                        : r.effect === 'ROLE'
                                          ? 'role'
                                          : r.effect === 'POSITION'
                                            ? 'position'
                                            : 'not granted'}
                                  </Badge>

                                  <div className="flex overflow-hidden rounded-md border border-[var(--border)] text-xs">
                                    <button
                                      onClick={() => setDirect(r.key, null)}
                                      disabled={saving}
                                      className={`px-2 py-1 disabled:opacity-50 ${
                                        !r.direct ? 'bg-[var(--surface-hover)] font-medium text-[var(--text-secondary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-primary)]'
                                      }`}
                                      title="Use inherited permissions"
                                    >
                                      Inherit
                                    </button>
                                    <button
                                      onClick={() => setDirect(r.key, 'GRANT')}
                                      disabled={saving}
                                      className={`border-l border-[var(--border)] px-2 py-1 disabled:opacity-50 ${
                                        r.direct === 'GRANT'
                                          ? 'bg-emerald-100 font-medium text-emerald-700'
                                          : 'text-[var(--text-muted)] hover:bg-[var(--bg-primary)]'
                                      }`}
                                      title="Grant explicitly to this employee"
                                    >
                                      Grant
                                    </button>
                                    <button
                                      onClick={() => setDirect(r.key, 'DENY')}
                                      disabled={saving}
                                      className={`border-l border-[var(--border)] px-2 py-1 disabled:opacity-50 ${
                                        r.direct === 'DENY'
                                          ? 'bg-red-100 font-medium text-red-700'
                                          : 'text-[var(--text-muted)] hover:bg-[var(--bg-primary)]'
                                      }`}
                                      title="Deny this employee explicitly"
                                    >
                                      Deny
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {groupedRows.length === 0 ? (
                      <EmptyState title="No permissions match that filter" />
                    ) : null}
                  </div>
                )}
                <p className="mt-4 text-[11px] text-[var(--text-muted)]">
                  {inheritedNote(rows)}
                </p>
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