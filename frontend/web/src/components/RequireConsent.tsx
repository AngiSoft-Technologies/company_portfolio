import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasAcceptedConsent } from '@/lib/consent';

/**
 * Gates client-facing actions that create a record or grant portal access.
 * The acceptance page records the audit event and returns the user here.
 */
export function RequireConsent({ children }: { children: ReactNode }) {
  const location = useLocation();
  if (hasAcceptedConsent()) return <>{children}</>;

  const destination = `${location.pathname}${location.search}`;
  return <Navigate to={`/consent?next=${encodeURIComponent(destination)}`} replace />;
}

export default RequireConsent;
