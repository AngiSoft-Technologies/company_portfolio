import { useEffect, useState } from 'react';
import { toast } from '@angisoft/utils';
import {
  Button,
  EmptyState,
  Field,
  PageHeader,
  Spinner,
  Table,
  inputClass,
} from '@/components';
import { Modal } from '@/lib/Modal';
import { formatDate } from '@/lib/format';
import { useCan } from '@/lib/permissions';
import { createRecord, deleteRecord, fetchOptions, updateRecord, usePipelineResource } from './api';
import { FilterTabs, FormGrid, Money, StageBadge } from './shared';
import {
  OPPORTUNITY_FLOW,
  OPPORTUNITY_STAGES,
  type LeadOption,
  type Opportunity,
} from './types';

const STAGE_LABELS: Record<string, string> = {
  all: 'All',
  new: 'New',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

interface FormState {
  title: string;
  leadId: string;
  clientId: string;
  stage: string;
  value: string;
  currency: string;
  probability: string;
  expectedCloseDate: string;
  source: string;
  lostReason: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  leadId: '',
  clientId: '',
  stage: 'new',
  value: '',
  currency: 'KES',
  probability: '',
  expectedCloseDate: '',
  source: '',
  lostReason: '',
  notes: '',
};

function toDateInput(value?: string | null): string {
  return value ? String(value).slice(0, 10) : '';
}

function formFromOpportunity(o: Opportunity): FormState {
  return {
    title: o.title ?? '',
    leadId: o.leadId ?? '',
    clientId: o.clientId ?? '',
    stage: o.stage ?? 'new',
    value: o.value != null ? String(o.value) : '',
    currency: o.currency ?? 'KES',
    probability: o.probability != null ? String(o.probability) : '',
    expectedCloseDate: toDateInput(o.expectedCloseDate),
    source: o.source ?? '',
    lostReason: o.lostReason ?? '',
    notes: o.notes ?? '',
  };
}

function buildPayload(f: FormState, editing: Opportunity | null) {
  const body: Record<string, unknown> = {
    title: f.title.trim(),
    stage: f.stage,
    currency: f.currency || 'KES',
    notes: f.notes || null,
    source: f.source || null,
    lostReason: f.lostReason || null,
  };
  body.leadId = f.leadId || null;
  body.clientId = f.clientId || null;
  body.value = f.value === '' ? null : Number(f.value);
  body.probability = f.probability === '' ? undefined : Number(f.probability);
  body.expectedCloseDate = f.expectedCloseDate || null;
  if (editing) {
    // Only send fields the update endpoint accepts; stage legality is enforced server-side.
    return body;
  }
  return body;
}

export function OpportunitiesAdmin() {
  const can = useCan();
  const [stageFilter, setStageFilter] = useState('all');
  const { rows, loading, error, refresh } = usePipelineResource<Opportunity>('/opportunities', {
    stage: stageFilter === 'all' ? undefined : stageFilter,
  });
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; row: Opportunity } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchOptions<LeadOption>('/leads').then(setLeads);
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal({ mode: 'create' });
  };

  const openEdit = (row: Opportunity) => {
    setForm(formFromOpportunity(row));
    setModal({ mode: 'edit', row });
  };

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (form.stage === 'lost' && !form.lostReason.trim() && modal?.mode === 'create') {
      toast.error('A lost reason is required when creating a lost opportunity');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload(form, modal?.mode === 'edit' ? modal.row : null);
      if (modal?.mode === 'edit') {
        await updateRecord('/opportunities', modal.row.id, payload);
        toast.success('Opportunity updated');
      } else {
        await createRecord('/opportunities', payload);
        toast.success('Opportunity created');
      }
      setModal(null);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Opportunity) => {
    if (!window.confirm(`Delete opportunity "${row.title}"?`)) return;
    try {
      await deleteRecord('/opportunities', row.id);
      toast.success('Opportunity deleted');
      await refresh();
    } catch (e) {
      toast.error((e as Error).message || 'Delete failed');
    }
  };

  const stageOptions =
    modal?.mode === 'edit'
      ? [modal.row.stage, ...(OPPORTUNITY_FLOW[modal.row.stage] ?? [])].filter(
          (v, i, a) => a.indexOf(v) === i,
        )
      : [...OPPORTUNITY_STAGES];

  return (
    <div>
      <PageHeader
        title="Opportunities"
        subtitle="Sales pipeline — track deals from new to won or lost."
        actions={
          can('opportunities.create') ? (
            <Button onClick={openCreate}>+ New opportunity</Button>
          ) : undefined
        }
      />

      <FilterTabs
        value={stageFilter}
        onChange={setStageFilter}
        options={['all', ...OPPORTUNITY_STAGES].map((s) => ({
          value: s,
          label: s === 'all' ? 'All' : STAGE_LABELS[s],
        }))}
      />

      {loading ? <Spinner /> : null}
      {!loading && error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}
      {!loading && !error && rows.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <EmptyState title="No opportunities yet" />
        </div>
      ) : null}
      {!loading && rows.length > 0 ? (
        <Table<Opportunity>
          rows={rows}
          onEdit={can('opportunities.update') ? openEdit : undefined}
          columns={[
            {
              key: 'title',
              header: 'Opportunity',
              render: (r) => (
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">{r.publicReference ?? r.id.slice(0, 8)}</div>
                </div>
              ),
            },
            { key: 'stage', header: 'Stage', render: (r) => <StageBadge value={r.stage} /> },
            {
              key: 'value',
              header: 'Value',
              render: (r) => <Money value={r.value} currency={r.currency} />,
            },
            {
              key: 'probability',
              header: 'Probability',
              render: (r) => (r.probability != null ? `${r.probability}%` : '—'),
            },
            {
              key: 'expectedCloseDate',
              header: 'Expected close',
              render: (r) => formatDate(r.expectedCloseDate),
            },
            { key: 'source', header: 'Source', render: (r) => r.source ?? '—' },
            { key: 'createdAt', header: 'Created', render: (r) => formatDate(r.createdAt) },
          ]}
        />
      ) : null}

      {modal ? (
        <Modal
          title={modal.mode === 'create' ? 'New opportunity' : `Edit ${modal.row.title}`}
          onClose={() => setModal(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {modal.mode === 'edit' ? (
              <div>
                <span className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Current stage</span>
                <div className="flex items-center gap-2">
                  <StageBadge value={modal.row.stage} />
                  <span className="text-xs text-[var(--text-muted)]">
                    Legal next stages: {(OPPORTUNITY_FLOW[modal.row.stage] ?? []).join(', ') || 'none (terminal)'}
                  </span>
                </div>
              </div>
            ) : null}

            <FormGrid>
              <Field label="Title">
                <input className={inputClass} value={form.title} onChange={(e) => set({ title: e.target.value })} />
              </Field>
              <Field label="Stage">
                <select className={inputClass} value={form.stage} onChange={(e) => set({ stage: e.target.value })}>
                  {stageOptions.map((s) => (
                    <option key={s} value={s}>{STAGE_LABELS[s] ?? s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Value">
                <input className={inputClass} type="number" min={0} step="0.01" value={form.value} onChange={(e) => set({ value: e.target.value })} />
              </Field>
              <Field label="Currency">
                <input className={inputClass} value={form.currency} onChange={(e) => set({ currency: e.target.value })} />
              </Field>
              <Field label="Probability (%)">
                <input className={inputClass} type="number" min={0} max={100} value={form.probability} onChange={(e) => set({ probability: e.target.value })} />
              </Field>
              <Field label="Expected close date">
                <input className={inputClass} type="date" value={form.expectedCloseDate} onChange={(e) => set({ expectedCloseDate: e.target.value })} />
              </Field>
              <Field label="Source">
                <input className={inputClass} value={form.source} onChange={(e) => set({ source: e.target.value })} placeholder="e.g. referral, website" />
              </Field>
              <Field label="Lead">
                <select className={inputClass} value={form.leadId} onChange={(e) => set({ leadId: e.target.value })}>
                  <option value="">— None —</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>{l.name ?? l.email ?? l.id.slice(0, 8)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Client ID (optional)">
                <input className={inputClass} value={form.clientId} onChange={(e) => set({ clientId: e.target.value })} />
              </Field>
            </FormGrid>

            {form.stage === 'lost' ? (
              <Field label="Lost reason">
                <input className={inputClass} value={form.lostReason} onChange={(e) => set({ lostReason: e.target.value })} placeholder="Why was this lost?" />
              </Field>
            ) : null}

            <Field label="Notes">
              <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
            </Field>

            {modal.mode === 'edit' && can('opportunities.delete') ? (
              <div className="border-t border-[var(--border-light)] pt-3">
                <Button variant="danger" onClick={() => { setModal(null); void remove(modal.row); }}>
                  Delete opportunity
                </Button>
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default OpportunitiesAdmin;
