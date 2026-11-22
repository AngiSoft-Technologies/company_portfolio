/**
 * Canonical finance capability matrix (plan §18.8, slices 7B/7C).
 *
 * The matrix is the single source of truth for what the Finance Hub may do with
 * a provider. Capabilities are intentionally fail-closed: an action is enabled
 * only when the adapter supports it AND the credentials/configuration it needs
 * are present. PesaFlow is adapter-ready but stays disabled until configured;
 * Stripe and Paystack are legacy-only and are never exposed to new flows.
 */

import { getConfig } from '../../../shared/services/runtimeConfig';
import { isConfigured as paypalConfigured } from '../../billing/services/payments/paypalService';
import { isConfigured as paypalPayoutsConfigured } from '../../billing/services/payments/paypalPayouts';
import { isConfigured as payheroConfigured } from '../../billing/services/payments/payheroService';
import { isConfigured as mpesaConfigured } from '../../billing/services/payments/mpesaService';
import { isConfigured as darajaConfigured } from '../../billing/services/payments/darajaPayouts';
import { isConfigured as paystackConfigured } from '../../billing/services/payments/paystackService';

export type FinanceAction =
  | 'collect'
  | 'refund'
  | 'payout_b2c'
  | 'payout_b2b'
  | 'reversal'
  | 'status'
  | 'webhook'
  | 'reconciliation'
  | 'settlement'
  | 'disputes'
  | 'sandbox_only'
  | 'external_approval_required';

export type FinanceProvider =
  | 'PAYPAL'
  | 'PAYHERO'
  | 'MPESA'
  | 'PESAFLOW'
  | 'PAYSTACK'
  | 'STRIPE'
  | 'GENERIC';

export const FINANCE_ACTIONS: readonly FinanceAction[] = [
  'collect',
  'refund',
  'payout_b2c',
  'payout_b2b',
  'reversal',
  'status',
  'webhook',
  'reconciliation',
  'settlement',
  'disputes',
  'sandbox_only',
  'external_approval_required',
] as const;

export type RailRegion = 'INTERNATIONAL' | 'EAST_AFRICA' | 'LEGACY' | 'NONE';

export interface PayHeroChannelCapability {
  id: string;
  label: string;
  network: string;
  flow: 'C2B' | 'B2C' | 'B2B';
  enabled: boolean;
  /** Config key that must be present — never the credential value itself. */
  configKey?: string;
  reason?: string;
}

export interface ProviderCapabilities {
  provider: string;
  /** Canonical provider key after alias normalization (e.g. DARAJA → MPESA). */
  key: string;
  label: string;
  legacy: boolean;
  configured: boolean;
  available: boolean;
  /** Default routing region for this rail (plan §18 payment-rail policy). */
  defaultFor: RailRegion;
  /** Settlement currency policy; original invoice currency is kept in metadata. */
  currencyPolicy?: string;
  actions: Record<FinanceAction, boolean>;
  reasons: Partial<Record<FinanceAction, string>>;
  /** PayHero channel/network matrix; empty for other providers. */
  channels?: PayHeroChannelCapability[];
  /** Human-readable reason when the provider itself is unavailable. */
  unavailableReason?: string;
}

const ALL_ACTIONS = (): Record<FinanceAction, boolean> => ({
  collect: false,
  refund: false,
  payout_b2c: false,
  payout_b2b: false,
  reversal: false,
  status: false,
  webhook: false,
  reconciliation: false,
  settlement: false,
  disputes: false,
  sandbox_only: false,
  external_approval_required: false,
});

export function normalizeProvider(provider: unknown): string {
  const value = String(provider || '').trim().toUpperCase();
  if (value === 'DARAJA' || value === 'MPESA_DARAJA' || value === 'SAFARICOM') return 'MPESA';
  if (value === 'PAYPAL_PAYOUTS') return 'PAYPAL';
  if (value === 'PAYHERO_B2C' || value === 'PAYHERO_B2B') return 'PAYHERO';
  return value || 'GENERIC';
}

