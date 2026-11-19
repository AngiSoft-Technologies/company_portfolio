import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAccessToken, apiRequest } from '@angisoft/api-client';

/**
 * Staff sign-in. Styled entirely with the @angisoft/ui theme tokens (CSS
 * custom properties set by ThemeProvider), so it follows the same light/dark
 * surfaces and brand ramp as the rest of the admin shell.
 */
export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Route the login through the shared client so the request gets the
      // absolute API origin, the CSRF double-submit header, and — critically —
      // an `Authorization` header convention identical to every other call.
      const json = (await apiRequest('POST', '/auth/login', {
        email,
        password,
      })) as Record<string, unknown>;

      // Keep the access token in memory. It is never persisted to
      // localStorage; a page reload rehydrates it via the httpOnly refresh
      // cookie. Discarding it here was why every subsequent admin request
      // came back anonymous.
      const accessToken =
        (json.accessToken as string | undefined) ?? (json.token as string | undefined);
      if (accessToken) setAccessToken(accessToken);

      navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error)?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-shadow placeholder:text-[var(--text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--focus-ring)]';

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-lg"
            style={{ background: 'var(--gradient-brand-sweep)' }}
            aria-hidden="true"
          >
            A
          </span>
          <h1
            className="mt-4 text-xl font-semibold"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            AngiSoft Admin
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Sign in to the control center
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border p-6 shadow-md"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--elevation-lg)',
          }}
        >
          {error && (
            <div
              className="mb-4 rounded-lg border px-3 py-2 text-sm"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-error) 30%, transparent)',
                background: 'color-mix(in srgb, var(--color-error) 8%, transparent)',
                color: 'var(--color-error)',
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              className={fieldClass}
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className={fieldClass}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: 'var(--color-primary)' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          AngiSoft Technologies · Staff access only
        </p>
      </div>
    </div>
  );
}

export default AdminLogin;
