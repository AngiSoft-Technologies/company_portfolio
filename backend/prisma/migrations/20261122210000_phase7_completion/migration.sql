-- Phase 7 completion: normalized finance/communications workflow tables.
-- All statements are additive and safe to re-run against an existing Phase 7 foundation.

ALTER TABLE "EmployeeEmail" ADD COLUMN IF NOT EXISTS "verificationTokenHash" TEXT;

ALTER TABLE "CommunicationAccount"
  ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastError" TEXT;

ALTER TABLE "CommunicationGrant" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

ALTER TABLE "Contact"
  ADD COLUMN IF NOT EXISTS "clientId" TEXT,
  ADD COLUMN IF NOT EXISTS "leadId" TEXT,
  ADD COLUMN IF NOT EXISTS "employeeId" TEXT;

ALTER TABLE "Conversation"
  ADD COLUMN IF NOT EXISTS "windowExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "slaDueAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "slaBreachedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "FinanceTransaction" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "externalRef" TEXT,
  "transactionType" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "fee" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "net" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "accountRef" TEXT,
  "customerRef" TEXT,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "providerEventId" TEXT,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceTransaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FinanceTransaction_provider_externalRef_idx" ON "FinanceTransaction"("provider", "externalRef");
CREATE INDEX IF NOT EXISTS "FinanceTransaction_status_occurredAt_idx" ON "FinanceTransaction"("status", "occurredAt");
CREATE INDEX IF NOT EXISTS "FinanceTransaction_sourceType_sourceId_idx" ON "FinanceTransaction"("sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "FinanceTransaction_providerEventId_idx" ON "FinanceTransaction"("providerEventId");

CREATE TABLE IF NOT EXISTS "ReconciliationItem" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "externalRef" TEXT,
  "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "note" TEXT,
  "resolvedById" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "ReconciliationItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ReconciliationItem_runId_status_idx" ON "ReconciliationItem"("runId", "status");
CREATE INDEX IF NOT EXISTS "ReconciliationItem_type_idx" ON "ReconciliationItem"("type");
CREATE INDEX IF NOT EXISTS "ReconciliationItem_externalRef_idx" ON "ReconciliationItem"("externalRef");

CREATE TABLE IF NOT EXISTS "Refund" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT,
  "provider" TEXT NOT NULL,
  "externalRef" TEXT,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedById" TEXT,
  "approvedById" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Refund_paymentId_idx" ON "Refund"("paymentId");
CREATE INDEX IF NOT EXISTS "Refund_provider_externalRef_idx" ON "Refund"("provider", "externalRef");
CREATE INDEX IF NOT EXISTS "Refund_status_idx" ON "Refund"("status");

CREATE TABLE IF NOT EXISTS "Dispute" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT,
  "provider" TEXT NOT NULL,
  "externalRef" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "reason" TEXT,
  "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "dueAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Dispute_provider_externalRef_idx" ON "Dispute"("provider", "externalRef");
CREATE INDEX IF NOT EXISTS "Dispute_status_idx" ON "Dispute"("status");

CREATE TABLE IF NOT EXISTS "Settlement" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "financeAccountId" TEXT,
  "externalRef" TEXT,
  "gross" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "fees" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "net" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Settlement_provider_externalRef_idx" ON "Settlement"("provider", "externalRef");
CREATE INDEX IF NOT EXISTS "Settlement_status_idx" ON "Settlement"("status");

CREATE TABLE IF NOT EXISTS "Beneficiary" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "phoneNumber" TEXT,
  "accountNumber" TEXT,
  "bankCode" TEXT,
  "networkCode" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "metadata" JSONB,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Beneficiary_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Beneficiary_channel_isActive_idx" ON "Beneficiary"("channel", "isActive");

CREATE TABLE IF NOT EXISTS "PayoutApproval" (
  "id" TEXT NOT NULL,
  "payoutId" TEXT NOT NULL,
  "requestedById" TEXT,
  "approvedById" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "decisionNote" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PayoutApproval_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PayoutApproval_payoutId_status_idx" ON "PayoutApproval"("payoutId", "status");

CREATE TABLE IF NOT EXISTS "ConversationParticipant" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'WATCHER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ConversationParticipant_conversationId_idx" ON "ConversationParticipant"("conversationId");
CREATE INDEX IF NOT EXISTS "ConversationParticipant_employeeId_idx" ON "ConversationParticipant"("employeeId");

CREATE TABLE IF NOT EXISTS "RoutingRule" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "channel" TEXT,
  "conditions" JSONB,
  "actions" JSONB,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RoutingRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RoutingRule_enabled_priority_idx" ON "RoutingRule"("enabled", "priority");

CREATE TABLE IF NOT EXISTS "EmailSendAsIdentity" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "displayName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailSendAsIdentity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EmailSendAsIdentity_accountId_email_idx" ON "EmailSendAsIdentity"("accountId", "email");

CREATE TABLE IF NOT EXISTS "EmailDraft" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "conversationId" TEXT,
  "toAddresses" TEXT[] NOT NULL DEFAULT '{}',
  "ccAddresses" TEXT[] NOT NULL DEFAULT '{}',
  "subject" TEXT,
  "body" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailDraft_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EmailDraft_accountId_status_idx" ON "EmailDraft"("accountId", "status");

CREATE TABLE IF NOT EXISTS "EmailThread" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "externalThreadId" TEXT NOT NULL,
  "subject" TEXT,
  "lastMessageAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailThread_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EmailThread_accountId_externalThreadId_idx" ON "EmailThread"("accountId", "externalThreadId");

CREATE TABLE IF NOT EXISTS "EmailFolder" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "externalId" TEXT,
  "unreadCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailFolder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EmailFolder_accountId_name_idx" ON "EmailFolder"("accountId", "name");

CREATE TABLE IF NOT EXISTS "EmailAttachment" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "mimeType" TEXT,
  "size" INTEGER NOT NULL DEFAULT 0,
  "storageKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EmailAttachment_messageId_idx" ON "EmailAttachment"("messageId");
