import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@angisoft/ui';
import { requestClientMagicLink } from '@/features/client-portal/lib/portalSession';

const fieldClass =
  'h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]';

export default function ClientPortalRequest() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await requestClientMagicLink(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Check your email</h1>
          <p className="mt-3 text-sm text-[var(--text-muted)]" role="status">
            We sent a secure link to {email}. Open it within 30 minutes to sign in.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Button onClick={() => setSuccess(false)} variant="ghost">Request another link</Button>
            <Link to="/portal/login" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
              Sign in with a password instead
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4 py-16">
      <Card className="w-full max-w-md p-8">
        <span className="inline-flex items-center rounded-full border border-[var(--color-secondary)] px-3 py-1 text-xs font-medium text-[var(--color-primary)]">
          Client Portal
        </span>
        <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">Request portal access</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Enter your email and we&apos;ll send you a private sign-in link.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" aria-busy={submitting}>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-secondary)]" htmlFor="portal-request-email">
            Email
            <input
              id="portal-request-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className={fieldClass}
            />
          </label>
          <div aria-live="polite" className="min-h-5 text-sm">
            {error && <span role="alert" style={{ color: 'var(--color-error)' }}>{error}</span>}
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send access link'}
          </Button>
        </form>
        <div className="mt-6 text-center text-sm">
          <Link to="/portal/login" className="font-medium text-[var(--color-primary)] hover:underline">
            Already have a password? Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}
