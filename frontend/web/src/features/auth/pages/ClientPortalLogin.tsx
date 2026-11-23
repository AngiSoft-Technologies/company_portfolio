import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Card } from '@angisoft/ui';
import { loginWithPassword } from '@/features/client-portal/lib/portalSession';

const fieldClass =
  'h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]';

/** Password sign-in for clients. Magic-link access stays available alongside it. */
export default function ClientPortalLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/portal';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await loginWithPassword(email, password, remember);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4 py-16">
      <Card className="w-full max-w-md p-8">
        <span className="inline-flex items-center rounded-full border border-[var(--color-secondary)] px-3 py-1 text-xs font-medium text-[var(--color-primary)]">
          Client Portal
        </span>
        <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">Sign in to your portal</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Track projects, invoices and bookings — and share feedback with our team.
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4" aria-busy={submitting}>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-secondary)]" htmlFor="portal-email">
            Email
            <input
              id="portal-email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className={fieldClass}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-secondary)]" htmlFor="portal-password">
            Password
            <span className="relative block">
              <input
                id="portal-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`${fieldClass} pr-16`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-2 px-2 text-xs font-medium text-[var(--text-muted)]"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            Remember this device
          </label>

          <div aria-live="polite" className="min-h-5 text-sm">
            {error && <span role="alert" style={{ color: 'var(--color-error)' }}>{error}</span>}
          </div>

          <Button type="submit" disabled={submitting} className="mt-1">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-6 space-y-2 border-t border-[var(--border)] pt-5 text-center text-sm">
          <p>
            <Link to="/portal/request" className="font-medium text-[var(--color-primary)] hover:underline">
              Use a secure email link instead
            </Link>
          </p>
          <Link to="/" className="text-[var(--text-muted)] hover:underline">
            Back to home
          </Link>
        </div>
      </Card>
    </div>
  );
}
