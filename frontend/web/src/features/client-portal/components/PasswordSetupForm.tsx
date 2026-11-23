import { useState, type FormEvent } from 'react';
import { setClientPassword } from '../lib/portalSession';

const fieldClass =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]';

/**
 * Magic-link holders can opt into password login without any admin action.
 * The backend requires an existing client session, so this cannot be used to
 * take over somebody else's account.
 */
export function PasswordSetupForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await setClientPassword(password);
      setPassword('');
      setConfirm('');
      setMessage('Password saved. You can sign in with it next time.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="rounded-xl border border-[var(--border)] p-4">
      <summary className="cursor-pointer text-sm font-semibold text-[var(--text-secondary)]">
        Set or change your portal password
      </summary>
      <form onSubmit={submit} className="mt-4 space-y-3" aria-busy={busy}>
        <p className="text-xs text-[var(--text-muted)]">
          Use a password for faster sign-in, or keep requesting a secure email link — both work.
        </p>
        <label className="block text-xs font-medium text-[var(--text-secondary)]" htmlFor="portal-new-password">
          New password
          <input
            id="portal-new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            className={`${fieldClass} mt-1`}
          />
        </label>
        <label className="block text-xs font-medium text-[var(--text-secondary)]" htmlFor="portal-confirm-password">
          Confirm password
          <input
            id="portal-confirm-password"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            className={`${fieldClass} mt-1`}
          />
        </label>
        <button
          type="submit"
          disabled={busy || !password || !confirm}
          className="rounded-full px-5 py-2 text-sm font-bold text-[var(--color-white)] disabled:opacity-50"
          style={{ background: 'var(--color-primary)' }}
        >
          {busy ? 'Saving…' : 'Save password'}
        </button>
        <div aria-live="polite" className="min-h-5 text-sm">
          {message && <span style={{ color: 'var(--color-success)' }}>{message}</span>}
          {error && <span role="alert" style={{ color: 'var(--color-error)' }}>{error}</span>}
        </div>
      </form>
    </details>
  );
}

export default PasswordSetupForm;
