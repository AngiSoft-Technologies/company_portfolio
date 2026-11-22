import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { useEffectiveAccess } from '@/lib/permissions';
import { Button, Card, EmptyState, PageHeader, Spinner, Table } from '@/components';
import { Badge } from '@/lib/Badge';
import { formatDateTime, formatKsh } from '@/lib/format';
import { inputClass } from './shared';

/**
 * Read-only view over the six safe payment-console GET endpoints.
 *
 * The underlying admin router also exposes write endpoints, but this screen
 * deliberately never calls them. Responses are normalized to an allowlist of
 * safe fields: provider payloads, `meta`, callback URLs and credentials are
 * discarded before anything reaches the DOM.
 */
type Dict = Record<string, unknown>;

type ChannelRow = {
  id: string;
  provider: string;
  channelType: string;
  shortCode: string;
  accountRef: string;
  status: string;
  description: string;
  balance: string;
  createdAt: unknown;
};

type BankPaybillRow = {
  id: string;
  bank: string;
  paybill: string;
  accountRef: string;
  status: string;
};

type WalletRow = {
  id: string;
  name: string;
  provider: string;
  balance: string;
  currency: string;
};

type TransactionRow = {
  id: string;
  reference: string;
  amount: string;
  currency: string;
  status: string;
  matched: string;
  createdAt: unknown;
};

type StatusResult = {
  reference: string;
  status: string;
  amount: string;
  currency: string;
  success: string;
};

type Summary = {
  pendingCount: number;
  succeededToday: number;
  channelCount: number;
  walletCount: number;
  payHeroConfigured: boolean;
  paystackConfigured: boolean;
  payHeroChannelId: number | null;
  defaultBookingStatus: string;
  recentPayments: TransactionRow[];
};

const ENDPOINTS = {
  summary: '/admin/payments/summary',
  channels: '/admin/payments/channels',
  bankPaybills: '/admin/payments/bank-paybills',
  wallets: '/admin/payments/wallets',
  transactions: '/admin/payments/transactions',
} as const;

const isRecord = (value: unknown): value is Dict =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function pick(row: Dict, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function text(value: unknown, max = 80): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value).trim().slice(0, max) || '—';
}

/** Account/bank references are never rendered in full. */
function maskAccount(value: unknown): string {
  const raw = value === undefined || value === null ? '' : String(value).trim();
  if (!raw) return '—';
  return raw.length > 4 ? `••••${raw.slice(-4)}` : '••••';
}

function isLegacyProvider(value: unknown): boolean {
  return /paystack|stripe/i.test(String(value ?? ''));
}

function providerLabel(value: unknown, fallback = '—'): ReactNode {
  const provider = text(value, 30);
  return isLegacyProvider(value)
    ? <span>{provider} <Badge tone="amber">Legacy</Badge></span>
    : <span>{provider === '—' ? fallback : provider}</span>;
}

function activeStatus(row: Dict): string {
  const active = pick(row, 'isActive', 'is_active', 'status');
  if (typeof active === 'boolean') return active ? 'Active' : 'Inactive';
  if (typeof active === 'string') {
    if (/active|enabled|true/i.test(active)) return 'Active';
    if (/inactive|disabled|false/i.test(active)) return 'Inactive';
    return text(active, 30);
  }
  return '—';
}

function channelRows(value: unknown, source: string): ChannelRow[] {
  const root = isRecord(value) ? value : {};
  const rows = Array.isArray(root.channels) ? root.channels : [];
  return rows.filter(isRecord).map((row, index) => ({
    id: text(pick(row, 'id', 'providerChannelId'), 60) === '—' ? `${source}-${index}` : text(pick(row, 'id', 'providerChannelId'), 60),
    provider: text(pick(row, 'provider', 'provider_name'), 40),
    channelType: text(pick(row, 'channelType', 'channel_type', 'channel'), 40),
    shortCode: text(pick(row, 'shortCode', 'short_code'), 40),
    accountRef: maskAccount(pick(row, 'accountNumber', 'account_number')),
    status: activeStatus(row),
    description: text(pick(row, 'description', 'name'), 120),
    balance: formatKsh(pick(row, 'balance', 'balance_plain')),
    createdAt: pick(row, 'createdAt', 'created_at'),
  }));
}

function bankPaybillRows(value: unknown): BankPaybillRow[] {
  const root = isRecord(value) ? value : {};
  const rows = Array.isArray(root.bank_paybills) ? root.bank_paybills : [];
  return rows.filter(isRecord).map((row, index) => ({
    id: text(pick(row, 'id'), 60) === '—' ? `bank-${index}` : text(pick(row, 'id'), 60),
    bank: text(pick(row, 'bankName', 'bank_name', 'name'), 60),
    paybill: text(pick(row, 'paybillNumber', 'paybill_number', 'shortCode', 'short_code'), 40),
    accountRef: maskAccount(pick(row, 'accountNumber', 'account_number')),
    status: activeStatus(row),
  }));
}

function walletRows(value: unknown): WalletRow[] {
  const root = isRecord(value) ? value : {};
  const entries: Array<[string, unknown]> = [
    ['service_wallet', root.service_wallet],
    ['payment_wallet', root.payment_wallet],
  ];
  return entries.filter(([, wallet]) => isRecord(wallet)).map(([key, wallet]) => {
    const row = wallet as Dict;
    return {
      id: key,
      name: text(pick(row, 'walletType', 'wallet_type', 'name'), 40) === '—'
        ? key.replace(/_/g, ' ')
        : text(pick(row, 'walletType', 'wallet_type', 'name'), 40),
      provider: text(pick(row, 'provider'), 40) === '—' ? 'PAYHERO' : text(pick(row, 'provider'), 40),
      balance: formatKsh(pick(row, 'balance', 'balance_plain')),
      currency: text(pick(row, 'currency'), 12) === '—' ? 'KES' : text(pick(row, 'currency'), 12),
    };
  });
}

function transactionRows(value: unknown): TransactionRow[] {
  const root = isRecord(value) ? value : {};
  const rows = Array.isArray(root.transactions) ? root.transactions : [];
  return rows.filter(isRecord).map((row, index) => {
    const matched = isRecord(row.matched) ? row.matched : null;
    return {
      id: text(pick(row, 'id'), 60) === '—' ? `txn-${index}` : text(pick(row, 'id'), 60),
      reference: text(pick(row, 'external_reference', 'ExternalReference', 'reference'), 60),
      amount: formatKsh(pick(row, 'amount_plain', 'amount', 'Amount')),
      currency: text(pick(row, 'currency'), 12) === '—' ? 'KES' : text(pick(row, 'currency'), 12),
      status: text(pick(row, 'status', 'Status'), 40),
      matched: matched ? `${text(matched.paymentId, 60)} · ${text(matched.status, 40)}` : '—',
      createdAt: pick(row, 'created_at', 'createdAt', 'transaction_date', 'date'),
    };
  });
}

function safeStatusResult(value: unknown): StatusResult {
  const row = isRecord(value) ? value : {};
  return {
    reference: text(pick(row, 'reference', 'external_reference'), 60),
    status: text(pick(row, 'status', 'Status'), 40),
    amount: formatKsh(pick(row, 'amount', 'amount_plain')),
    currency: text(pick(row, 'currency'), 12) === '—' ? 'KES' : text(pick(row, 'currency'), 12),
    success: text(pick(row, 'success'), 12),
  };
}

