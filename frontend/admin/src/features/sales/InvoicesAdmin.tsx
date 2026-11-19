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
import { formatDate, formatKsh } from '@/lib/format';
import { useCan } from '@/lib/permissions';
import { actionRecord, createRecord, deleteRecord, fetchOptions, updateRecord, usePipelineResource } from './api';
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
import { INVOICE_FLOW, INVOICE_STATUSES, type Invoice, type Quote } from './types';

const STATUS_LABELS: Record<string, string> = {
  all: 'All',
  draft: 'Draft',
  sent: 'Sent',
  partially_paid: 'Partially paid',
  paid: 'Paid',
  void: 'Void',
};

interface FormState {
  quoteId: string;
  clientId: string;
  status: string;
  currency: string;
  dueAt: string;
  taxRate: string;
  notes: string;
  lineItems: EditableLineItem[];
}

const EMPTY_FORM: FormState = {
  quoteId: '',
  clientId: '',
  status: 'draft',
  currency: 'KES',
  dueAt: '',
  taxRate: '',
  notes: '',
  lineItems: [emptyLineItem()],
};

function toDateInput(value?: string | null): string {
  return value ? String(value).slice(0, 10) : '';
}

function formFromInvoice(inv: Invoice): FormState {
  return {
    quoteId: inv.quoteId ?? '',
    clientId: inv.clientId ?? '',
    status: inv.status ?? 'draft',
    currency: inv.currency ?? 'KES',
    dueAt: toDateInput(inv.dueAt),
    taxRate: '',
    notes: inv.notes ?? '',
    lineItems: lineItemsFromApi(inv.lineItems),
  };
}

