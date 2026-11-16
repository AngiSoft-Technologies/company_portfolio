import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAccessToken, apiRequest } from '@angisoft/api-client';

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00AFFF] to-[#0875FF] text-xl font-bold text-white">
            A
          </span>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">AngiSoft Admin</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to the control center</p>
        </div>
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0875FF] focus:ring-2 focus:ring-[#0875FF]/20"
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0875FF] focus:ring-2 focus:ring-[#0875FF]/20"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-[#0875FF] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3B9AFF] disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;