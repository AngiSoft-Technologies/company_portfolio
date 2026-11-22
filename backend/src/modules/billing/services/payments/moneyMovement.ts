/**
 * Unified money-movement registry.
 *
 * C2B  — clients pay us (PayPal wallet/cards/wallets, PayHero M-Pesa/Airtel/
 *        telco, Safaricom Daraja STK).
 * B2C  — we pay clients/staff/suppliers (Daraja B2C, PayHero mobile wallet,
 *        PayPal Payouts).
 * B2B  — we pay businesses (Daraja B2B, PayHero bank paybill, PayPal Payouts).
 * Plus refunds, reversals and status lookups across all three gateways.
 *
 * This is a catalogue plus dispatch contract. Every operation remains
 * capability-gated and idempotent at the caller/route layer.
 */

import { listPaymentMethods } from './methods';
import * as paypal from './paypalService';
import * as payhero from './payheroService';
import * as mpesa from './mpesaService';
import * as daraja from './darajaPayouts';
import * as paypalPayouts from './paypalPayouts';

export type MoneyFlow = 'C2B' | 'B2C' | 'B2B' | 'REFUND' | 'REVERSAL' | 'STATUS';

export interface MoneyType {
  id: string;
  flow: MoneyFlow;
  label: string;
  provider: 'PAYPAL' | 'PAYHERO' | 'MPESA';
  region: 'Kenya' | 'International' | 'Both';
  available: boolean;
  reason?: string;
  description: string;
  requires?: string[];
}

const darajaReady = () => mpesa.isConfigured() && daraja.isConfigured();
const payheroReady = () => payhero.isConfigured();
const paypalReady = () => paypal.isConfigured();

