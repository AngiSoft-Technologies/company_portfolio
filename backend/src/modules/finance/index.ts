/**
 * Finance Hub router barrel.
 *
 * Mount with `app.use('/v1/admin/finance', ...)`. Each router also accepts its
 * bare sub-path (e.g. `/accounts`) so it can be mounted at
 * `/v1/admin/finance/accounts` during incremental rollout.
 */

export { default as financeAccountsRouter } from './routes/accounts';
export { default as financeAuditRouter } from './routes/audit';
export { default as financeBeneficiariesRouter } from './routes/beneficiaries';
export { default as financeCapabilitiesRouter } from './routes/capabilities';
export { default as financeConnectionsRouter } from './routes/connections';
export { default as financeDisputesRouter } from './routes/disputes';
export { default as financeOverviewRouter } from './routes/overview';
export { default as financePayoutsRouter } from './routes/payouts';
export { default as financeReconciliationRouter } from './routes/reconciliation';
export { default as financeRefundsRouter } from './routes/refunds';
export { default as financeReportsRouter } from './routes/reports';
export { default as financeSettlementsRouter } from './routes/settlements';
export { default as financeTransactionsRouter } from './routes/transactions';
export { default as financeWebhooksRouter, processProviderEvent } from './routes/webhooks';
