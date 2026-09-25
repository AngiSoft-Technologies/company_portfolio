import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card } from '@angisoft/ui';
import { apiPost, setClientAccessToken } from '@angisoft/api-client';

export default function ClientPortalAccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Missing access token. Please request a new portal link.');
      setStatus('error');
      return;
    }
    let mounted = true;
    apiPost<{ accessToken?: string; token?: string; clientToken?: string }>('/client-portal/verify', { token })
      .then((res) => {
        if (!mounted) return;
        const accessToken = res.accessToken ?? res.token ?? res.clientToken ?? '';
        setClientAccessToken(accessToken);
        setStatus('success');
        setTimeout(() => {
          if (mounted) navigate('/portal', { replace: true });
        }, 600);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Link verification failed. Please try again.');
        setStatus('error');
      });
    return () => {
      mounted = false;
    };
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4">
      <Card className="w-full max-w-md p-8 text-center">
        {status === 'verifying' ? (
          <>
            <div className="animate-spin mx-auto h-8 w-8 border-4 border-[#0875FF] border-t-transparent rounded-full" />
            <h1 className="mt-5 text-xl font-bold text-[var(--text-primary)]">Verifying your link…</h1>
          </>
        ) : null}
        {status === 'success' ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-2xl text-emerald-400">
              ✓
            </div>
            <h1 className="mt-5 text-2xl font-bold text-[var(--text-primary)]">Access granted</h1>
            <p className="mt-3 text-sm text-[var(--text-muted)]">Taking you to your dashboard…</p>
          </>
        ) : null}
        {status === 'error' ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-2xl text-red-400">
              !
            </div>
            <h1 className="mt-5 text-2xl font-bold text-[var(--text-primary)]">Link invalid or expired</h1>
            <p className="mt-3 text-sm text-[var(--text-muted)]">{error ?? 'Something went wrong.'}</p>
            <div className="mt-8 flex flex-col gap-3">
              <Link to="/portal/request" className="w-full">
                <Button className="w-full">Request a new link</Button>
              </Link>
              <Link to="/" className="text-sm font-medium text-[#0875FF] hover:underline">
                Back to home
              </Link>
            </div>
          </>
        ) : null}
      </Card>
    </div>
  );
}