function pesaflowConfigured(): boolean {
  return Boolean(
    getConfig('PESAFLOW_API_KEY') &&
    getConfig('PESAFLOW_API_SECRET') &&
    getConfig('PESAFLOW_BASE_URL'),
  );
}

function missingPesaflowConfig(): string[] {
  const missing: string[] = [];
  if (!getConfig('PESAFLOW_API_KEY')) missing.push('PESAFLOW_API_KEY');
  if (!getConfig('PESAFLOW_API_SECRET')) missing.push('PESAFLOW_API_SECRET');
  if (!getConfig('PESAFLOW_BASE_URL')) missing.push('PESAFLOW_BASE_URL');
  return missing;
}

/**
 * PayHero channel/network matrix. Availability is capability-gated by the
 * runtime config keys below; no channel id or network code is hardcoded.
 */
export function listPayHeroChannels(): PayHeroChannelCapability[] {
  const ready = payheroConfigured();
  const channel = (
    id: string,
    label: string,
    network: string,
    flow: PayHeroChannelCapability['flow'],
    configKey: string,
  ): PayHeroChannelCapability => {
    const configured = Boolean(getConfig(configKey));
    return {
      id,
      label,
      network,
      flow,
      configKey,
      enabled: ready && configured,
      reason: !ready
        ? 'PayHero is not configured'
        : !configured
          ? `${configKey} is not configured`
          : undefined,
    };
  };
  return [
    channel('MPESA_STK', 'M-Pesa STK (PayHero)', 'safaricom', 'C2B', 'PAYHERO_CHANNEL_ID'),
    channel('AIRTEL_MONEY', 'Airtel Money', 'airtel', 'C2B', 'PAYHERO_AIRTEL_CHANNEL_ID'),
    channel('TELCO', 'Telco / operator billing', 'telco', 'C2B', 'PAYHERO_TELCO_CHANNEL_ID'),
    channel('SAFARICOM_B2C', 'Safaricom wallet payout', 'safaricom', 'B2C', 'PAYHERO_MOBILE_NETWORK_CODE'),
    channel('BANK_B2B', 'Bank / Sacco payout', 'bank', 'B2B', 'PAYHERO_BANK_NETWORK_CODE'),
  ];
}

interface MatrixDefinition {
  key: string;
  label: string;
  legacy?: boolean;
  defaultFor: RailRegion;
  currencyPolicy?: string;
  configured: () => boolean;
  unavailableReason?: () => string | undefined;
  actions: Partial<Record<FinanceAction, boolean | (() => boolean)>>;
  reasons?: Partial<Record<FinanceAction, string>>;
}