export function listMoneyTypes(): MoneyType[] {
  const c2b: MoneyType[] = listPaymentMethods().map((m) => ({
    id: m.id,
    flow: 'C2B',
    label: m.label,
    provider: m.provider as MoneyType['provider'],
    region: m.provider === 'PAYPAL' ? 'International' : 'Kenya',
    available: m.available,
    reason: m.reason,
    description: m.note || `Client pays via ${m.label}`,
    requires: m.requiresPhone ? ['phone'] : undefined,
  }));

  const outbound: MoneyType[] = [
    {
      id: 'MPESA_B2C', flow: 'B2C', label: 'M-Pesa B2C (send to phone)', provider: 'MPESA',
      region: 'Kenya', available: darajaReady(),
      reason: darajaReady() ? undefined : 'Daraja B2C initiator credentials are not configured',
      description: 'Send money from the business shortcode to a customer or staff M-Pesa wallet.',
      requires: ['phone', 'amount', 'commandId'],
    },
    {
      id: 'MPESA_B2B', flow: 'B2B', label: 'M-Pesa B2B (pay business)', provider: 'MPESA',
      region: 'Kenya', available: darajaReady(),
      reason: darajaReady() ? undefined : 'Daraja B2B initiator credentials are not configured',
      description: 'Pay a business paybill or till directly from the business shortcode.',
      requires: ['shortcode', 'amount', 'commandId'],
    },
    {
      id: 'MPESA_REVERSAL', flow: 'REVERSAL', label: 'M-Pesa reversal', provider: 'MPESA',
      region: 'Kenya', available: darajaReady(),
      reason: darajaReady() ? undefined : 'Daraja initiator credentials are not configured',
      description: 'Reverse a mistakenly completed M-Pesa transaction.',
      requires: ['transactionId', 'amount', 'remarks'],
    },
    {
      id: 'PAYHERO_B2C_MOBILE', flow: 'B2C', label: 'PayHero mobile payout', provider: 'PAYHERO',
      region: 'Kenya', available: payheroReady(),
      reason: payheroReady() ? undefined : 'PayHero is not configured',
      description: 'Withdraw to a mobile wallet through a PayHero paybill/till channel.',
      requires: ['phone', 'amount'],
    },
    {
      id: 'PAYHERO_B2B_BANK', flow: 'B2B', label: 'PayHero bank payout', provider: 'PAYHERO',
      region: 'Kenya', available: payheroReady(),
      reason: payheroReady() ? undefined : 'PayHero is not configured',
      description: 'Pay a supplier bank account or Sacco through PayHero.',
      requires: ['amount', 'channel'],
    },
    {
      id: 'PAYHERO_STATUS', flow: 'STATUS', label: 'PayHero transaction status', provider: 'PAYHERO',
      region: 'Kenya', available: payheroReady(),
      reason: payheroReady() ? undefined : 'PayHero is not configured',
      description: 'Look up the live status of a PayHero transaction by reference.',
      requires: ['reference'],
    },
    {
      id: 'PAYPAL_PAYOUT', flow: 'B2C', label: 'PayPal payout', provider: 'PAYPAL',
      region: 'International', available: paypalReady(),
      reason: paypalReady() ? undefined : 'PayPal is not configured',
      description: 'Send funds to a PayPal account, email or phone recipient worldwide.',
      requires: ['receiver', 'recipientType', 'amount'],
    },
    {
      id: 'PAYPAL_B2B_PAYOUT', flow: 'B2B', label: 'PayPal business payout', provider: 'PAYPAL',
      region: 'International', available: paypalReady(),
      reason: paypalReady() ? undefined : 'PayPal is not configured',
      description: 'Pay a business PayPal account with the same Payouts API.',
      requires: ['receiver', 'recipientType', 'amount'],
    },
    {
      id: 'PAYPAL_REFUND', flow: 'REFUND', label: 'PayPal refund', provider: 'PAYPAL',
      region: 'International', available: paypalReady(),
      reason: paypalReady() ? undefined : 'PayPal is not configured',
      description: 'Refund a captured PayPal payment (full or partial).',
      requires: ['captureId'],
    },
    {
      id: 'PAYPAL_PAYOUT_STATUS', flow: 'STATUS', label: 'PayPal payout status', provider: 'PAYPAL',
      region: 'International', available: paypalReady(),
      reason: paypalReady() ? undefined : 'PayPal is not configured',
      description: 'Track a PayPal payout batch or an individual payout item.',
      requires: ['batchId'],
    },
    {
      id: 'MPESA_STATUS', flow: 'STATUS', label: 'M-Pesa transaction status', provider: 'MPESA',
      region: 'Kenya', available: darajaReady(),
      reason: darajaReady() ? undefined : 'Daraja is not configured',
      description: 'Query Safaricom for the state of a transaction.',
      requires: ['transactionId'],
    },
    {
      id: 'MPESA_BALANCE', flow: 'STATUS', label: 'M-Pesa account balance', provider: 'MPESA',
      region: 'Kenya', available: darajaReady(),
      reason: darajaReady() ? undefined : 'Daraja is not configured',
      description: 'Read the business shortcode account balance for payout preflight checks.',
    },
    {
      id: 'PAYHERO_BALANCE', flow: 'STATUS', label: 'PayHero wallet balance', provider: 'PAYHERO',
      region: 'Kenya', available: payheroReady(),
      reason: payheroReady() ? undefined : 'PayHero is not configured',
      description: 'Read the service or payment wallet balance before moving funds.',
      requires: ['walletType'],
    },
    {
      id: 'PAYHERO_TOPUP', flow: 'B2B', label: 'PayHero wallet top-up', provider: 'PAYHERO',
      region: 'Kenya', available: payheroReady(),
      reason: payheroReady() ? undefined : 'PayHero is not configured',
      description: 'Fund the PayHero service wallet from an M-Pesa phone line.',
      requires: ['phone', 'amount'],
    },
    {
      id: 'PAYPAL_REFUND_STATUS', flow: 'STATUS', label: 'PayPal refund status', provider: 'PAYPAL',
      region: 'International', available: paypalReady(),
      reason: paypalReady() ? undefined : 'PayPal is not configured',
      description: 'Look up a PayPal refund by id.',
      requires: ['refundId'],
    },
    {
      id: 'PAYPAL_ORDER_STATUS', flow: 'STATUS', label: 'PayPal order status', provider: 'PAYPAL',
      region: 'International', available: paypalReady(),
      reason: paypalReady() ? undefined : 'PayPal is not configured',
      description: 'Read the live status of a PayPal order (checkout only; never captures it).',
      requires: ['orderId'],
    },
    {
      id: 'PAYPAL_CAPTURE_STATUS', flow: 'STATUS', label: 'PayPal capture lookup', provider: 'PAYPAL',
      region: 'International', available: paypalReady(),
      reason: paypalReady() ? undefined : 'PayPal is not configured',
      description: 'Read a captured payment by capture id to resolve refunds (read-only).',
      requires: ['captureId'],
    },
    // Daraja adapter-only capabilities from the local developer pack. They are
    // deliberately visible but inert: no dispatch path exists until official
    // Safaricom enablement and a dedicated approval gate are in place.
    {
      id: 'MPESA_POCHI', flow: 'B2C', label: 'M-Pesa Pochi payout', provider: 'MPESA',
      region: 'Kenya', available: false,
      reason: 'Official Daraja enablement and capability approval required',
      description: 'Send money to a Pochi wallet (adapter implemented, not enabled).',
      requires: ['phone', 'amount'],
    },
    {
      id: 'MPESA_STANDING_ORDER', flow: 'B2B', label: 'M-Pesa standing order', provider: 'MPESA',
      region: 'Kenya', available: false,
      reason: 'Official Daraja enablement and capability approval required',
      description: 'Create a recurring standing order (adapter implemented, not enabled).',
      requires: ['amount'],
    },
    {
      id: 'MPESA_TAX_REMITTANCE', flow: 'B2B', label: 'M-Pesa tax remittance', provider: 'MPESA',
      region: 'Kenya', available: false,
      reason: 'Official Daraja enablement and capability approval required',
      description: 'Remit tax through Daraja (adapter implemented, not enabled).',
      requires: ['amount'],
    },
  ];

  return [...c2b, ...outbound];
}

export function getMoneyType(id: string, includeUnavailable = false): MoneyType | null {
  return listMoneyTypes().find((t) => t.id === id && (includeUnavailable || t.available)) || null;
}

export function moneyMovementSummary() {
  const types = listMoneyTypes();
  const byFlow = types.reduce<Record<string, number>>((acc, t) => {
    acc[t.flow] = (acc[t.flow] || 0) + 1;
    return acc;
  }, {});
  return {
    flows: ['C2B', 'B2C', 'B2B', 'REFUND', 'REVERSAL', 'STATUS'],
    byFlow,
    available: types.filter((t) => t.available).length,
    total: types.length,
    types,
  };
}
