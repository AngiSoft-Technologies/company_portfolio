import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ensureClientSession } from '../lib/portalSession';

/**
 * Client route guard. Unlike the shared `ClientProtectedRoute`, this restores
 * a client session through `/v1/client-portal/refresh` (rotating the cookie)
 * instead of the employee refresh endpoint.
 */
export function PortalGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;
    void ensureClientSession().then((ok) => {
      if (!mounted) return;
      setAllowed(ok);
      setChecking(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (checking) return null;
  if (!allowed) return <Navigate to="/portal/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

export default PortalGuard;
