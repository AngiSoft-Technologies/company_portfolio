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
import { actionRecord, createRecord, fetchOptions, updateRecord, usePipelineResource } from './api';
import {
  FilterTabs,
  FormGrid,
  LineItemsEditor,
  LineItemsSummary,
  Money,
  StageBadge,
  emptyLineItem,
  lineItemsFromApi,
  lineItemsToApi,
  type EditableLineItem,
} from './shared';
import { QUOTE_FLOW, QUOTE_STATUSES, type Opportunity, type Quote } from './types';

const STATUS_LABELS: Record<string, string> = {
  all: 'All',
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  expired: 'Expired',
  rejected: 'Rejected',
};

interface FormState {
  opportunityId: string;
  clientId: string;
  status: string;
  currency: string;
  validUntil: string;
  discount: string;
  taxRate: string;
  notes: string;
  lineItems: EditableLineItem[];
}

const EMPTY_FORM: FormState = {
  opportunityId: '',
  clientId: '',
  status: 'draft',
  currency: 'KES',
  validUntil: '',
  discount: '',
  taxRate: '',
  notes: '',
  lineItems: [emptyLineItem()],
};

function toDateInput(value?: string | null): string {
  return value ? String(value).slice(0, 10) : '';
}

function formFromQuote(q: Quote): FormState {
  return {
    opportunityId: q.opportunityId ?? '',
    clientId: q.clientId ?? '',
    status: q.status ?? 'draft',
    currency: q.currency ?? 'KES',
    validUntil: toDateInput(q.validUntil),
    discount: q.discount != null ? String(q.discount) : '',
    taxRate: '',
    notes: q.notes ?? '',
    lineItems: lineItemsFromApi(q.lineItems),
  };
}

