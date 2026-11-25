import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { apiRequest, consumePendingMfaSetup, setAccessToken, type MfaSetupPayload } from '@angisoft/api-client';

const CDN_BASE = (
  (import.meta.env as Record<string, string | undefined>).VITE_CDN_BASE_URL ||
  'https://cdn1.angisoft.co.ke/company-portfolio'
).replace(/\/+$/, '');

const BRAND_ASSETS = {
  logo: `${CDN_BASE}/public/images/Logos/AngiSoft_Dark_Background_Logo-removebg.svg`,
  wallpaper: `${CDN_BASE}/public/images/Wallpapers/AngiSoft-Desktop-Wallpaper.png`,
};

type MfaMethod = { type: string; label: string; available: boolean };
type AuthOptionsJSON = Parameters<typeof startAuthentication>[0]['optionsJSON'];
type RegOptionsJSON = Parameters<typeof startRegistration>[0]['optionsJSON'];

type LoginResponse = {
  accessToken?: string;
  token?: string;
  mfaRequired?: boolean;
  loginTicket?: string;
  methods?: MfaMethod[];
  mfaSetupRequired?: boolean;
  setupTicket?: string;
  remember?: boolean;
};

const CODE_METHODS = new Set(['TOTP', 'BACKUP', 'EMAIL', 'SMS', 'WHATSAPP']);

type SetupSession = { accessToken: string; backupCodes: string[]; method: 'TOTP' | 'PASSKEY' };

/**
 * Staff sign-in. Password is factor one; accounts with no factor are forced to
 * enroll TOTP (preferred) or a passkey before any dashboard route is reachable.
 * The wallpaper and logo are official CDN assets; form colours stay themed.
 */