export function InvoicesAdmin() {
  const can = useCan();
  const [statusFilter, setStatusFilter] = useState('all');
  const { rows, loading, error, refresh } = usePipelineResource<Invoice>('/invoices', {
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; row: Invoice } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    void fetchOptions<Quote>('/quotes').then(setQuotes);
  }, []);

  const isDraft = modal?.mode === 'edit' ? modal.row.status === 'draft' : true;
  const fromQuote = modal?.mode === 'create' && form.quoteId !== '';

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal({ mode: 'create' });
  };

  const openEdit = (row: Invoice) => {
    setForm(formFromInvoice(row));
    setModal({ mode: 'edit', row });
  };

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const buildPayload = () => {
    const body: Record<string, unknown> = {
      currency: form.currency || 'KES',
      dueAt: form.dueAt || null,
      notes: form.notes || null,
    };
    if (modal?.mode === 'edit') {
      body.status = form.status;
      body.clientId = form.clientId || null;
      if (isDraft) {
        body.lineItems = lineItemsToApi(form.lineItems);
        if (form.taxRate !== '') body.taxRate = Number(form.taxRate);
      }
    } else {
      body.quoteId = form.quoteId || null;
      body.clientId = form.clientId || null;
      if (!fromQuote) {
        // Manual invoice — send our own lines/tax. With a quote selected the
        // backend snapshots the quote's totals and line items instead.
        body.lineItems = lineItemsToApi(form.lineItems);
        if (form.taxRate !== '') body.taxRate = Number(form.taxRate);
      }
    }
    return body;
  };

  const save = async () => {
    setSaving(true);
    try {
      if (modal?.mode === 'edit') {
        await updateRecord('/invoices', modal.row.id, buildPayload());
        toast.success('Invoice updated');
      } else {
        await createRecord('/invoices', buildPayload());
        toast.success('Invoice created');
      }
      setModal(null);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const recordPayment = async (row: Invoice) => {
    const amount = paymentAmount.trim();
    setPaying(true);
    try {
      await actionRecord('/invoices', row.id, 'mark-paid', amount ? { amount: Number(amount) } : {});
      toast.success('Payment recorded');
      setPaymentAmount('');
      await refresh();
    } catch (e) {
      toast.error((e as Error).message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const remove = async (row: Invoice) => {
    if (!window.confirm(`Delete draft invoice ${row.number ?? row.publicReference ?? ''}?`)) return;
    try {
      await deleteRecord('/invoices', row.id);
      toast.success('Invoice deleted');
      await refresh();
    } catch (e) {
      toast.error((e as Error).message || 'Delete failed');
    }
  };

  const statusOptions =
    modal?.mode === 'edit'
      ? [modal.row.status, ...(INVOICE_FLOW[modal.row.status] ?? [])].filter(
          (v, i, a) => a.indexOf(v) === i,
        )
      : ['draft'];

  const canRecordPayment =
    modal?.mode === 'edit' &&
    ['sent', 'partially_paid'].includes(modal.row.status) &&
    can('invoices.update');

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Billing — issue invoices, record payments, track balances."
        actions={
          can('invoices.create') ? <Button onClick={openCreate}>+ New invoice</Button> : undefined
        }
      />

      <FilterTabs
        value={statusFilter}
        onChange={setStatusFilter}
        options={['all', ...INVOICE_STATUSES].map((s) => ({
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
          <EmptyState title="No invoices yet" />
        </div>
      ) : null}
      {!loading && rows.length > 0 ? (
        <Table<Invoice>
          rows={rows}
          onEdit={can('invoices.update') ? openEdit : undefined}
          columns={[
            {
              key: 'number',
              header: 'Invoice',
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
              key: 'balanceDue',
              header: 'Balance',
              render: (r) => <Money value={r.balanceDue} currency={r.currency} />,
            },
            { key: 'dueAt', header: 'Due', render: (r) => formatDate(r.dueAt) },
            { key: 'createdAt', header: 'Created', render: (r) => formatDate(r.createdAt) },
          ]}
        />
      ) : null}

      {modal ? (
        <Modal
          wide
          title={modal.mode === 'create' ? 'New invoice' : `Edit ${modal.row.number ?? modal.row.publicReference ?? 'invoice'}`}
          onClose={() => setModal(null)}
          footer={
            <>
              {canRecordPayment ? (
                <div className="mr-auto flex items-center gap-2">
                  <input
                    className={`${inputClass} w-32`}
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Amount (blank = balance)"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                  <Button variant="outline" disabled={paying} onClick={() => void recordPayment(modal.row)}>
                    {paying ? 'Recording…' : 'Record payment'}
                  </Button>
                </div>
              ) : null}
              {modal.mode === 'edit' && modal.row.status === 'draft' && can('invoices.delete') ? (
                <Button variant="danger" onClick={() => { setModal(null); void remove(modal.row); }}>
                  Delete draft
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
                    Legal next: {(INVOICE_FLOW[modal.row.status] ?? []).join(', ') || 'none (final)'}
                  </span>
                </div>
                {modal.row.status !== 'draft' ? (
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Paid: <Money value={modal.row.amountPaid} currency={modal.row.currency} /> · Balance:{' '}
                    <Money value={modal.row.balanceDue} currency={modal.row.currency} />
                  </p>
                ) : null}
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
                <input className={inputClass} value={form.currency} disabled={!isDraft && modal?.mode === 'edit'} onChange={(e) => set({ currency: e.target.value })} />
              </Field>
              <Field label="Due date">
                <input className={inputClass} type="date" value={form.dueAt} disabled={!isDraft && modal?.mode === 'edit'} onChange={(e) => set({ dueAt: e.target.value })} />
              </Field>
              <Field label="Client ID (optional)">
                <input className={inputClass} value={form.clientId} disabled={!isDraft && modal?.mode === 'edit'} onChange={(e) => set({ clientId: e.target.value })} />
              </Field>
              {modal?.mode === 'create' ? (
                <Field label="From quote (optional)">
                  <select
                    className={inputClass}
                    value={form.quoteId}
                    onChange={(e) => set({ quoteId: e.target.value })}
                  >
                    <option value="">— Manual invoice —</option>
                    {quotes.map((q) => (
                      <option key={q.id} value={q.id}>
                        {`${q.number ?? q.publicReference ?? q.id.slice(0, 8)} — ${q.status} — ${formatKsh(q.total)}`}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {isDraft && !fromQuote ? (
                <Field label="Tax rate (e.g. 0.16)">
                  <input className={inputClass} type="number" min={0} step="0.0001" value={form.taxRate} onChange={(e) => set({ taxRate: e.target.value })} />
                </Field>
              ) : null}
            </FormGrid>

            {fromQuote ? (
              <p className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-muted)]">
                Totals and line items will be copied from the selected quote.
              </p>
            ) : isDraft ? (
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
              <textarea className={inputClass} rows={3} value={form.notes} disabled={!isDraft && modal?.mode === 'edit'} onChange={(e) => set({ notes: e.target.value })} />
            </Field>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default InvoicesAdmin;
