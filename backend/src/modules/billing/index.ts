/**
 * @angisoft/billing - Billing and payments module
 *
 * Shared utilities for money handling, payment processing, and billing operations.
 * Source-exported from packages/ or used directly in backend modules.
 */

export { toMoney, fromMoney, sumMoney, addMoney } from './utils/money'
export * as paymentService from './services/payments'
export { default as paymentRouter } from './routes/payments'
export type { Money } from './utils/money'