export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [loginTicket, setLoginTicket] = useState('');
  const [methods, setMethods] = useState<MfaMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState('TOTP');
  const [challengeId, setChallengeId] = useState('');
  const [destination, setDestination] = useState('');
  const [code, setCode] = useState('');

  const [setupTicket, setSetupTicket] = useState('');
  const [setupStep, setSetupStep] = useState<'choose' | 'totp' | 'passkey'>('choose');
  const [totpSetup, setTotpSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [passkeyStarted, setPasskeyStarted] = useState(false);
  const [setupSession, setSetupSession] = useState<SetupSession | null>(null);

  const navigate = useNavigate();

  const fieldClass =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-shadow placeholder:text-[var(--text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--focus-ring)]';

  const finishLogin = (json: Record<string, unknown>) => {
    const accessToken = (json.accessToken as string | undefined) ?? (json.token as string | undefined);
    if (accessToken) setAccessToken(accessToken);
    navigate('/', { replace: true });
  };

  const startMfa = async (method: string, ticket = loginTicket) => {
    setSelectedMethod(method);
    setError(null);
    setLoading(true);
    try {
      const result = (await apiRequest('POST', '/auth/mfa/start', {
        loginTicket: ticket,
        method,
      })) as Record<string, unknown>;

      if (method === 'PASSKEY') {
        if (!browserSupportsWebAuthn()) {
          setError('This browser does not support passkeys. Choose another verification method.');
          return;
        }
        const { challengeId: passkeyChallenge, method: _method, ...optionsJSON } = result;
        const passkeyChallengeId = typeof passkeyChallenge === 'string' ? passkeyChallenge : '';
        setChallengeId(passkeyChallengeId);
        const assertion = await startAuthentication({ optionsJSON: optionsJSON as unknown as AuthOptionsJSON });
        const verified = (await apiRequest('POST', '/auth/mfa/verify', {
          loginTicket: ticket,
          method: 'PASSKEY',
          challengeId: passkeyChallengeId,
          assertion,
          remember,
        })) as Record<string, unknown>;
        finishLogin(verified);
        return;
      }

      setChallengeId(typeof result.challengeId === 'string' ? result.challengeId : '');
      setDestination(typeof result.destination === 'string' ? result.destination : '');
      setCode('');
    } catch (err) {
      setError((err as Error)?.message || 'Could not start verification');
    } finally {
      setLoading(false);
    }
  };

  const startTotpSetup = async (ticket: string, rememberChoice: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const result = (await apiRequest('POST', '/auth/mfa/setup/totp/start', {
        setupTicket: ticket,
        remember: rememberChoice,
      })) as { secret: string; otpauthUrl: string };
      setTotpSetup(result);
      setSetupStep('totp');
    } catch (err) {
      setError((err as Error)?.message || 'Could not start authenticator setup');
    } finally {
      setLoading(false);
    }
  };

  const beginSetup = (payload: MfaSetupPayload) => {
    setSetupTicket(payload.setupTicket);
    setRemember(payload.remember);
    setMethods(payload.methods);
    setLoginTicket('');
    setSetupSession(null);
    void startTotpSetup(payload.setupTicket, payload.remember);
  };

  useEffect(() => {
    // A valid refresh cookie for an account without MFA lands here with a
    // one-time setup ticket instead of a dashboard session.
    const pending = consumePendingMfaSetup();
    if (pending) beginSetup(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Same-origin `/v1/*` proxy + CSRF double-submit header via the shared client.
      const json = (await apiRequest('POST', '/auth/login', {
        email,
        password,
        remember,
      })) as LoginResponse;

      if (json.mfaSetupRequired && json.setupTicket) {
        beginSetup({
          setupTicket: json.setupTicket,
          methods: json.methods || [],
          remember: json.remember !== false,
        });
        return;
      }

      if (json.mfaRequired && json.loginTicket) {
        const enrolled = (json.methods || []) as MfaMethod[];
        setLoginTicket(json.loginTicket);
        setMethods(enrolled);
        const preferred =
          enrolled.find((m) => m.type === 'TOTP') ||
          enrolled.find((m) => m.type !== 'BACKUP' && m.type !== 'PASSKEY') ||
          enrolled[0];
        if (!preferred) {
          setError('No verification method is available. Contact your administrator.');
        } else if (preferred.type === 'PASSKEY') {
          // WebAuthn needs a fresh user gesture, so let the user click the
          // passkey button instead of opening the prompt after an await.
          setSelectedMethod('PASSKEY');
        } else {
          await startMfa(preferred.type, json.loginTicket as string);
        }
        return;
      }

      finishLogin(json);
    } catch (err) {
      setError((err as Error)?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!CODE_METHODS.has(selectedMethod)) return;
    if (!code) {
      setError('Enter your verification code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const verified = (await apiRequest('POST', '/auth/mfa/verify', {
        loginTicket,
        method: selectedMethod,
        challengeId: challengeId || undefined,
        code,
        remember,
      })) as Record<string, unknown>;
      finishLogin(verified);
    } catch (err) {
      setError((err as Error)?.message || 'Verification failed');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const confirmTotpSetup = async () => {
    if (!code) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = (await apiRequest('POST', '/auth/mfa/setup/totp/confirm', {
        setupTicket,
        code,
        remember,
      })) as { accessToken: string; backupCodes: string[] };
      if (result.accessToken) setAccessToken(result.accessToken);
      setSetupSession({ accessToken: result.accessToken, backupCodes: result.backupCodes || [], method: 'TOTP' });
    } catch (err) {
      setError((err as Error)?.message || 'Could not verify authenticator code');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const startPasskeySetup = async (linkPhone: boolean) => {
    if (!browserSupportsWebAuthn()) {
      setError('This browser does not support passkeys. Use an authenticator app instead.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const options = (await apiRequest('POST', '/auth/mfa/setup/passkey/options', {
        setupTicket,
        linkPhone,
      })) as Record<string, unknown>;
      setPasskeyStarted(true);
      setSetupStep('passkey');
      const { challengeId: registrationChallenge, ...optionsJSON } = options;
      const registration = await startRegistration({
        optionsJSON: optionsJSON as unknown as RegOptionsJSON,
      });
      const result = (await apiRequest('POST', '/auth/mfa/setup/passkey/verify', {
        setupTicket,
        challengeId: registrationChallenge,
        response: registration,
        remember,
      })) as { accessToken: string; backupCodes: string[] };
      if (result.accessToken) setAccessToken(result.accessToken);
      setSetupSession({ accessToken: result.accessToken, backupCodes: result.backupCodes || [], method: 'PASSKEY' });
    } catch (err) {
      setError((err as Error)?.message || 'Passkey setup failed');
    } finally {
      setLoading(false);
    }
  };

  const codeLabel =
    selectedMethod === 'TOTP'
      ? 'Authenticator code'
      : selectedMethod === 'BACKUP'
        ? 'Backup code'
        : 'Verification code';

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{
        color: 'var(--text-primary)',
        backgroundImage: `linear-gradient(135deg, color-mix(in srgb, var(--bg-primary) 92%, transparent), color-mix(in srgb, var(--color-primary-dark) 62%, transparent)), url(${BRAND_ASSETS.wallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src={BRAND_ASSETS.logo}
            alt="AngiSoft Technologies"
            className="h-14 w-auto object-contain drop-shadow-lg"
          />
          <h1 className="mt-5 text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Admin Control Center
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Sign in to the AngiSoft digital headquarters
          </p>
        </div>

        <form
          onSubmit={loginTicket || setupTicket ? (e) => e.preventDefault() : submit}
          className="rounded-2xl border p-6 shadow-md"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-lg)' }}
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

          {setupSession ? (
            <>
              <h2 className="text-base font-semibold">Security setup complete</h2>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                {setupSession.method === 'TOTP' ? 'Authenticator app' : 'Passkey'} is now active. Save these one-time
                backup codes before continuing.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {setupSession.backupCodes.map((value) => (
                  <code
                    key={value}
                    className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-center text-xs"
                  >
                    {value}
                  </code>
                ))}
              </div>
              <button
                type="button"
                onClick={() => navigate('/', { replace: true })}
                className="mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-[var(--color-white)]"
                style={{ background: 'var(--color-primary)' }}
              >
                I have saved them — continue
              </button>
            </>
          ) : setupTicket ? (
            <>
              <h2 className="text-base font-semibold">Secure your account</h2>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Set up at least one verification factor before accessing the dashboard. Authenticator app is
                recommended; a passkey can use your phone fingerprint or Face ID.
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSetupStep('totp')}
                  className="flex-1 rounded-lg border px-3 py-2 text-xs font-medium"
                  style={{
                    borderColor: setupStep === 'totp' ? 'var(--color-primary)' : 'var(--border)',
                    background:
                      setupStep === 'totp'
                        ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
                        : 'transparent',
                  }}
                >
                  1. Authenticator app
                </button>
                <button
                  type="button"
                  onClick={() => setSetupStep('passkey')}
                  className="flex-1 rounded-lg border px-3 py-2 text-xs font-medium"
                  style={{
                    borderColor: setupStep === 'passkey' ? 'var(--color-primary)' : 'var(--border)',
                    background:
                      setupStep === 'passkey'
                        ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
                        : 'transparent',
                  }}
                >
                  2. Passkey
                </button>
              </div>

              {setupStep === 'totp' && (
                <div className="mt-4">
                  {totpSetup ? (
                    <>
                      <div className="flex justify-center rounded-lg bg-[var(--color-white)] p-3">
                        <QRCodeSVG value={totpSetup.otpauthUrl} size={164} marginSize={2} title="Authenticator QR code" />
                      </div>
                      <p className="mt-2 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                        Scan with your phone authenticator, or enter this secret manually:
                      </p>
                      <code className="mt-1 block break-all rounded bg-[var(--bg-tertiary)] p-2 text-center text-xs">
                        {totpSetup.secret}
                      </code>
                      <label className="mt-4 block">
                        <span className="mb-1 block text-sm font-medium">6-digit code</span>
                        <input
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          placeholder="000000"
                          required
                          className={fieldClass}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={confirmTotpSetup}
                        disabled={loading || !code}
                        className="mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-[var(--color-white)] disabled:opacity-60"
                        style={{ background: 'var(--color-primary)' }}
                      >
                        {loading ? 'Verifying…' : 'Enable authenticator'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startTotpSetup(setupTicket, remember)}
                      disabled={loading}
                      className="mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-[var(--color-white)] disabled:opacity-60"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      {loading ? 'Preparing…' : 'Show QR code'}
                    </button>
                  )}
                </div>
              )}

              {setupStep === 'passkey' && (
                <div className="mt-4">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Use a passkey stored on this device, or link your phone and approve with your fingerprint or Face
                    ID.
                  </p>
                  <button
                    type="button"
                    onClick={() => startPasskeySetup(false)}
                    disabled={loading}
                    className="mt-3 w-full rounded-lg border px-4 py-2.5 text-sm font-medium disabled:opacity-60"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    Use this device
                  </button>
                  <button
                    type="button"
                    onClick={() => startPasskeySetup(true)}
                    disabled={loading}
                    className="mt-2 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-[var(--color-white)] disabled:opacity-60"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    {loading ? 'Waiting for passkey…' : 'Link my phone (fingerprint)'}
                  </button>
                  {passkeyStarted && (
                    <p className="mt-2 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                      Scan the QR code shown by your browser, then approve with your phone biometrics.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : !loginTicket ? (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Email</span>
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
                <span className="mb-1 block text-sm font-medium">Password</span>
                <span className="relative block">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className={`${fieldClass} pr-16`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-2 px-2 text-xs font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </span>
              </label>

              <label className="mt-4 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)]"
                />
                Remember this device for 30 days
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-[var(--color-white)] transition-opacity disabled:opacity-60"
                style={{ background: 'var(--color-primary)' }}
              >
                {loading ? 'Checking…' : 'Continue'}
              </button>
            </>
          ) : (
            <>
              <p className="mb-3 text-sm">Choose a verification method</p>
              <div className="mb-4 flex flex-wrap gap-2">
                {methods.map((method) => (
                  <button
                    key={method.type}
                    type="button"
                    onClick={() => startMfa(method.type)}
                    disabled={!method.available || loading}
                    className="rounded-full border px-3 py-1 text-xs font-medium disabled:opacity-40"
                    style={{
                      borderColor: selectedMethod === method.type ? 'var(--color-primary)' : 'var(--border)',
                      background:
                        selectedMethod === method.type
                          ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
                          : 'transparent',
                    }}
                  >
                    {method.label}
                  </button>
                ))}
              </div>

              {CODE_METHODS.has(selectedMethod) && (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">{codeLabel}</span>
                  <input
                    type="text"
                    inputMode={selectedMethod === 'BACKUP' ? 'text' : 'numeric'}
                    autoComplete={selectedMethod === 'TOTP' ? 'one-time-code' : 'off'}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={selectedMethod === 'BACKUP' ? 'Backup code' : '000000'}
                    required
                    className={fieldClass}
                  />
                  {destination && (
                    <span className="mt-1 block text-xs" style={{ color: 'var(--text-muted)' }}>
                      Sent to {destination}
                    </span>
                  )}
                  {['EMAIL', 'SMS', 'WHATSAPP'].includes(selectedMethod) && (
                    <button
                      type="button"
                      onClick={() => startMfa(selectedMethod)}
                      className="mt-2 text-xs font-medium underline"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      Resend code
                    </button>
                  )}
                </label>
              )}

              {selectedMethod === 'PASSKEY' && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Use a synced phone passkey or your browser's QR prompt, then approve with biometrics.
                  </p>
                  <button
                    type="button"
                    onClick={() => void startMfa('PASSKEY')}
                    disabled={loading}
                    className="mt-3 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-[var(--color-white)] disabled:opacity-60"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    {loading ? 'Waiting for passkey…' : 'Use passkey'}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => void verifyCode()}
                disabled={loading || !CODE_METHODS.has(selectedMethod)}
                className="mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-[var(--color-white)] disabled:opacity-60"
                style={{ background: 'var(--color-primary)' }}
              >
                {loading ? 'Verifying…' : 'Verify and sign in'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginTicket('');
                  setMethods([]);
                  setCode('');
                  setError(null);
                }}
                className="mt-3 w-full text-xs underline"
                style={{ color: 'var(--text-muted)' }}
              >
                Use a different account
              </button>
            </>
          )}
        </form>

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          AngiSoft Technologies · Staff access only
        </p>
      </div>
    </div>
  );
}

export default AdminLogin;
