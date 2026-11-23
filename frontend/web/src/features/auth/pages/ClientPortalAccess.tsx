import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, LoadingIndicator, VisualState } from '@angisoft/ui';
import { loginWithMagicToken } from '@/features/client-portal/lib/portalSession';

export default function ClientPortalAccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      return;
    }
    let mounted = true;
    loginWithMagicToken(token)
      .then(() => {
        if (!mounted) return;
        setStatus('success');
        setTimeout(() => {
          if (mounted) navigate('/portal', { replace: true });
        }, 600);
      })
      .catch(() => {
        if (mounted) setStatus('error');
      });
    return () => {
      mounted = false;
    };
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4">
      <Card className="w-full max-w-md p-8 text-center">
        {status === 'verifying' && <LoadingIndicator variant="orbit" size="lg" />}
        {status === 'success' && (
          <>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]" role="status">Access granted</h1>
            <p className="mt-3 text-sm text-[var(--text-muted)]">Taking you to your dashboard…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <VisualState variant="error" />
            <p className="mt-4 text-sm text-[var(--text-muted)]" role="alert">
              This link is invalid or has expired.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link to="/portal/request" className="w-full">
                <Button className="w-full">Request a new link</Button>
              </Link>
              <Link to="/portal/login" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
                Sign in with a password instead
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
