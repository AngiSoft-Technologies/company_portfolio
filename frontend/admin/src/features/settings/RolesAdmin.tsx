import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, EmptyState, Field, PageHeader, Spinner, inputClass } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';
import { useEffectiveAccess } from '@/lib/permissions';

/**
 * Role & Permissions — the admin surface for the canonical registry
 * (plan Phase 1.3, §5.2).
 *
 * The permission list is not hardcoded here: it comes from the registry via
 * `GET /api/roles/catalogue`, so this screen can never drift from the keys the
 * route guards actually enforce. A role created here gates a route immediately
 * because `PUT/POST /api/roles` writes `RolePermission` rows and clears the
 * permission caches.
 */

interface CataloguePermission {
  key: string;
  display: string;
  description: string;
  group: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  order: number;
}

interface CatalogueGroup {
  group: string;
  permissions: CataloguePermission[];
}

interface Role {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  permissions: string[];
  assignmentCount: number;
}

const RISK_TONE: Record<CataloguePermission['risk'], string> = {
  LOW: 'slate',
  MEDIUM: 'amber',
  HIGH: 'red',
};

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeRoles(raw: unknown): Role[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
    .map((r) => {
      const permissions = Array.isArray(r.permissions)
        ? r.permissions
            .map((p) => (p && typeof p === 'object' ? asString((p as Record<string, unknown>).key) : ''))
            .filter(Boolean)
        : [];
      const count = r._count && typeof r._count === 'object'
        ? Number((r._count as Record<string, unknown>).assignments ?? 0)
        : 0;
      return {
        id: asString(r.id),
        key: asString(r.key),
        name: asString(r.name, asString(r.key)),
        description: typeof r.description === 'string' ? r.description : null,
        permissions,
        assignmentCount: Number.isFinite(count) ? count : 0,
      };
    })
    .filter((r) => r.id);
}

function normalizeGroups(raw: unknown): CatalogueGroup[] {
  if (!raw || typeof raw !== 'object') return [];
  const groups = (raw as Record<string, unknown>).groups;
  if (!Array.isArray(groups)) return [];
  return groups
    .filter((g): g is Record<string, unknown> => Boolean(g) && typeof g === 'object')
    .map((g) => ({
      group: asString(g.group),
      permissions: (Array.isArray(g.permissions) ? g.permissions : [])
        .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === 'object')
        .map((p) => ({
          key: asString(p.key),
          display: asString(p.display, asString(p.key)),
          description: asString(p.description),
          group: asString(p.group, asString(g.group)),
          risk: (asString(p.risk, 'LOW') as CataloguePermission['risk']) ?? 'LOW',
          order: Number(p.order ?? 0),
        }))
        .filter((p) => p.key),
    }))
    .filter((g) => g.group);
}

const SLUG_RE = /^[A-Z][A-Z0-9_]*$/;