const MATRIX: MatrixDefinition[] = [
  {
    key: 'PAYPAL',
    label: 'PayPal',
    defaultFor: 'INTERNATIONAL',
    currencyPolicy: 'Settles in PAYPAL_CURRENCY; original invoice currency/amount preserved in metadata',
    // Webhook verification is part of PayPal readiness: without the webhook id
    // we cannot settle/correct captures safely, so the rail fails closed.
    configured: () => paypalConfigured() && paypalPayoutsConfigured() && Boolean(getConfig('PAYPAL_WEBHOOK_ID')),
    unavailableReason: () => {
      if (!paypalConfigured() || !paypalPayoutsConfigured()) return 'PayPal credentials are not configured';
      return getConfig('PAYPAL_WEBHOOK_ID') ? undefined : 'PAYPAL_WEBHOOK_ID is required to verify PayPal webhooks';
    },
    actions: {
      collect: true,
      refund: () => paypalPayoutsConfigured(),
      payout_b2c: () => paypalPayoutsConfigured(),
      payout_b2b: () => paypalPayoutsConfigured(),
      reversal: false,
      status: true,
      webhook: () => Boolean(getConfig('PAYPAL_WEBHOOK_ID')),
      reconciliation: true,
      settlement: () => paypalPayoutsConfigured(),
      disputes: true,
      external_approval_required: true,
    },
    reasons: {
      refund: 'PayPal credentials are not configured',
      payout_b2c: 'PayPal credentials are not configured',
      payout_b2b: 'PayPal credentials are not configured',
      webhook: 'PAYPAL_WEBHOOK_ID is required to verify PayPal webhooks',
      settlement: 'PayPal credentials are not configured',
    },
  },
  {
    key: 'PAYHERO',
    label: 'PayHero',
    defaultFor: 'EAST_AFRICA',
    currencyPolicy: 'KES by default; channels/network codes read from runtime config',
    configured: () => payheroConfigured(),
    unavailableReason: () => 'PayHero credentials are not configured',
    actions: {
      collect: true,
      refund: false,
      payout_b2c: true,
      payout_b2b: true,
      reversal: false,
      status: true,
      webhook: () => Boolean(getConfig('PAYHERO_CALLBACK_TOKEN')),
      reconciliation: true,
      settlement: false,
      disputes: false,
      external_approval_required: true,
    },
    reasons: {
      refund: 'PayHero has no refund API wired',
      reversal: 'Use the Daraja reversal adapter for M-Pesa transactions',
      webhook: 'PAYHERO_CALLBACK_TOKEN is required to authenticate callbacks',
      settlement: 'PayHero settlement export is not wired',
    },
  },
  {
    key: 'MPESA',
    label: 'M-Pesa / Daraja',
    defaultFor: 'EAST_AFRICA',
    currencyPolicy: 'KES; Safaricom STK, B2C, B2B, status and reversals',
    configured: () => mpesaConfigured() || darajaConfigured(),
    unavailableReason: () => 'Daraja credentials are not configured',
    actions: {
      collect: () => mpesaConfigured(),
      refund: false,
      payout_b2c: () => darajaConfigured(),
      payout_b2b: () => darajaConfigured(),
      reversal: () => darajaConfigured(),
      status: () => darajaConfigured(),
      webhook: () => Boolean(getConfig('MPESA_CALLBACK_TOKEN')),
      reconciliation: true,
      settlement: false,
      disputes: false,
      external_approval_required: true,
    },
    reasons: {
      collect: 'Daraja STK Push credentials are not configured',
      refund: 'Daraja does not expose a refund API; use reversal',
      payout_b2c: 'Daraja B2C initiator credentials are not configured',
      payout_b2b: 'Daraja B2B initiator credentials are not configured',
      reversal: 'Daraja initiator credentials are not configured',
      status: 'Daraja credentials are not configured',
      webhook: 'MPESA_CALLBACK_TOKEN is required to authenticate callbacks',
      settlement: 'Daraja settlement export is not wired',
    },
  },
  {
    key: 'PESAFLOW',
    label: 'PesaFlow',
    defaultFor: 'EAST_AFRICA',
    currencyPolicy: 'KES by default via PESAFLOW_CURRENCY',
    configured: pesaflowConfigured,
    unavailableReason: () => {
      const missing = missingPesaflowConfig();
      return missing.length
        ? `PesaFlow adapter is ready but unavailable until configured (missing: ${missing.join(', ')})`
        : undefined;
    },
    // Adapter-ready: capabilities describe what it can do once credentials exist.
    actions: {
      collect: true,
      refund: true,
      status: true,
      webhook: true,
      reconciliation: true,
      settlement: true,
      disputes: false,
      reversal: false,
      payout_b2c: false,
      payout_b2b: false,
      external_approval_required: true,
      sandbox_only: () => getConfig('PESAFLOW_ENV', 'sandbox').toLowerCase() !== 'live',
    },
    reasons: {
      payout_b2c: 'PesaFlow payouts are not enabled in this adapter',
      payout_b2b: 'PesaFlow payouts are not enabled in this adapter',
      reversal: 'PesaFlow does not expose a reversal API',
      disputes: 'PesaFlow does not expose a disputes API',
    },
  },
  {
    key: 'PAYSTACK',
    label: 'Paystack (legacy)',
    legacy: true,
    defaultFor: 'LEGACY',
    configured: () => paystackConfigured(),
    unavailableReason: () => 'Paystack is legacy-only; not available to the Finance Hub',
    actions: ALL_ACTIONS(),
    reasons: {
      collect: 'Legacy-only: client checkout is disabled',
      refund: 'Legacy-only: refunds must use PayPal or PesaFlow',
      status: 'Legacy-only',
      reconciliation: 'Legacy-only',
    },
  },
  {
    key: 'STRIPE',
    label: 'Stripe (legacy)',
    legacy: true,
    defaultFor: 'LEGACY',
    configured: () => Boolean(process.env.STRIPE_SECRET),
    unavailableReason: () => 'Stripe is legacy-only; not available to the Finance Hub',
    actions: ALL_ACTIONS(),
    reasons: {
      collect: 'Legacy-only: client checkout is disabled',
      refund: 'Legacy-only: refunds must use PayPal or PesaFlow',
      status: 'Legacy-only',
      reconciliation: 'Legacy-only',
    },
  },
  {
    key: 'GENERIC',
    label: 'Generic webhook',
    defaultFor: 'NONE',
    configured: () => true,
    actions: {
      webhook: true,
      reconciliation: true,
      external_approval_required: true,
    },
  },
];