export function QuotesAdmin() {
  const can = useCan();
  const [statusFilter, setStatusFilter] = useState('all');
  const { rows, loading, error, refresh } = usePipelineResource<Quote>('/quotes', {
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; row: Quote } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    void fetchOptions<Opportunity>('/opportunities').then(setOpportunities);
  }, []);

  const isDraft = modal?.mode === 'edit' ? modal.row.status === 'draft' : true;

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal({ mode: 'create' });
  };

  const openEdit = (row: Quote) => {
    setForm(formFromQuote(row));
    setModal({ mode: 'edit', row });
  };

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const buildPayload = () => {
    const body: Record<string, unknown> = {
      currency: form.currency || 'KES',
      validUntil: form.validUntil || null,
      notes: form.notes || null,
    };
    if (modal?.mode === 'edit') {
      body.status = form.status;
      body.clientId = form.clientId || null;
    } else {
      body.opportunityId = form.opportunityId || null;
      body.clientId = form.clientId || null;
    }
    if (isDraft) {
      body.lineItems = lineItemsToApi(form.lineItems);
      if (form.discount !== '') body.discount = Number(form.discount);
      if (form.taxRate !== '') body.taxRate = Number(form.taxRate);
    }
    return body;
  };

  const save = async () => {
    setSaving(true);
    try {
      if (modal?.mode === 'edit') {
        await updateRecord('/quotes', modal.row.id, buildPayload());
        toast.success('Quote updated');
      } else {
        await createRecord('/quotes', buildPayload());
        toast.success('Quote created');
      }
      setModal(null);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const convertToInvoice = async (row: Quote) => {
    setConverting(true);
    try {
      await actionRecord('/quotes', row.id, 'convert-to-invoice', { dueDays: 30 });
      toast.success('Invoice created from quote');
      setModal(null);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message || 'Conversion failed');
    } finally {
      setConverting(false);
    }
  };

  const statusOptions =
    modal?.mode === 'edit'
      ? [modal.row.status, ...(QUOTE_FLOW[modal.row.status] ?? [])].filter(
          (v, i, a) => a.indexOf(v) === i,
        )
      : ['draft'];

  return (
    <div>
      <PageHeader
        title="Quotes"
        subtitle="Quotations — draft, send, win, and convert to invoices."
        actions={
          can('quotes.create') ? <Button onClick={openCreate}>+ New quote</Button> : undefined
        }
      />

      <FilterTabs
        value={statusFilter}
        onChange={setStatusFilter}
        options={['all', ...QUOTE_STATUSES].map((s) => ({
          value: s,
          label: s === 'all' ? 'All' : STATUS_LABELS[s],
        }))}
      />

      {loading ? <Spinner /> : null}
      {!loading && error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}
      {!loading && !error && rows.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <EmptyState title="No quotes yet" />
        </div>
      ) : null}
      {!loading && rows.length > 0 ? (
        <Table<Quote>
          rows={rows}
          onEdit={can('quotes.update') ? openEdit : undefined}
          columns={[
            {
              key: 'number',
              header: 'Quote',
              render: (r) => (
                <div>
                  <div className="font-medium">{r.number ?? r.publicReference ?? r.id.slice(0, 8)}</div>
                  <div className="text-xs text-[var(--text-muted)]">{r.publicReference ?? ''}</div>
                </div>
              ),
            },
            { key: 'status', header: 'Status', render: (r) => <StageBadge value={r.status} /> },
            {
              key: 'total',
              header: 'Total',
              render: (r) => <Money value={r.total} currency={r.currency} />,
            },
            {
              key: 'lineItems',
              header: 'Lines',
              render: (r) => r.lineItems?.length ?? 0,
            },
            { key: 'validUntil', header: 'Valid until', render: (r) => formatDate(r.validUntil) },
            { key: 'createdAt', header: 'Created', render: (r) => formatDate(r.createdAt) },
          ]}
        />
      ) : null}

      {modal ? (
        <Modal
          wide
          title={modal.mode === 'create' ? 'New quote' : `Edit ${modal.row.number ?? modal.row.publicReference ?? 'quote'}`}
          onClose={() => setModal(null)}
          footer={
            <>
              {modal.mode === 'edit' && modal.row.status === 'accepted' && can('invoices.create') ? (
                <Button
                  variant="outline"
                  disabled={converting}
                  onClick={() => void convertToInvoice(modal.row)}
                >
                  {converting ? 'Converting…' : 'Convert to invoice'}
                </Button>
              ) : null}
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
                <span className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Status</span>
                <div className="flex items-center gap-2">
                  <StageBadge value={modal.row.status} />
                  <span className="text-xs text-[var(--text-muted)]">
                    Legal next: {(QUOTE_FLOW[modal.row.status] ?? []).join(', ') || 'none (final)'}
                  </span>
                </div>
              </div>
            ) : null}

            <FormGrid>
              <Field label="Status">
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) => set({ status: e.target.value })}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Currency">
                <input className={inputClass} value={form.currency} disabled={!isDraft} onChange={(e) => set({ currency: e.target.value })} />
              </Field>
              <Field label="Valid until">
                <input className={inputClass} type="date" value={form.validUntil} disabled={!isDraft} onChange={(e) => set({ validUntil: e.target.value })} />
              </Field>
              <Field label="Opportunity">
                <select
                  className={inputClass}
                  value={form.opportunityId}
                  disabled={!isDraft}
                  onChange={(e) => set({ opportunityId: e.target.value })}
                >
                  <option value="">— None —</option>
                  {opportunities.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.publicReference ?? o.id.slice(0, 8)} — {o.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Client ID (optional)">
                <input className={inputClass} value={form.clientId} disabled={!isDraft} onChange={(e) => set({ clientId: e.target.value })} />
              </Field>
              {isDraft ? (
                <>
                  <Field label="Discount">
                    <input className={inputClass} type="number" min={0} step="0.01" value={form.discount} onChange={(e) => set({ discount: e.target.value })} />
                  </Field>
                  <Field label="Tax rate (e.g. 0.16)">
                    <input className={inputClass} type="number" min={0} step="0.0001" value={form.taxRate} onChange={(e) => set({ taxRate: e.target.value })} />
                  </Field>
                </>
              ) : null}
            </FormGrid>

            {isDraft ? (
              <Field label="Line items">
                <LineItemsEditor items={form.lineItems} onChange={(lineItems) => set({ lineItems })} />
              </Field>
            ) : (
              <div>
                <span className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Line items</span>
                <LineItemsSummary items={modal.mode === 'edit' ? modal.row.lineItems : undefined} />
              </div>
            )}

            <Field label="Notes">
              <textarea className={inputClass} rows={3} value={form.notes} disabled={!isDraft} onChange={(e) => set({ notes: e.target.value })} />
            </Field>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default QuotesAdmin;