export function RolesAdmin() {
  const { can } = useEffectiveAccess();
  const canManage = can('administration.roles');

  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<CatalogueGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesJson, catalogueJson] = await Promise.all([
        apiFetch('/api/roles'),
        apiFetch('/api/roles/catalogue'),
      ]);
      const next = normalizeRoles(rolesJson);
      setRoles(next);
      setGroups(normalizeGroups(catalogueJson));
      setError(null);
      return next;
    } catch (e) {
      setError((e as Error).message || 'Failed to load roles');
      setRoles([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectRole = (role: Role) => {
    setCreating(false);
    setSelectedId(role.id);
    setKey(role.key);
    setName(role.name);
    setDescription(role.description ?? '');
    setSelectedKeys(new Set(role.permissions));
    setSaved(false);
    setSaveError(null);
  };

  const startCreate = () => {
    setCreating(true);
    setSelectedId(null);
    setKey('');
    setName('');
    setDescription('');
    setSelectedKeys(new Set());
    setSaved(false);
    setSaveError(null);
  };

  const toggle = (permissionKey: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(permissionKey)) next.delete(permissionKey);
      else next.add(permissionKey);
      return next;
    });
    setSaved(false);
  };

  const toggleGroup = (group: CatalogueGroup, on: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const p of group.permissions) {
        if (on) next.add(p.key);
        else next.delete(p.key);
      }
      return next;
    });
    setSaved(false);
  };

  const save = async () => {
    setSaveError(null);
    setSaved(false);

    if (creating && !SLUG_RE.test(key)) {
      setSaveError('Role key must be upper snake case, e.g. SALES_LEAD.');
      return;
    }

    setSaving(true);
    try {
      const body = {
        ...(creating ? { key } : {}),
        name: name.trim(),
        description: description.trim() || null,
        permissionKeys: [...selectedKeys],
      };
      if (creating) {
        await apiFetch('/api/roles', { method: 'POST', body });
      } else if (selectedId) {
        await apiFetch(`/api/roles/${encodeURIComponent(selectedId)}`, { method: 'PUT', body });
      }
      const next = await load();
      const savedRole = creating
        ? next.find((r) => r.key === key)
        : next.find((r) => r.id === selectedId);
      if (savedRole) selectRole(savedRole);
      setSaved(true);
    } catch (e) {
      setSaveError((e as Error).message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const filteredGroups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter(
          (p) =>
            p.key.toLowerCase().includes(needle) ||
            p.display.toLowerCase().includes(needle) ||
            p.description.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.permissions.length > 0);
  }, [groups, search]);

  const totalPermissions = useMemo(
    () => groups.reduce((sum, g) => sum + g.permissions.length, 0),
    [groups],
  );

  const editing = creating || Boolean(selectedId);

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        subtitle={`Canonical permission registry — ${totalPermissions} keys across ${groups.length} groups.`}
        actions={
          canManage ? (
            <Button onClick={startCreate} variant="outline">
              New role
            </Button>
          ) : undefined
        }
      />

      {!canManage ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You can view roles but not change them: this needs the{' '}
          <code className="font-mono">administration.roles</code> permission.
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">Roles</h2>
          {loading ? (
            <Spinner />
          ) : roles.length === 0 ? (
            <EmptyState title="No roles yet" />
          ) : (
            <ul className="space-y-1">
              {roles.map((role) => (
                <li key={role.id}>
                  <button
                    onClick={() => selectRole(role)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedId === role.id ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <span className="block font-medium">{role.name}</span>
                    <span
                      className={`block text-xs ${
                        selectedId === role.id ? 'text-white/70' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {role.key} · {role.permissions.length} perms
                      {role.assignmentCount ? ` · ${role.assignmentCount} assigned` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          {!editing ? (
            <Card>
              <EmptyState title="Select a role to edit its permissions" />
            </Card>
          ) : (
            <>
              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
                    {creating ? 'New role' : 'Role details'}
                  </h2>
                  {saved ? <Badge tone="green">Saved</Badge> : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Role key">
                    <input
                      className={inputClass}
                      value={key}
                      onChange={(e) => {
                        setKey(e.target.value.toUpperCase());
                        setSaved(false);
                      }}
                      placeholder="SALES_LEAD"
                      disabled={!creating}
                    />
                  </Field>
                  <Field label="Display name">
                    <input
                      className={inputClass}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setSaved(false);
                      }}
                      placeholder="Sales Lead"
                      disabled={!canManage}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Description">
                      <input
                        className={inputClass}
                        value={description}
                        onChange={(e) => {
                          setDescription(e.target.value);
                          setSaved(false);
                        }}
                        placeholder="What this role is responsible for"
                        disabled={!canManage}
                      />
                    </Field>
                  </div>
                </div>

                {saveError ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {saveError}
                  </div>
                ) : null}

                <div className="mt-4 flex items-center gap-3">
                  <Button onClick={() => void save()} disabled={saving || !canManage}>
                    {saving ? 'Saving…' : creating ? 'Create role' : 'Save permissions'}
                  </Button>
                  <Button variant="outline" onClick={startCreate} disabled={!canManage}>
                    Reset to new
                  </Button>
                  <span className="text-xs text-[var(--text-muted)]">
                    {selectedKeys.size} of {totalPermissions} permissions selected
                  </span>
                </div>
              </Card>

              <Card>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-[var(--text-secondary)]">Permissions</h2>
                  <input
                    className={`${inputClass} max-w-xs`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter by key, name or description"
                  />
                </div>

                <div className="space-y-6">
                  {filteredGroups.map((group) => {
                    const allOn = group.permissions.every((p) => selectedKeys.has(p.key));
                    return (
                      <div key={group.group}>
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                            {group.group}
                          </h3>
                          <button
                            onClick={() => toggleGroup(group, !allOn)}
                            disabled={!canManage}
                            className="text-xs text-[var(--color-primary)] hover:underline disabled:opacity-40"
                          >
                            {allOn ? 'Clear group' : 'Select group'}
                          </button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {group.permissions.map((perm) => {
                            const on = selectedKeys.has(perm.key);
                            return (
                              <label
                                key={perm.key}
                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                                  on
                                    ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5'
                                    : 'border-[var(--border)] hover:bg-[var(--bg-primary)]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5"
                                  checked={on}
                                  onChange={() => toggle(perm.key)}
                                  disabled={!canManage}
                                />
                                <span className="min-w-0">
                                  <span className="flex items-center gap-2">
                                    <span className="font-medium text-[var(--text-primary)]">{perm.display}</span>
                                    <Badge tone={RISK_TONE[perm.risk]}>{perm.risk}</Badge>
                                  </span>
                                  <span className="mt-0.5 block font-mono text-[11px] text-[var(--text-muted)]">
                                    {perm.key}
                                  </span>
                                  <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                                    {perm.description}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {filteredGroups.length === 0 ? (
                    <EmptyState title="No permissions match that filter" />
                  ) : null}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default RolesAdmin;
