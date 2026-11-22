import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch } from '@/lib/adminApi';

/**
 * Effective-access provider (plan §8, Phase 1.5).
 *
 * One call to `/v1/staff-dashboard/effective-access` gives the admin shell the
 * authoritative answer to "what may this person see and do?". Navigation, route
 * visibility and action buttons all read from here instead of hardcoding roles
 * — which is what kept un-migrated roles locked out (plan §12).
 *
 * `can()` is deliberately **deny-only authoritative**: it returns `false` only
 * when the server positively says DENY. While the payload is loading, or if the
 * call fails, it returns `true` so the shell does not blank itself out; the
 * backend still enforces every request, so this can never leak data.
 */

export type PermissionSource = 'SYSTEM' | 'DENY' | 'GRANT' | 'ASSIGNMENT' | 'PRESET' | 'ROLE';

export interface EffectivePermission {
  key: string;
  effect: 'GRANT' | 'DENY';
  source: PermissionSource;
  assignedScope?: { type: string; id: string };
}

export interface AssignmentCounts {
  products: number;
  projects: number;
  bookings: number;
  enquiries: number;
  publications: number;
}

export interface EffectiveAccess {
  version: 1;
  employeeId: string;
  systemRole: string;
  departmentId?: string;
  positionId?: string;
  permissions: EffectivePermission[];
  assignmentCounts: AssignmentCounts;
  widgets: string[];
  preferences: { theme: string; layout: string };
}

interface EffectiveAccessState {
  access: EffectiveAccess | null;
  loading: boolean;
  error: string | null;
  /** Positive grant, wildcard grant, or unknown (optimistic while loading). */
  can: (permission: string) => boolean;
  /** An explicit DENY, regardless of any grant or role. */
  denied: (permission: string) => boolean;
  isSuperAdmin: boolean;
  refresh: () => Promise<void>;
}

const EMPTY_COUNTS: AssignmentCounts = {
  products: 0,
  projects: 0,
  bookings: 0,
  enquiries: 0,
  publications: 0,
};

const EffectiveAccessContext = createContext<EffectiveAccessState>({
  access: null,
  loading: true,
  error: null,
  can: () => true,
  denied: () => false,
  isSuperAdmin: false,
  refresh: async () => undefined,
});

export function EffectiveAccessProvider({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<EffectiveAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const json = (await apiFetch('/v1/staff-dashboard/effective-access')) as EffectiveAccess;
      setAccess({
        ...json,
        permissions: json?.permissions ?? [],
        assignmentCounts: { ...EMPTY_COUNTS, ...(json?.assignmentCounts ?? {}) },
        widgets: json?.widgets ?? [],
        preferences: json?.preferences ?? { theme: 'system', layout: 'default' },
      });
      setError(null);
    } catch (e) {
      setError((e as Error).message || 'Failed to load effective access');
      setAccess(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<EffectiveAccessState>(() => {
    const byKey = new Map<string, EffectivePermission>();
    for (const perm of access?.permissions ?? []) byKey.set(perm.key, perm);

    const isSuperAdmin =
      access?.systemRole === 'SUPER_ADMIN' || byKey.get('*')?.effect === 'GRANT';

    const denied = (permission: string) => byKey.get(permission)?.effect === 'DENY';

    const can = (permission: string) => {
      if (!access) return true; // optimistic while loading / unavailable
      if (denied(permission)) return false; // DENY always wins
      if (isSuperAdmin) return true;
      return byKey.get(permission)?.effect === 'GRANT';
    };

    return { access, loading, error, can, denied, isSuperAdmin, refresh };
  }, [access, loading, error, refresh]);

  return (
    <EffectiveAccessContext.Provider value={value}>{children}</EffectiveAccessContext.Provider>
  );
}

export function useEffectiveAccess(): EffectiveAccessState {
  return useContext(EffectiveAccessContext);
}

/** Convenience hook when a component only needs the predicate. */
export function useCan(): (permission: string) => boolean {
  return useContext(EffectiveAccessContext).can;
}
