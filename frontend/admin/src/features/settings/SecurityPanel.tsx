import { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { browserSupportsWebAuthn, startRegistration } from '@simplewebauthn/browser';
import { Card, PageHeader, Spinner } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';

type Factor = {
  type: 'TOTP' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PASSKEY';
  label: string;
  available: boolean;
};

type EnrolledMethod = {
  id: string;
  type: string;
  label: string | null;
  destination: string | null;
  lastUsedAt: string | null;
};

type MethodsResponse = {
  enrolled: EnrolledMethod[];
  legacyTotp: boolean;
  backupCodesRemaining: number;
  available: Factor[];
};

const OTP_METHODS = new Set(['EMAIL', 'SMS', 'WHATSAPP']);
type RegOptionsJSON = Parameters<typeof startRegistration>[0]['optionsJSON'];

export function SecurityPanel() {
  const [data, setData] = useState<MethodsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [activeMethod, setActiveMethod] = useState<Factor['type'] | null>(null);
  const [totpSetup, setTotpSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [otpChallenge, setOtpChallenge] = useState<{ challengeId: string; destination: string } | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = (await apiFetch('/auth/mfa/methods')) as MethodsResponse;
      setData(json);
    } catch (err) {
      setError((err as Error).message || 'Failed to load MFA settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const post = async <T,>(path: string, body: unknown): Promise<T> =>
    (await apiFetch(path, { method: 'POST', body })) as T;

  const startTotp = async () => {
    setBusy('totp');
    setError(null);
    try {
      const result = await post<{ secret: string; otpauthUrl: string }>('/auth/mfa/totp/start', {});
      setTotpSetup(result);
      setActiveMethod('TOTP');
      setCode('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy('');
    }
  };

  const startOtp = async (method: Factor['type']) => {
    setBusy(method);
    setError(null);
    try {
      const result = await post<{ challengeId: string; destination: string }>('/auth/mfa/otp/start', { method });
      setOtpChallenge({ challengeId: result.challengeId, destination: result.destination });
      setActiveMethod(method);
      setCode('');
      setNotice(`Code sent to ${result.destination}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy('');
    }
  };

  const confirmCode = async () => {
    if (!activeMethod || !code) return;
    setBusy('confirm');
    setError(null);
    try {
      if (activeMethod === 'TOTP') {
        const result = await post<{ backupCodes?: string[] }>('/auth/mfa/totp/confirm', { code });
        setBackupCodes(result.backupCodes || []);
        setNotice('Authenticator app enabled. Save your backup codes now.');
        setTotpSetup(null);
      } else if (OTP_METHODS.has(activeMethod) && otpChallenge) {
        await post<{ ok?: boolean }>('/auth/mfa/otp/confirm', {
          method: activeMethod,
          challengeId: otpChallenge.challengeId,
          code,
        });
        setNotice(`${activeMethod} verification enabled.`);
        setOtpChallenge(null);
      }
      setCode('');
      setActiveMethod(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy('');
    }
  };

  const startPasskey = async (linkPhone = false) => {
    if (!browserSupportsWebAuthn()) {
      setError('This browser does not support passkeys.');
      return;
    }
    setBusy('passkey');
    setError(null);
    try {
      const options = await post<Record<string, unknown>>('/auth/mfa/passkey/options', { linkPhone });
      const { challengeId, ...optionsJSON } = options;
      const response = await startRegistration({
        optionsJSON: optionsJSON as unknown as RegOptionsJSON,
      });
      await post<{ ok?: boolean }>('/auth/mfa/passkey/verify', { challengeId, response });
      setNotice(linkPhone ? 'Phone passkey linked. Approve future sign-ins with your biometrics.' : 'Passkey registered.');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy('');
    }
  };

  const removeMethod = async (method: EnrolledMethod) => {
    setBusy(method.id);
    setError(null);
    try {
      await apiFetch(`/auth/mfa/method/${encodeURIComponent(method.id)}`, { method: 'DELETE' });
      setNotice(`${method.label || method.type} removed.`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy('');
    }
  };

  const regenerateCodes = async () => {
    setBusy('backup');
    setError(null);
    try {
      const result = await post<{ backupCodes?: string[] }>('/auth/mfa/backup-codes/regenerate', {});
      setBackupCodes(result.backupCodes || []);
      setNotice('New backup codes generated. Old codes no longer work.');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy('');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Security & MFA" subtitle="Add and manage verification factors for your account." />

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border p-3 text-sm"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-error) 35%, transparent)',
            background: 'color-mix(in srgb, var(--color-error) 8%, transparent)',
            color: 'var(--color-error)',
          }}
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="mb-4 rounded-lg border p-3 text-sm"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-success) 35%, transparent)',
            background: 'color-mix(in srgb, var(--color-success) 8%, transparent)',
            color: 'var(--color-success)',
          }}
        >
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-base font-semibold">Active factors</h2>
          {!data?.enrolled.length && !data?.legacyTotp ? (
            <p className="text-sm text-[var(--text-muted)]">No MFA factor is enrolled yet. Add one below.</p>
          ) : (
            <ul className="divide-y divide-[var(--border-light)]">
              {data?.legacyTotp && (
                <li className="flex items-center justify-between py-3">
                  <span className="text-sm">Authenticator app (legacy)</span>
                  <Badge tone="amber">Active</Badge>
                </li>
              )}
              {data?.enrolled.map((method) => (
                <li key={method.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">{method.label || method.type}</p>
                    <p className="text-xs text-[var(--text-muted)]">{method.destination || '—'}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy === method.id}
                    onClick={() => removeMethod(method)}
                    className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                  >
                    {busy === method.id ? 'Removing…' : 'Remove'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-[var(--border-light)] pt-4">
            <span className="text-sm text-[var(--text-muted)]">
              {data?.backupCodesRemaining ?? 0} backup codes remaining
            </span>
            <button
              type="button"
              onClick={regenerateCodes}
              disabled={busy === 'backup'}
              className="rounded border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              {busy === 'backup' ? 'Generating…' : 'Regenerate backup codes'}
            </button>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-base font-semibold">Add a factor</h2>
          <div className="space-y-2">
            {data?.available.map((factor) => (
              <div key={factor.type} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-light)] px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{factor.label}</p>
                  {!factor.available && <p className="text-xs text-[var(--text-muted)]">Not configured</p>}
                </div>
                {factor.type === 'PASSKEY' ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!factor.available || !!busy}
                      onClick={() => {
                        setError(null);
                        setNotice(null);
                        void startPasskey(false);
                      }}
                      className="rounded border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                    >
                      This device
                    </button>
                    <button
                      type="button"
                      disabled={!factor.available || !!busy}
                      onClick={() => {
                        setError(null);
                        setNotice(null);
                        void startPasskey(true);
                      }}
                      className="rounded bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-[var(--color-white)] disabled:opacity-50"
                    >
                      {busy === 'passkey' ? 'Waiting…' : 'Phone / fingerprint'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!factor.available || !!busy}
                    onClick={() => {
                      setError(null);
                      setNotice(null);
                      setBackupCodes([]);
                      if (factor.type === 'TOTP') void startTotp();
                      else void startOtp(factor.type);
                    }}
                    className="rounded border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  >
                    {busy === factor.type ? 'Starting…' : 'Add'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {(totpSetup || otpChallenge) && (
          <div className="lg:col-span-2">
            <Card>
              <h2 className="mb-3 text-base font-semibold">Verify to finish setup</h2>
              {totpSetup && (
                <div className="mb-4 flex flex-col items-center gap-2 text-sm sm:flex-row sm:items-start">
                  <div className="rounded-lg bg-[var(--color-white)] p-2">
                    <QRCodeSVG value={totpSetup.otpauthUrl} size={148} marginSize={2} title="Authenticator QR code" />
                  </div>
                  <div className="space-y-2">
                    <p>Scan with your phone authenticator app.</p>
                    <p className="text-xs text-[var(--text-muted)]">Manual secret:</p>
                    <code className="block break-all rounded bg-[var(--bg-tertiary)] p-2 text-xs">{totpSetup.secret}</code>
                  </div>
                </div>
              )}
              {otpChallenge && <p className="mb-3 text-sm">Code sent to {otpChallenge.destination}</p>}
              <div className="flex gap-2">
                <input
                  aria-label={activeMethod === 'TOTP' ? 'Authenticator code' : 'Verification code'}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className="w-40 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={confirmCode}
                  disabled={busy === 'confirm' || !code}
                  className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-white)] disabled:opacity-50"
                >
                  {busy === 'confirm' ? 'Verifying…' : 'Verify'}
                </button>
              </div>
            </Card>
          </div>
        )}

        {backupCodes.length > 0 && (
          <div className="lg:col-span-2">
            <Card>
              <h2 className="mb-2 text-base font-semibold">Save these backup codes</h2>
              <p className="mb-3 text-xs text-[var(--text-muted)]">Each code works once. Store them somewhere safe — they will not be shown again.</p>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {backupCodes.map((value) => (
                  <code key={value} className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-center text-sm">{value}</code>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default SecurityPanel;
