import { useEffect, useMemo, useState } from 'react';
import { Button, Card, PageHeader, Spinner, inputClass } from '@/components';
import { apiFetch } from '@/lib/adminApi';

type ConfigKind = 'secret' | 'setting';

interface ConfigItem {
  key: string;
  group: string;
  kind: ConfigKind;
  description: string;
  configured: boolean;
  source: 'database' | 'environment' | 'default' | 'unset';
  displayValue: string | null;
  updatedAt: string | null;
}

const SOURCE_LABEL: Record<ConfigItem['source'], string> = {
  database: 'Vault',
  environment: 'Env fallback',
  default: 'Default',
  unset: 'Not set',
};

/**
 * SUPER_ADMIN-only configuration vault. Secrets are write-only: the API
 * returns a masked preview, never the plaintext value.
 */
export default function RuntimeConfigAdmin() {
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kind, setKind] = useState<ConfigKind>('secret');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = (await apiFetch('/admin/config')) as { items?: ConfigItem[] };
      setItems(response.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const groups = useMemo(() => {
    const map = new Map<string, ConfigItem[]>();
    for (const item of items.filter((entry) => entry.kind === kind)) {
      map.set(item.group, [...(map.get(item.group) || []), item]);
    }
    return Array.from(map.entries());
  }, [items, kind]);

  const save = async (item: ConfigItem) => {
    setSaving(true);
    setNotice('');
    try {
      await apiFetch(`/admin/config/${encodeURIComponent(item.key)}`, {
        method: 'PUT',
        body: { value: draft },
      });
      setEditing(null);
      setDraft('');
      setNotice(`${item.key} saved. Changes apply within ~30 seconds across all instances.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not save ${item.key}`);
    } finally {
      setSaving(false);
    }
  };

  const clear = async (item: ConfigItem) => {
    if (!window.confirm(`Remove the stored value for ${item.key}? The environment fallback (if any) will apply.`)) return;
    setSaving(true);
    try {
      await apiFetch(`/admin/config/${encodeURIComponent(item.key)}`, { method: 'DELETE' });
      setNotice(`${item.key} cleared.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not clear ${item.key}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Configuration Vault"
        subtitle="Secrets are encrypted at rest and write-only. Root credentials (DB, JWT, encryption key, S3, Redis) remain in Fly secrets."
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700" role="status">
          {notice}
        </div>
      )}

      <div className="mb-4 flex gap-2" role="tablist" aria-label="Configuration type">
        {(['secret', 'setting'] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={kind === option}
            onClick={() => { setKind(option); setEditing(null); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              kind === option
                ? 'bg-[var(--color-primary)] text-white'
                : 'border border-[var(--border)] text-[var(--text-secondary)]'
            }`}
          >
            {option === 'secret' ? 'Encrypted secrets' : 'Plain settings'}
          </button>
        ))}
      </div>

      {loading ? (
        <Card><Spinner /><p className="text-sm text-[var(--text-muted)]">Loading configuration…</p></Card>
      ) : (
        <div className="space-y-4">
          {groups.map(([group, entries]) => (
            <Card key={group}>
              <h2 className="mb-3 text-base font-semibold">{group}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    <tr>
                      <th className="py-2 pr-3">Key</th>
                      <th className="py-2 pr-3">Purpose</th>
                      <th className="py-2 pr-3">Source</th>
                      <th className="py-2 pr-3">Value</th>
                      <th className="py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((item) => (
                      <tr key={item.key} className="border-t border-[var(--border)] align-top">
                        <td className="py-3 pr-3"><code className="text-xs">{item.key}</code></td>
                        <td className="py-3 pr-3 text-[var(--text-muted)]">{item.description}</td>
                        <td className="py-3 pr-3">
                          <span className="rounded-full bg-[var(--bg-primary)] px-2 py-1 text-xs">
                            {SOURCE_LABEL[item.source]}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          {editing === item.key ? (
                            <input
                              type={item.kind === 'secret' ? 'password' : 'text'}
                              value={draft}
                              autoComplete="off"
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  // IME-safe: Enter can confirm a composition candidate.
                                  // React's synthetic KeyboardEvent type omits isComposing; the DOM event has it.
                                  const composing = ((e.nativeEvent as KeyboardEvent).isComposing) || e.keyCode === 229;
                                  if (composing) return;
                                  if (!saving) void save(item);
                                }
                              }}
                              placeholder={item.kind === 'secret' ? 'Paste new value' : 'Value'}
                              aria-label={`New value for ${item.key}`}
                              className={inputClass}
                            />
                          ) : (
                            <span className={item.configured ? '' : 'text-[var(--text-muted)]'}>
                              {item.kind === 'secret'
                                ? item.configured ? (item.displayValue || 'Configured') : 'Not set'
                                : item.displayValue || 'Not set'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          {editing === item.key ? (
                            <>
                              <Button onClick={() => void save(item)} disabled={saving}>Save</Button>{' '}
                              <Button variant="outline" onClick={() => { setEditing(null); setDraft(''); }} disabled={saving}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="outline" onClick={() => { setEditing(item.key); setDraft(''); }}>
                                {item.kind === 'secret' ? 'Replace' : 'Edit'}
                              </Button>{' '}
                              {item.source === 'database' && (
                                <Button variant="danger" onClick={() => void clear(item)} disabled={saving}>
                                  Clear
                                </Button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-[var(--text-muted)]">
        Secrets are never returned in plaintext. Saving replaces the encrypted row immediately;
        a 30-second refresh propagates the change to other running instances. Use distinct dev and
        production credentials and rotate provider webhook secrets after any exposure.
      </p>
    </div>
  );
}
