CREATE TABLE "ReconciliationRun" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "financeAccountId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "summary" JSONB,
  "error" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CommunicationTemplate" (
  "id" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "provider" TEXT,
  "name" TEXT NOT NULL,
  "language" TEXT DEFAULT 'en',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "externalId" TEXT,
  "body" TEXT,
  "variables" JSONB,
  "metadata" JSONB,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunicationTemplate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReconciliationRun_provider_createdAt_idx" ON "ReconciliationRun"("provider","createdAt");
CREATE INDEX "ReconciliationRun_status_idx" ON "ReconciliationRun"("status");
CREATE INDEX "CommunicationTemplate_channel_status_idx" ON "CommunicationTemplate"("channel","status");
CREATE INDEX "CommunicationTemplate_provider_externalId_idx" ON "CommunicationTemplate"("provider","externalId");
CREATE INDEX "LedgerEntry_providerEventId_idx" ON "LedgerEntry"("providerEventId");
ALTER TABLE "ReconciliationRun" ADD CONSTRAINT "ReconciliationRun_financeAccountId_fkey" FOREIGN KEY ("financeAccountId") REFERENCES "FinanceAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReconciliationRun" ADD CONSTRAINT "ReconciliationRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommunicationTemplate" ADD CONSTRAINT "CommunicationTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
