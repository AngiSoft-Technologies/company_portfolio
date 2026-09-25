import { useState } from 'react';
import { Button, EmptyState, PageHeader, Spinner, Table, Field, inputClass, useCrud, type CrudConfig } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';
import { Modal } from '@/lib/Modal';

export interface AIConfigRow {
  id: string;
  key: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  active?: boolean;
}

const EMPTY_FORM = {
  key: '',
  model: '',
  temperature: '0.7',
  maxTokens: '2048',
  systemPrompt: '',
  active: true,
};

export function AIConfigAdmin() {
  const { rows, loading, error, refresh, remove } = useCrud<AIConfigRow, CrudConfig<AIConfigRow>>({
    endpoint: '/ai-config',
    transform: (data: unknown) => {
      const list = Array.isArray(data)
        ? data
        : (data as Record<string, unknown>)?.data ?? (data as Record<string, unknown>)?.items ?? [];
      return (Array.isArray(list) ? list : []).map((r) => {
        const rec = r as Record<string, unknown>;
        return {
          id: String(rec.id ?? ''),
          key: String(rec.key ?? rec.name ?? ''),
          model: rec.model ? String(rec.model) : undefined,
          temperature: typeof rec.temperature === 'number' ? rec.temperature : Number(rec.temperature ?? NaN),
          maxTokens: typeof rec.maxTokens === 'number' ? rec.maxTokens : Number(rec.maxTokens ?? rec.max_tokens ?? NaN),
          systemPrompt: rec.systemPrompt ? String(rec.systemPrompt) : undefined,
          active: Boolean(rec.active),
        } as AIConfigRow;
      });
    },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AIConfigRow | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setSaveError(null);
    setModalOpen(true);
  };

  const openEdit = (row: AIConfigRow) => {
    setEditing(row);
    setForm({
      key: row.key,
      model: row.model ?? '',
      temperature: row.temperature === undefined ? '0.7' : String(row.temperature),
      maxTokens: row.maxTokens === undefined ? '2048' : String(row.maxTokens),
      systemPrompt: row.systemPrompt ?? '',
      active: Boolean(row.active),
    });
    setSaveError(null);
    setModalOpen(true);
  };

  const set = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const temp = Number(form.temperature);
      const tokens = Number(form.maxTokens);
      const payload = {
        key: form.key,
        model: form.model || undefined,
        temperature: Number.isFinite(temp) ? temp : undefined,
        maxTokens: Number.isFinite(tokens) ? tokens : undefined,
        systemPrompt: form.systemPrompt || undefined,
        active: form.active,
      };
      if (editing) {
        await apiFetch(`/api/ai-config/${encodeURIComponent(editing.id)}`, { method: 'PUT', body: payload });
      } else {
        await apiFetch('/api/ai-config', { method: 'POST', body: payload });
      }
      setModalOpen(false);
      await refresh();
    } catch (e) {
      setSaveError((e as Error).message || 'Failed to save AI config');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="AI Config"
        subtitle="Manage AI assistant model settings."
        actions={<Button onClick={openCreate}>Add config</Button>}
      />

      {loading ? <Spinner /> : null}
      {!loading && error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState title="No AI configurations yet" />
        </div>
      ) : (
        <Table<AIConfigRow>
          rows={rows}
          onEdit={openEdit}
          onDelete={(r) => void remove(r.id)}
          columns={[
            { key: 'key', header: 'Key', render: (r) => <span className="font-medium">{r.key}</span> },
            { key: 'model', header: 'Model', render: (r) => r.model ?? '—' },
            { key: 'temperature', header: 'Temperature', render: (r) => r.temperature ?? '—' },
            { key: 'maxTokens', header: 'Max tokens', render: (r) => r.maxTokens ?? '—' },
            {
              key: 'active',
              header: 'Active',
              render: (r) => (r.active ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Inactive</Badge>),
            },
          ]}
        />
      )}

      {modalOpen ? (
        <Modal
          title={editing ? `Edit: ${editing.key}` : 'New AI config'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving || !form.key}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {saveError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saveError}</div>
            ) : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Key">
                <input className={inputClass} value={form.key} onChange={(e) => set('key', e.target.value)} />
              </Field>
              <Field label="Model">
                <input className={inputClass} value={form.model} onChange={(e) => set('model', e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Temperature">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  className={inputClass}
                  value={form.temperature}
                  onChange={(e) => set('temperature', e.target.value)}
                />
              </Field>
              <Field label="Max tokens">
                <input
                  type="number"
                  min="1"
                  className={inputClass}
                  value={form.maxTokens}
                  onChange={(e) => set('maxTokens', e.target.value)}
                />
              </Field>
            </div>
            <Field label="System prompt">
              <textarea
                className={`${inputClass} min-h-28 resize-y`}
                value={form.systemPrompt}
                onChange={(e) => set('systemPrompt', e.target.value)}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set('active', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Active
            </label>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default AIConfigAdmin;