function resolveActionValue(definition: MatrixDefinition, action: FinanceAction): boolean {
  const value = definition.actions[action];
  if (typeof value === 'function') {
    try {
      return Boolean(value());
    } catch {
      return false;
    }
  }
  return Boolean(value);
}

function buildCapabilities(definition: MatrixDefinition): ProviderCapabilities {
  const configured = Boolean(definition.configured());
  const actions = ALL_ACTIONS();
  const reasons: Partial<Record<FinanceAction, string>> = { ...(definition.reasons || {}) };
  const unavailableReason = definition.unavailableReason?.();

  for (const action of FINANCE_ACTIONS) {
    if (action === 'sandbox_only' || action === 'external_approval_required') {
      actions[action] = resolveActionValue(definition, action);
      continue;
    }
    const supported = resolveActionValue(definition, action);
    actions[action] = configured && supported;
    if (!configured && supported && !reasons[action]) {
      reasons[action] = unavailableReason || 'Provider is not configured';
    }
  }

  return {
    provider: definition.key,
    key: definition.key,
    label: definition.label,
    legacy: Boolean(definition.legacy),
    defaultFor: definition.defaultFor,
    currencyPolicy: definition.currencyPolicy,
    configured,
    // "available" means at least one money action is currently usable.
    available: !definition.legacy && configured && FINANCE_ACTIONS.some(
      (action) => action !== 'sandbox_only' && action !== 'external_approval_required' && actions[action],
    ),
    actions,
    reasons,
    ...(definition.key === 'PAYHERO' ? { channels: listPayHeroChannels() } : {}),
    unavailableReason: configured ? undefined : unavailableReason,
  };
}

/** Canonical capabilities for one provider. Unknown providers fail closed. */
export function getProviderCapabilities(provider: unknown): ProviderCapabilities {
  const key = normalizeProvider(provider);
  const definition = MATRIX.find((item) => item.key === key);
  if (!definition) {
    const actions = ALL_ACTIONS();
    return {
      provider: key,
      key,
      label: key,
      legacy: false,
      defaultFor: 'NONE',
      configured: false,
      available: false,
      actions,
      reasons: { collect: 'Unknown provider' },
      unavailableReason: 'Unknown provider',
    };
  }
  return buildCapabilities(definition);
}

/** True only when the adapter supports the action and its config is present. */
export function isCapabilityEnabled(provider: unknown, action: FinanceAction): boolean {
  return getProviderCapabilities(provider).actions[action] === true;
}

/** Snapshot of the full matrix for the admin UI. */
export function listCapabilityMatrix(): ProviderCapabilities[] {
  return MATRIX.map(buildCapabilities);
}

/** Reason an action is disabled, for surfacing in the UI and 403/503 errors. */
export function capabilityReason(provider: unknown, action: FinanceAction): string {
  const capabilities = getProviderCapabilities(provider);
  return capabilities.reasons[action]
    || capabilities.unavailableReason
    || `${action} is not supported by ${capabilities.label}`;
}

export default {
  getProviderCapabilities,
  isCapabilityEnabled,
  listCapabilityMatrix,
  listPayHeroChannels,
  capabilityReason,
  normalizeProvider,
};