function summaryFrom(value: unknown, channels: unknown, wallets: unknown): Summary {
  const root = isRecord(value) ? value : {};
  const count = (key: string): number => {
    const raw = root[key];
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
  };
  const localChannels = isRecord(channels) && Array.isArray(channels.channels) ? channels.channels : [];
  const localWallets = isRecord(wallets) && Array.isArray(wallets.wallets) ? wallets.wallets : [];
  const rawChannelId = root.payHeroChannelId;
  return {
    pendingCount: count('pendingCount'),
    succeededToday: count('succeededToday'),
    // The remote channel list can duplicate local mirrors; count local rows.
    channelCount: Array.isArray(root.channels) ? root.channels.length : localChannels.length,
    walletCount: Array.isArray(root.wallets) ? root.wallets.length : localWallets.length,
    payHeroConfigured: root.payHeroConfigured === true,
    paystackConfigured: root.paystackConfigured === true,
    payHeroChannelId: typeof rawChannelId === 'number' && Number.isFinite(rawChannelId) ? rawChannelId : null,
    defaultBookingStatus: text(root.defaultBookingStatus, 40),
    recentPayments: transactionRows({ transactions: root.recentPayments }),
  };
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-3">
      <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

/** Read-only payment operations console: no POST, PATCH or DELETE calls. */
export default function PaymentConsoleAdmin() {
  const { can } = useEffectiveAccess();
  const allowed = can('payments.view_all');
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [remoteChannels, setRemoteChannels] = useState<ChannelRow[]>([]);
  const [bankPaybills, setBankPaybills] = useState<BankPaybillRow[]>([]);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [statusReference, setStatusReference] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusResult, setStatusResult] = useState<StatusResult | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const settled = await Promise.allSettled([
      apiFetch(ENDPOINTS.summary),
      apiFetch(ENDPOINTS.channels),
      apiFetch(ENDPOINTS.bankPaybills),
      apiFetch(ENDPOINTS.wallets),
      apiFetch(ENDPOINTS.transactions),
    ]);
    const failed = settled
      .map((result, index) => result.status === 'rejected'
        ? `${Object.values(ENDPOINTS)[index]}: ${(result.reason as Error)?.message || 'request failed'}`
        : null)
      .filter((message): message is string => Boolean(message));
    const values = settled.map((result) => result.status === 'fulfilled' ? result.value : null);
    setErrors(failed);
    setSummary(summaryFrom(values[0], values[1], values[3]));
    setChannels(channelRows(values[1], 'local'));
    setRemoteChannels(channelRows({ channels: isRecord(values[1]) ? values[1].remote : [] }, 'remote'));
    setBankPaybills(bankPaybillRows(values[2]));
    setWallets(walletRows(values[3]));
    setTransactions(transactionRows(values[4]));
    setLoading(false);
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  const lookupStatus = async () => {
    const reference = statusReference.trim();
    if (!reference) {
      setStatusError('Enter a payment reference to look up.');
      return;
    }
    setStatusBusy(true);
    setStatusError(null);
    setStatusResult(null);
    try {
      const query = new URLSearchParams({ reference });
      const result = await apiFetch(`/admin/payments/status?${query.toString()}`);
      setStatusResult(safeStatusResult(result));
    } catch (error) {
      setStatusError((error as Error)?.message || 'Status lookup failed');
    } finally {
      setStatusBusy(false);
    }
  };

  if (!allowed) {
    return (
      <div>
        <PageHeader title="Payments Console" subtitle="Read-only payment operations overview." />
        <Card>
          <p className="text-sm text-[var(--text-secondary)]">
            This console requires <code>payments.view_all</code> access.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments Console"
        subtitle="Read-only PayHero channels, bank paybills, wallets and transaction status. Paystack/Stripe data is legacy only."
        actions={<Button variant="outline" onClick={() => void load()} disabled={loading}>Refresh</Button>}
      />

      {errors.length > 0 ? (
        <Card className="border-amber-300 text-sm text-[var(--text-secondary)]">
          <p className="mb-1 font-medium">Some sections could not be loaded:</p>
          <ul className="list-disc pl-5 text-xs text-[var(--text-muted)]">
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </Card>
      ) : null}

      {loading ? <Spinner /> : null}

      {summary ? (
        <Card>
          <h3 className="mb-3 font-semibold">Overview</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Pending payments" value={summary.pendingCount} />
            <Stat label="Succeeded (24h)" value={summary.succeededToday} />
            <Stat label="Payment channels" value={summary.channelCount} />
            <Stat label="Wallets" value={summary.walletCount} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Badge tone={summary.payHeroConfigured ? 'green' : 'amber'}>
              PayHero {summary.payHeroConfigured ? 'configured' : 'not configured'}
            </Badge>
            <Badge tone="amber">Paystack (legacy) {summary.paystackConfigured ? 'configured' : 'not configured'}</Badge>
            {summary.payHeroChannelId !== null ? <Badge tone="slate">PayHero channel #{summary.payHeroChannelId}</Badge> : null}
            <Badge tone="slate">Default booking status: {summary.defaultBookingStatus}</Badge>
          </div>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Callback URLs, provider payloads and credentials are intentionally not shown.
          </p>
        </Card>
      ) : null}

      <Card>
        <h3 className="mb-1 font-semibold">Payment channels</h3>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          Locally mirrored channels. Account references are masked; raw provider metadata is not displayed.
        </p>
        <Table<ChannelRow>
          rows={channels}
          columns={[
            { key: 'id', header: 'ID', render: (row) => <span className="font-mono text-xs">{row.id}</span> },
            { key: 'provider', header: 'Provider', render: (row) => providerLabel(row.provider) },
            { key: 'channelType', header: 'Type', render: (row) => text(row.channelType) },
            { key: 'shortCode', header: 'Short code', render: (row) => text(row.shortCode) },
            { key: 'accountRef', header: 'Account', render: (row) => <span className="font-mono text-xs">{row.accountRef}</span> },
            { key: 'status', header: 'Status', render: (row) => <Badge>{row.status}</Badge> },
            { key: 'description', header: 'Description', render: (row) => text(row.description) },
            { key: 'balance', header: 'Balance', render: (row) => row.balance },
            { key: 'createdAt', header: 'Created', render: (row) => formatDateTime(row.createdAt) },
          ]}
        />
      </Card>

      <Card>
        <h3 className="mb-1 font-semibold">Remote PayHero channels</h3>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          Provider-reported channels, reduced to the same safe field set. No remote payloads are rendered.
        </p>
        <Table<ChannelRow>
          rows={remoteChannels}
          columns={[
            { key: 'id', header: 'ID', render: (row) => <span className="font-mono text-xs">{row.id}</span> },
            { key: 'provider', header: 'Provider', render: (row) => providerLabel(row.provider, 'PAYHERO') },
            { key: 'channelType', header: 'Type', render: (row) => text(row.channelType) },
            { key: 'shortCode', header: 'Short code', render: (row) => text(row.shortCode) },
            { key: 'accountRef', header: 'Account', render: (row) => <span className="font-mono text-xs">{row.accountRef}</span> },
            { key: 'status', header: 'Status', render: (row) => <Badge>{row.status}</Badge> },
            { key: 'balance', header: 'Balance', render: (row) => row.balance },
            { key: 'createdAt', header: 'Created', render: (row) => formatDateTime(row.createdAt) },
          ]}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">Bank paybills</h3>
          <Table<BankPaybillRow>
            rows={bankPaybills}
            columns={[
              { key: 'bank', header: 'Bank', render: (row) => <span className="font-medium">{row.bank}</span> },
              { key: 'paybill', header: 'Paybill', render: (row) => text(row.paybill) },
              { key: 'accountRef', header: 'Account', render: (row) => <span className="font-mono text-xs">{row.accountRef}</span> },
              { key: 'status', header: 'Status', render: (row) => <Badge>{row.status}</Badge> },
            ]}
          />
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">PayHero wallets</h3>
          <Table<WalletRow>
            rows={wallets}
            columns={[
              { key: 'name', header: 'Wallet', render: (row) => <span className="font-medium">{row.name}</span> },
              { key: 'provider', header: 'Provider', render: (row) => providerLabel(row.provider, 'PAYHERO') },
              { key: 'balance', header: 'Balance', render: (row) => row.balance },
              { key: 'currency', header: 'Currency', render: (row) => row.currency },
            ]}
          />
        </Card>
      </div>

      <Card>
        <h3 className="mb-1 font-semibold">Recent transactions</h3>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          PayHero ledger entries with local payment matches. Provider payloads are not exposed.
        </p>
        <Table<TransactionRow>
          rows={transactions}
          columns={[
            { key: 'reference', header: 'Reference', render: (row) => <span className="font-mono text-xs">{row.reference}</span> },
            { key: 'amount', header: 'Amount', render: (row) => row.amount },
            { key: 'currency', header: 'Currency', render: (row) => row.currency },
            { key: 'status', header: 'Status', render: (row) => <Badge>{row.status}</Badge> },
            { key: 'matched', header: 'Matched payment', render: (row) => text(row.matched) },
            { key: 'createdAt', header: 'Date', render: (row) => formatDateTime(row.createdAt) },
          ]}
        />
      </Card>

      {summary && summary.recentPayments.length > 0 ? (
        <Card>
          <h3 className="mb-3 font-semibold">Recent local payments</h3>
          <Table<TransactionRow>
            rows={summary.recentPayments}
            columns={[
              { key: 'reference', header: 'Reference', render: (row) => <span className="font-mono text-xs">{row.reference}</span> },
              { key: 'amount', header: 'Amount', render: (row) => row.amount },
              { key: 'status', header: 'Status', render: (row) => <Badge>{row.status}</Badge> },
              { key: 'createdAt', header: 'Date', render: (row) => formatDateTime(row.createdAt) },
            ]}
          />
        </Card>
      ) : null}

      <Card>
        <h3 className="mb-1 font-semibold">Transaction status lookup</h3>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          Read-only status check by payment reference. Nothing is modified by this lookup.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-64 flex-1">
            <span className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Reference</span>
            <input
              className={inputClass}
              value={statusReference}
              onChange={(event) => setStatusReference(event.target.value)}
              placeholder="External payment reference"
            />
          </label>
          <Button onClick={() => void lookupStatus()} disabled={statusBusy}>
            {statusBusy ? 'Looking up…' : 'Look up'}
          </Button>
        </div>
        {statusError ? <p className="mt-3 text-sm text-red-600">{statusError}</p> : null}
        {statusResult ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Status" value={statusResult.status} />
            <Stat label="Amount" value={statusResult.amount} />
            <Stat label="Currency" value={statusResult.currency} />
            <Stat label="Success" value={statusResult.success} />
            <p className="col-span-full text-xs text-[var(--text-muted)]">Reference: {statusResult.reference}</p>
          </div>
        ) : null}
      </Card>

      {!loading && channels.length === 0 && remoteChannels.length === 0 && bankPaybills.length === 0 && transactions.length === 0 ? (
        <Card><EmptyState title="No payment console data available" /></Card>
      ) : null}
    </div>
  );
}
