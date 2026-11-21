import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card } from '@angisoft/ui';
import { apiPost } from '@angisoft/api-client';
import { CONSENT_VERSION, safeConsentNext, storeConsent } from '@/lib/consent';

/**
 * Client-facing consent gate. Both policies must be ticked explicitly; the
 * acceptance is written to the server audit log before local storage is set.
 */
export default function ClientConsent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [privacy, setPrivacy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = safeConsentNext(searchParams.get('next'));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!privacy || !terms) {
      setError('Please accept both the Privacy Policy and Terms & Conditions.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiPost('/consent', {
        privacy: true,
        terms: true,
        policyVersion: CONSENT_VERSION,
        source: 'web',
      });
      storeConsent();
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record your consent. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4 py-16">
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-6">
          <span className="inline-flex items-center rounded-full border border-[var(--color-secondary)]/30 px-3 py-1 text-xs font-medium text-[var(--color-primary)]">
            Client consent
          </span>
          <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">Before you continue</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            To book a service or access your client portal, please read and explicitly accept our Privacy Policy and
            Terms &amp; Conditions. You can withdraw marketing consent at any time using the contact details in the
            policy.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] p-4">
            <input
              type="checkbox"
              checked={privacy}
              onChange={(event) => setPrivacy(event.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span className="text-sm text-[var(--text-secondary)]">
              I have read and accept the{' '}
              <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--color-primary)] underline">
                Privacy Policy
              </Link>
              , including how AngiSoft collects, uses and protects my information.
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] p-4">
            <input
              type="checkbox"
              checked={terms}
              onChange={(event) => setTerms(event.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span className="text-sm text-[var(--text-secondary)]">
              I have read and accept the{' '}
              <Link to="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--color-primary)] underline">
                Terms &amp; Conditions
              </Link>
              , including the service, payment and cancellation terms.
            </span>
          </label>

          {error ? <p className="text-sm text-red-400" role="alert">{error}</p> : null}

          <Button type="submit" disabled={busy || !privacy || !terms} className="w-full">
            {busy ? 'Saving…' : 'Accept and continue'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          Your acceptance is recorded with a timestamp and policy version for audit purposes.
        </p>
      </Card>
    </div>
  );
}
