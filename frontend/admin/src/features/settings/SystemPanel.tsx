import { useEffect, useState } from 'react';
import { Card, PageHeader, Spinner } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';

interface EnvEntry {
  key: string;
  display: string;
  masked: boolean;
}

const SECRET_PATTERN = /secret|token|password|api[_-]?key|private|credential/i;

function maskEnv(env: Record<string, unknown>): EnvEntry[] {
  return Object.entries(env)
    .filter(([k]) => k.startsWith('VITE_'))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      key,
      display: SECRET_PATTERN.test(key) ? '•••' : String(value),
      masked: SECRET_PATTERN.test(key),
    }));
}

interface HealthData {
  status?: unknown;
  uptime?: unknown;
  db?: unknown;
}

export function SystemPanel() {
  const [health, setHealth] = useState<HealthData>({});
  const [envRows, setEnvRows] = useState<EnvEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      let h: HealthData = {};
      let env: EnvEntry[] = [];
      try {
        const json = ((await apiFetch('/api/health')) ?? {}) as Record<string, unknown>;
        h = {
          status: json.status ?? json.health,
          uptime: json.uptime ?? json.uptimeSeconds,
          db: json.db ?? json.database ?? json.postgres,
        };
      } catch (e) {
        setError((e as Error).message || 'Failed to reach /health');
      }
      const viteEnv = { ...(import.meta.env as Record<string, unknown>) };
      try {
        const json = ((await apiFetch('/api/admin/settings')) ?? {}) as Record<string, unknown>;
        const nested = typeof json.env === 'object' && json.env !== null ? (json.env as Record<string, unknown>) : {};
        env = maskEnv(Object.keys(nested).length > 0 ? { ...viteEnv, ...nested } : viteEnv);
      } catch {
        env = maskEnv(viteEnv);
      }
      if (!cancelled) {
        setHealth(h);
        setEnvRows(env);
        setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const healthRow = (label: string, value: unknown, tone?: string) => (
    <div key={label} className="flex items-center justify-between py-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-medium">
        {tone ? <Badge tone={tone}>{value === undefined || value === null || value === '' ? '—' : String(value)}</Badge> : value === undefined || value === null || value === '' ? '—' : String(value)}
      </dd>
    </div>
  );

  return (
    <div>
      <PageHeader title="System Panel" subtitle="Health, environment and integration status." />
      {loading ? <Spinner /> : null}
      {!loading && error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-base font-semibold">API health</h2>
          <dl className="divide-y divide-slate-100">
            {healthRow('Status', health.status, String(health.status ?? '').toLowerCase().includes('ok') ? 'green' : 'amber')}
            {healthRow('Uptime', health.uptime === undefined ? '—' : `${Number(health.uptime).toFixed(1)}s`)}
            {healthRow('Database', health.db === undefined ? '—' : String(health.db))}
          </dl>
        </Card>

        <Card>
          <h2 className="mb-2 text-base font-semibold">Connections</h2>
          <dl className="divide-y divide-slate-100">
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm text-slate-500">GitHub integration</dt>
              <dd className="text-sm font-medium">
                <Badge tone="slate">Not configured</Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm text-slate-500">Socket.IO realtime</dt>
              <dd className="text-sm font-medium">
                <Badge tone="amber">Placeholder</Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm text-slate-500">Background workers</dt>
              <dd className="text-sm font-medium">
                <Badge tone="slate">Placeholder</Badge>
              </dd>
            </div>
          </dl>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <h2 className="mb-4 text-base font-semibold">Environment (VITE_*)</h2>
            {envRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No VITE_* environment variables exposed.</p>
            ) : (
              <div className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
                {envRows.map((e) => (
                  <div key={e.key} className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-3 py-2">
                    <span className="text-sm font-medium text-slate-700">{e.key}</span>
                    <span className="truncate font-mono text-xs text-slate-500" title={e.masked ? '' : e.display}>
                      {e.display}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default SystemPanel;