import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ensureSession, getAccessToken, getClientAccessToken } from '@angisoft/api-client';
import type { Role } from '@angisoft/types';

/**
 * AdminProtectedLayout — route guard for the staff/admin area.
 * On mount rehydrates the session via /auth/refresh; redirects to /admin/login
 * when no access token is available.
 */
export function AdminProtectedLayout({ children }: { children: ReactNode }): ReactNode {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    ensureSession().then((ok) => {
      if (!mounted) return;
      setAuthed(ok);
      setChecking(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (checking) return null;

  if (!authed) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

/**
 * ClientProtectedRoute — route guard for the client portal area.
 * Session keyed on the client (magic-link) token; redirects to /portal/request.
 */
export function ClientProtectedRoute({ children }: { children: ReactNode }): ReactNode {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    ensureSession().then((ok) => {
      if (!mounted) return;
      setAuthed(ok);
      setChecking(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (checking) return null;

  if (!authed) {
    return <Navigate to="/portal/request" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

export function hasRole(user: { role?: Role } | null, roles: Role[]): boolean {
  return !!user?.role && roles.includes(user.role);
}

export function canAccess(
  user: { role?: Role } | null,
  required: Role[] = ['ADMIN', 'MARKETING', 'DEVELOPER']
): boolean {
  return hasRole(user, required);
}

export const TOKEN_GETTERS = {
  admin: getAccessToken,
  client: getClientAccessToken,
};

export default AdminProtectedLayout;