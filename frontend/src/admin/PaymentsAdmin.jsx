import React, { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import {
  FaSyncAlt, FaSpinner, FaPlus, FaWallet, FaMoneyBillWave, FaExchangeAlt,
  FaListUl, FaCreditCard, FaSearch, FaCheckCircle, FaTimesCircle, FaUniversity, FaMobileAlt,
} from 'react-icons/fa';

const TABS = [
  { id: 'overview', label: 'Overview', icon: FaMoneyBillWave },
  { id: 'channels', label: 'Channels', icon: FaUniversity },
  { id: 'wallets', label: 'Wallets', icon: FaWallet },
  { id: 'payouts', label: 'Payouts', icon: FaExchangeAlt },
  { id: 'transactions', label: 'Transactions', icon: FaListUl },
  { id: 'paystack', label: 'Paystack', icon: FaCreditCard },
];

const fmtMoney = (v, cur = 'KES') => `${cur} ${Number(v || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—');

const PaymentsAdmin = () => {
  const { colors } = useTheme();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  // Overview / shared state
  const [summary, setSummary] = useState(null);

  // Channels
  const [channels, setChannels] = useState([]);
  const [bankPaybills, setBankPaybills] = useState(null);
  const [channelForm, setChannelForm] = useState({ channelType: 'paybill', shortCode: '', accountNumber: '', transactionType: 'CustomerPayBillOnline', description: '' });

  // Wallets
  const [wallets, setWallets] = useState(null);

  // Payouts
  const [payouts, setPayouts] = useState([]);
  const [payoutForm, setPayoutForm] = useState({ amount: '', channel: 'mobile', phone: '', accountNumber: '', networkCode: 'safaricom' });

  // Topup
  const [topupForm, setTopupForm] = useState({ amount: '', phone: '' });

  // Transactions
  const [txns, setTxns] = useState([]);
  const [txnPage, setTxnPage] = useState(1);
  const [statusRef, setStatusRef] = useState('');
  const [statusResult, setStatusResult] = useState(null);

  // Paystack
  const [psTxns, setPsTxns] = useState([]);
  const [psPage, setPsPage] = useState(1);
  const [psVerifyRef, setPsVerifyRef] = useState('');
  const [psVerifyResult, setPsVerifyResult] = useState(null);
  const [subaccounts, setSubaccounts] = useState([]);
  const [subForm, setSubForm] = useState({ businessName: '', accountNumber: '', settlementBank: '', percentageCharge: 100, description: '' });

  const inputClass = 'w-full px-3 py-2 rounded-lg border transition-all bg-slate-800 border-slate-600 text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500';
  const labelClass = 'block text-xs font-medium mb-1 text-slate-300 uppercase tracking-wide';
  const cardClass = 'rounded-2xl border p-4 bg-slate-900/60 border-slate-700';

  const flash = (text, type = 'success') => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4500);
  };

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await apiGet('/admin/payments/summary'));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }, []);

  const loadChannels = useCallback(async () => {
    try {
      const data = await apiGet('/admin/payments/channels');
      setChannels(Array.isArray(data.channels) ? data.channels : []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }, []);

  const loadWallets = useCallback(async () => {
    try {
      setWallets(await apiGet('/admin/payments/wallets'));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }, []);

  const loadPayouts = useCallback(async () => {
    try {
      const data = await apiGet('/admin/payments/payouts');
      setPayouts(Array.isArray(data.payouts) ? data.payouts : []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }, []);

  const loadTxns = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const data = await apiGet(`/admin/payments/transactions?page=${page}&perPage=25`);
      setTxns(Array.isArray(data.transactions) ? data.transactions : []);
      setTxnPage(page);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPaystack = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const [txData, subData] = await Promise.all([
        apiGet(`/admin/payments/paystack/transactions?page=${page}&perPage=25`),
        apiGet('/admin/payments/paystack/subaccounts').catch(() => ({ subaccounts: [] })),
      ]);
      setPsTxns(Array.isArray(txData.transactions) ? txData.transactions : []);
      setSubaccounts(Array.isArray(subData.subaccounts) ? subData.subaccounts : []);
      setPsPage(page);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const openTab = async (id) => {
    setTab(id);
    setStatusResult(null);
    setPsVerifyResult(null);
    if (id === 'overview') loadSummary();
    if (id === 'channels') loadChannels();
    if (id === 'wallets') loadWallets();
    if (id === 'payouts') loadPayouts();
    if (id === 'transactions') loadTxns(1);
    if (id === 'paystack') loadPaystack(1);
  };

  // ─── Actions ───────────────────────────────────────────────────────────────
  const registerChannel = async (e) => {
    e.preventDefault();
    setBusy('channel');
    try {
      const res = await apiPost('/admin/payments/channels', channelForm);
      flash(res.reused ? 'Channel already registered — showing existing.' : 'Channel registered with PayHero.');
      setChannelForm({ channelType: 'paybill', shortCode: '', accountNumber: '', transactionType: 'CustomerPayBillOnline', description: '' });
      loadChannels();
      loadSummary();
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const toggleChannel = async (channel) => {
    setBusy(`toggle-${channel.id}`);
    try {
      await apiPatch(`/admin/payments/channels/${channel.id}`, { isActive: !channel.isActive });
      loadChannels();
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const fetchBankPaybills = async () => {
    setBusy('paybills');
    try {
      const data = await apiGet('/admin/payments/bank-paybills');
      setBankPaybills(Array.isArray(data.bank_paybills) ? data.bank_paybills : []);
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const topupWallet = async (e) => {
    e.preventDefault();
    setBusy('topup');
    try {
      const res = await apiPost('/admin/payments/wallets/topup', topupForm);
      flash(res.reused ? 'Top-up already initiated for this reference.' : 'Top-up M-Pesa prompt sent. Confirm on your phone.');
      setTopupForm({ amount: '', phone: '' });
      loadPayouts();
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const sendPayout = async (e) => {
    e.preventDefault();
    setBusy('payout');
    try {
      const res = await apiPost('/admin/payments/payouts', payoutForm);
      flash(res.reused ? 'Payout already initiated for this reference.' : 'Payout initiated.');
      setPayoutForm({ amount: '', channel: 'mobile', phone: '', accountNumber: '', networkCode: 'safaricom' });
      loadPayouts();
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const lookupStatus = async (e) => {
    e.preventDefault();
    if (!statusRef.trim()) return;
    setBusy('status');
    setStatusResult(null);
    try {
      setStatusResult(await apiGet(`/admin/payments/status?reference=${encodeURIComponent(statusRef.trim())}`));
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const verifyPaystack = async (e) => {
    e.preventDefault();
    if (!psVerifyRef.trim()) return;
    setBusy('verify');
    setPsVerifyResult(null);
    try {
      const res = await apiGet(`/admin/payments/paystack/verify/${encodeURIComponent(psVerifyRef.trim())}`);
      setPsVerifyResult(res);
      flash(res?.txn?.status === 'success' ? 'Transaction verified — ledger updated.' : `Status: ${res?.txn?.status}`);
      loadSummary();
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const createSubaccount = async (e) => {
    e.preventDefault();
    setBusy('subaccount');
    try {
      await apiPost('/admin/payments/paystack/subaccounts', subForm);
      flash('Paystack subaccount created.');
      setSubForm({ businessName: '', accountNumber: '', settlementBank: '', percentageCharge: 100, description: '' });
      loadPaystack(psPage);
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const StatCard = ({ label, value, sub }) => (
    <div className="rounded-2xl border p-4 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-2xl font-bold mt-1 text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );

  const StatusBadge = ({ ok, text }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${ok ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
      {ok ? <FaCheckCircle size={10} /> : <FaTimesCircle size={10} />}
      {text}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.text }}>Payments Console</h1>
          <p className="text-sm text-slate-400">PayHero (bank + M-Pesa) · Paystack (cards) — manage everything in-app.</p>
        </div>
        <button
          onClick={() => openTab(tab)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-600"
        >
          <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {message.text && (
        <div className={`px-4 py-3 rounded-xl text-sm ${message.type === 'error' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => openTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${tab === id ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <StatusBadge ok={summary?.payHeroConfigured} text={`PayHero ${summary?.payHeroConfigured ? 'connected' : 'not configured'}`} />
            <StatusBadge ok={summary?.paystackConfigured} text={`Paystack ${summary?.paystackConfigured ? 'connected' : 'not configured'}`} />
            {summary?.payHeroChannelId && <StatusBadge ok text={`Default channel #${summary.payHeroChannelId}`} />}
            {summary?.callbackUrl && <StatusBadge ok text={`Callback: ${summary.callbackUrl}`} />}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Active channels" value={(summary?.channels || []).filter((c) => c.isActive).length} sub={`${(summary?.channels || []).length} total registered`} />
            <StatCard label="Pending payments" value={summary?.pendingCount ?? '—'} sub="awaiting confirmation" />
            <StatCard label="Succeeded (24h)" value={summary?.succeededToday ?? '—'} sub="all providers" />
            <StatCard
              label="Service wallet"
              value={summary?.wallets?.length ? fmtMoney(summary.wallets.find((w) => w.walletType === 'service_wallet')?.balance ?? 0) : '—'}
              sub="PayHero"
            />
          </div>
          <div className={cardClass}>
            <h3 className="font-semibold text-white mb-3">Recent payments</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 text-xs uppercase">
                  <tr>
                    <th className="text-left py-2">Reference</th>
                    <th className="text-left py-2">Provider</th>
                    <th className="text-right py-2">Amount</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Created</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {(summary?.recentPayments || []).map((p) => (
                    <tr key={p.id} className="border-t border-slate-800">
                      <td className="py-2 font-mono text-xs">{p.reference || p.providerId}</td>
                      <td className="py-2">{p.provider}</td>
                      <td className="py-2 text-right">{fmtMoney(p.amount, p.currency)}</td>
                      <td className="py-2">
                        <StatusBadge ok={p.status === 'SUCCEEDED'} text={p.status} />
                      </td>
                      <td className="py-2 text-xs text-slate-400">{fmtDate(p.createdAt)}</td>
                    </tr>
                  ))}
                  {!(summary?.recentPayments || []).length && (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-500">No payments yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Channels ── */}
      {tab === 'channels' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className={`${cardClass} lg:col-span-1 space-y-3`}>
            <h3 className="font-semibold text-white flex items-center gap-2"><FaPlus size={12} /> Register channel</h3>
            <form onSubmit={registerChannel} className="space-y-3">
              <div>
                <label className={labelClass}>Channel type</label>
                <select className={inputClass} value={channelForm.channelType} onChange={(e) => setChannelForm({ ...channelForm, channelType: e.target.value })}>
                  <option value="paybill">Paybill</option>
                  <option value="till">Till</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Short code / business number</label>
                <input className={inputClass} value={channelForm.shortCode} onChange={(e) => setChannelForm({ ...channelForm, shortCode: e.target.value })} placeholder="e.g. 522522" required />
              </div>
              <div>
                <label className={labelClass}>Account number (optional)</label>
                <input className={inputClass} value={channelForm.accountNumber} onChange={(e) => setChannelForm({ ...channelForm, accountNumber: e.target.value })} placeholder="e.g. ACC01" />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <input className={inputClass} value={channelForm.description} onChange={(e) => setChannelForm({ ...channelForm, description: e.target.value })} placeholder="e.g. Kingsway project collections" />
              </div>
              <button type="submit" disabled={busy === 'channel'} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-900 disabled:opacity-60">
                {busy === 'channel' ? <FaSpinner className="animate-spin" /> : <FaPlus size={12} />} Register with PayHero
              </button>
            </form>
            <button onClick={fetchBankPaybills} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-600">
              {busy === 'paybills' ? <FaSpinner className="animate-spin" /> : <FaUniversity size={12} />} Load bank paybills (reference)
            </button>
            {bankPaybills && (
              <div className="max-h-48 overflow-y-auto text-xs text-slate-300 space-y-1">
                {bankPaybills.map((b) => (
                  <div key={b.id} className="flex justify-between gap-2 border-b border-slate-800 py-1">
                    <span>{b.name}</span>
                    <span className="font-mono">{b.paybill}</span>
                  </div>
                ))}
                {!bankPaybills.length && <p className="text-slate-500">No bank paybills available.</p>}
              </div>
            )}
          </div>

          <div className={`${cardClass} lg:col-span-2`}>
            <h3 className="font-semibold text-white mb-3">Registered channels</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 text-xs uppercase">
                  <tr>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Short code</th>
                    <th className="text-left py-2">Account</th>
                    <th className="text-left py-2">Description</th>
                    <th className="text-left py-2">Active</th>
                    <th className="text-right py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {channels.map((c) => (
                    <tr key={c.id} className="border-t border-slate-800">
                      <td className="py-2">{c.channelType}</td>
                      <td className="py-2 font-mono">{c.shortCode || '—'}</td>
                      <td className="py-2 font-mono">{c.accountNumber || '—'}</td>
                      <td className="py-2">{c.description || '—'}</td>
                      <td className="py-2"><StatusBadge ok={c.isActive} text={c.isActive ? 'active' : 'inactive'} /></td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => toggleChannel(c)}
                          disabled={busy === `toggle-${c.id}`}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 disabled:opacity-50"
                        >
                          {busy === `toggle-${c.id}` ? <FaSpinner className="animate-spin" /> : c.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!channels.length && (
                    <tr><td colSpan={6} className="py-6 text-center text-slate-500">No channels yet — register one or sync from PayHero.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Wallets ── */}
      {tab === 'wallets' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={`${cardClass} space-y-3`}>
            <h3 className="font-semibold text-white flex items-center gap-2"><FaWallet size={12} /> Balances</h3>
            {wallets ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-700 p-4 bg-slate-800/60">
                  <p className="text-xs uppercase text-slate-400">Service wallet</p>
                  <p className="text-2xl font-bold text-white mt-1">{fmtMoney(wallets.service_wallet?.balance)}</p>
                  <p className="text-xs text-slate-500">synced {fmtDate(wallets.service_wallet?.meta?.updated_at)}</p>
                </div>
                <div className="rounded-xl border border-slate-700 p-4 bg-slate-800/60">
                  <p className="text-xs uppercase text-slate-400">Payment wallet</p>
                  <p className="text-2xl font-bold text-white mt-1">{fmtMoney(wallets.payment_wallet?.balance)}</p>
                  <p className="text-xs text-slate-500">synced {fmtDate(wallets.payment_wallet?.meta?.updated_at)}</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Loading balances…</p>
            )}
          </div>
          <div className={`${cardClass} space-y-3`}>
            <h3 className="font-semibold text-white flex items-center gap-2"><FaMobileAlt size={12} /> Top up service wallet</h3>
            <form onSubmit={topupWallet} className="space-y-3">
              <div>
                <label className={labelClass}>Amount (KES)</label>
                <input type="number" min="1" className={inputClass} value={topupForm.amount} onChange={(e) => setTopupForm({ ...topupForm, amount: e.target.value })} required />
              </div>
              <div>
                <label className={labelClass}>Phone (pays the prompt)</label>
                <input className={inputClass} value={topupForm.phone} onChange={(e) => setTopupForm({ ...topupForm, phone: e.target.value })} placeholder="07XX XXX XXX" required />
              </div>
              <button type="submit" disabled={busy === 'topup'} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-900 disabled:opacity-60">
                {busy === 'topup' ? <FaSpinner className="animate-spin" /> : <FaWallet size={12} />} Send top-up prompt
              </button>
              <p className="text-xs text-slate-500">Idempotent: each request mints a unique reference; retrying the same reference never double-charges.</p>
            </form>
          </div>
        </div>
      )}

      {/* ── Payouts ── */}
      {tab === 'payouts' && (
        <div className="space-y-6">
          <div className={cardClass}>
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><FaExchangeAlt size={12} /> Send payout (SasaPay)</h3>
            <form onSubmit={sendPayout} className="grid gap-3 sm:grid-cols-5 items-end">
              <div>
                <label className={labelClass}>Amount (KES)</label>
                <input type="number" min="1" className={inputClass} value={payoutForm.amount} onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })} required />
              </div>
              <div>
                <label className={labelClass}>Destination</label>
                <select className={inputClass} value={payoutForm.channel} onChange={(e) => setPayoutForm({ ...payoutForm, channel: e.target.value })}>
                  <option value="mobile">Mobile (M-Pesa)</option>
                  <option value="bank">Bank account</option>
                </select>
              </div>
              {payoutForm.channel === 'mobile' ? (
                <div>
                  <label className={labelClass}>Phone</label>
                  <input className={inputClass} value={payoutForm.phone} onChange={(e) => setPayoutForm({ ...payoutForm, phone: e.target.value })} placeholder="07XX XXX XXX" required />
                </div>
              ) : (
                <div>
                  <label className={labelClass}>Account number</label>
                  <input className={inputClass} value={payoutForm.accountNumber} onChange={(e) => setPayoutForm({ ...payoutForm, accountNumber: e.target.value })} required />
                </div>
              )}
              <div>
                <label className={labelClass}>Network code</label>
                <input className={inputClass} value={payoutForm.networkCode} onChange={(e) => setPayoutForm({ ...payoutForm, networkCode: e.target.value })} placeholder="safaricom / bank code" required />
              </div>
              <button type="submit" disabled={busy === 'payout'} className="px-4 py-2.5 rounded-xl font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-900 disabled:opacity-60 flex items-center justify-center gap-2">
                {busy === 'payout' ? <FaSpinner className="animate-spin" /> : <FaMoneyBillWave size={12} />} Send
              </button>
            </form>
          </div>
          <div className={cardClass}>
            <h3 className="font-semibold text-white mb-3">Payout history (incl. wallet top-ups)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 text-xs uppercase">
                  <tr>
                    <th className="text-left py-2">Reference</th>
                    <th className="text-left py-2">Channel</th>
                    <th className="text-left py-2">Destination</th>
                    <th className="text-right py-2">Amount</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Created</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-t border-slate-800">
                      <td className="py-2 font-mono text-xs">{p.reference}</td>
                      <td className="py-2">{p.channel}</td>
                      <td className="py-2 font-mono text-xs">{p.phoneNumber || p.accountNumber || '—'}</td>
                      <td className="py-2 text-right">{fmtMoney(p.amount, p.currency)}</td>
                      <td className="py-2"><StatusBadge ok={p.status === 'SUCCEEDED'} text={p.status} /></td>
                      <td className="py-2 text-xs text-slate-400">{fmtDate(p.createdAt)}</td>
                    </tr>
                  ))}
                  {!payouts.length && (
                    <tr><td colSpan={6} className="py-6 text-center text-slate-500">No payouts yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Transactions (PayHero ledger) ── */}
      {tab === 'transactions' && (
        <div className="space-y-6">
          <div className={cardClass}>
            <form onSubmit={lookupStatus} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-64">
                <label className={labelClass}>Check transaction status by reference</label>
                <input className={inputClass} value={statusRef} onChange={(e) => setStatusRef(e.target.value)} placeholder="e.g. ANG-XXXXXX or provider reference" />
              </div>
              <button type="submit" disabled={busy === 'status'} className="px-4 py-2.5 rounded-xl font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-900 disabled:opacity-60 flex items-center gap-2">
                {busy === 'status' ? <FaSpinner className="animate-spin" /> : <FaSearch size={12} />} Check
              </button>
            </form>
            {statusResult && (
              <pre className="mt-3 p-3 rounded-xl bg-slate-950 text-xs text-slate-300 overflow-x-auto border border-slate-800">
                {JSON.stringify(statusResult, null, 2)}
              </pre>
            )}
          </div>
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">PayHero account ledger</h3>
              <div className="flex gap-2">
                <button onClick={() => loadTxns(Math.max(1, txnPage - 1))} className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-600 text-white">Prev</button>
                <span className="px-3 py-1 text-xs text-slate-400">Page {txnPage}</span>
                <button onClick={() => loadTxns(txnPage + 1)} className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-600 text-white">Next</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 text-xs uppercase">
                  <tr>
                    <th className="text-left py-2">Reference</th>
                    <th className="text-left py-2">Details</th>
                    <th className="text-right py-2">Amount</th>
                    <th className="text-left py-2">Ours?</th>
                    <th className="text-left py-2">When</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {txns.map((t, i) => (
                    <tr key={t.id || t.reference || i} className="border-t border-slate-800">
                      <td className="py-2 font-mono text-xs">{t.external_reference || t.reference || '—'}</td>
                      <td className="py-2 text-xs">{t.description || t.transID || t.transaction_reference || JSON.stringify(t).slice(0, 60)}</td>
                      <td className="py-2 text-right">{fmtMoney(t.amount_plain ?? t.amount)}</td>
                      <td className="py-2">{t.matched ? <StatusBadge ok text="matched" /> : <span className="text-xs text-slate-500">—</span>}</td>
                      <td className="py-2 text-xs text-slate-400">{fmtDate(t.created_at || t.createdAt)}</td>
                    </tr>
                  ))}
                  {!txns.length && (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-500">{loading ? 'Loading…' : 'No transactions found.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Paystack (cards) ── */}
      {tab === 'paystack' && (
        <div className="space-y-6">
          <div className={cardClass}>
            <form onSubmit={verifyPaystack} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-64">
                <label className={labelClass}>Verify a transaction (updates our ledger idempotently)</label>
                <input className={inputClass} value={psVerifyRef} onChange={(e) => setPsVerifyRef(e.target.value)} placeholder="Paystack reference" />
              </div>
              <button type="submit" disabled={busy === 'verify'} className="px-4 py-2.5 rounded-xl font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-900 disabled:opacity-60 flex items-center gap-2">
                {busy === 'verify' ? <FaSpinner className="animate-spin" /> : <FaSearch size={12} />} Verify
              </button>
            </form>
            {psVerifyResult && (
              <pre className="mt-3 p-3 rounded-xl bg-slate-950 text-xs text-slate-300 overflow-x-auto border border-slate-800">
                {JSON.stringify(psVerifyResult, null, 2)}
              </pre>
            )}
          </div>

          <div className={cardClass}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">Card transactions</h3>
              <div className="flex gap-2">
                <button onClick={() => loadPaystack(Math.max(1, psPage - 1))} className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-600 text-white">Prev</button>
                <span className="px-3 py-1 text-xs text-slate-400">Page {psPage}</span>
                <button onClick={() => loadPaystack(psPage + 1)} className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-600 text-white">Next</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 text-xs uppercase">
                  <tr>
                    <th className="text-left py-2">Reference</th>
                    <th className="text-left py-2">Customer</th>
                    <th className="text-right py-2">Amount</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">When</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {psTxns.map((t) => (
                    <tr key={t.id} className="border-t border-slate-800">
                      <td className="py-2 font-mono text-xs">{t.reference}</td>
                      <td className="py-2 text-xs">{t.customer?.email || '—'}</td>
                      <td className="py-2 text-right">{fmtMoney((t.amount || 0) / 100, t.currency)}</td>
                      <td className="py-2"><StatusBadge ok={t.status === 'success'} text={t.status} /></td>
                      <td className="py-2 text-xs text-slate-400">{fmtDate(t.created_at)}</td>
                    </tr>
                  ))}
                  {!psTxns.length && (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-500">{loading ? 'Loading…' : 'No Paystack transactions (or key not configured).'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className={`${cardClass} space-y-3`}>
              <h3 className="font-semibold text-white">Add subaccount (partner split)</h3>
              <form onSubmit={createSubaccount} className="space-y-3">
                <div>
                  <label className={labelClass}>Business name</label>
                  <input className={inputClass} value={subForm.businessName} onChange={(e) => setSubForm({ ...subForm, businessName: e.target.value })} required />
                </div>
                <div>
                  <label className={labelClass}>Account number</label>
                  <input className={inputClass} value={subForm.accountNumber} onChange={(e) => setSubForm({ ...subForm, accountNumber: e.target.value })} required />
                </div>
                <div>
                  <label className={labelClass}>Bank code (Paystack)</label>
                  <input className={inputClass} value={subForm.settlementBank} onChange={(e) => setSubForm({ ...subForm, settlementBank: e.target.value })} placeholder="e.g. 058" required />
                </div>
                <div>
                  <label className={labelClass}>Share % (100 = full split to partner)</label>
                  <input type="number" min="0" max="100" className={inputClass} value={subForm.percentageCharge} onChange={(e) => setSubForm({ ...subForm, percentageCharge: e.target.value })} />
                </div>
                <button type="submit" disabled={busy === 'subaccount'} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-900 disabled:opacity-60">
                  {busy === 'subaccount' ? <FaSpinner className="animate-spin" /> : <FaPlus size={12} />} Create subaccount
                </button>
              </form>
            </div>
            <div className={`${cardClass} lg:col-span-2`}>
              <h3 className="font-semibold text-white mb-3">Subaccounts</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-slate-400 text-xs uppercase">
                    <tr>
                      <th className="text-left py-2">Business</th>
                      <th className="text-left py-2">Subaccount code</th>
                      <th className="text-right py-2">Share %</th>
                      <th className="text-left py-2">Bank</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-200">
                    {subaccounts.map((s) => (
                      <tr key={s.id} className="border-t border-slate-800">
                        <td className="py-2">{s.business_name}</td>
                        <td className="py-2 font-mono text-xs">{s.subaccount_code}</td>
                        <td className="py-2 text-right">{s.percentage_charge}</td>
                        <td className="py-2 text-xs">{s.settlement_bank}</td>
                      </tr>
                    ))}
                    {!subaccounts.length && (
                      <tr><td colSpan={4} className="py-6 text-center text-slate-500">No subaccounts yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsAdmin;