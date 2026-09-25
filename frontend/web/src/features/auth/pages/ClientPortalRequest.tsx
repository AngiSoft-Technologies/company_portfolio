import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@angisoft/ui';
import { apiPost } from '@angisoft/api-client';

export default function ClientPortalRequest() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiPost('/client-portal/request', { email, phone });
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
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#0875FF]/10 text-2xl text-[#0875FF]">
            ✓
          </div>
          <h1 className="mt-5 text-2xl font-bold text-[var(--text-primary)]">Check your email/mobile</h1>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            We've sent you a secure portal access link. Open it to sign in to your client portal.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Button onClick={() => setSuccess(false)} variant="ghost">
              Request another link
            </Button>
            <Link to="/" className="text-sm font-medium text-[#0875FF] hover:underline">
              Back to home
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4 py-16">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6">
          <span className="inline-flex items-center rounded-full border border-[#00AFFF]/30 px-3 py-1 text-xs font-medium text-[#0875FF]">
            Client Portal
          </span>
          <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">Request portal access</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Enter your email or phone and we'll text you a magic link to sign in.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#0875FF]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
            Phone
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+254 700 000 000"
              className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#0875FF]"
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button type="submit" disabled={submitting} className="mt-2">
            {submitting ? 'Sending…' : 'Send access link'}
          </Button>
        </form>
        <div className="mt-6 text-center">
          <Link to="/" className="text-sm font-medium text-[#0875FF] hover:underline">
            Back to home
          </Link>
        </div>
      </Card>
    </div>
  );
}