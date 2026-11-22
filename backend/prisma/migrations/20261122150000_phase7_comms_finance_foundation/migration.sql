-- Phase 7 foundation: provider connections, secrets, events, communications, finance

CREATE TABLE "ProviderConnection" (
  "id" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "environment" TEXT NOT NULL DEFAULT 'LIVE',
  "externalAccountId" TEXT,
  "capabilities" JSONB,
  "config" JSONB,
  "webhookSecretRef" TEXT,
  "lastSyncAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProviderConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderSecret" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "ciphertext" TEXT NOT NULL,
  "iv" TEXT NOT NULL,
  "authTag" TEXT NOT NULL,
  "keyVersion" INTEGER NOT NULL DEFAULT 1,
  "rotatedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProviderSecret_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderEvent" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT,
  "provider" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "externalEventId" TEXT,
  "eventType" TEXT NOT NULL,
  "signatureValid" BOOLEAN NOT NULL DEFAULT false,
  "dedupeKey" TEXT NOT NULL,
  "payload" JSONB,
  "headers" JSONB,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "error" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalSyncCursor" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "cursor" TEXT,
  "lastSuccessAt" TIMESTAMP(3),
  "lastError" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalSyncCursor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunicationAccount" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "externalId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "capabilities" JSONB,
  "config" JSONB,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunicationAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunicationGrant" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Contact" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "company" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContactIdentity" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "externalId" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactIdentity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "contactId" TEXT,
  "channel" TEXT NOT NULL,
  "externalThreadId" TEXT,
  "subject" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "assigneeId" TEXT,
  "lastMessageAt" TIMESTAMP(3),
  "lastMessagePreview" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "direction" TEXT NOT NULL,
  "senderType" TEXT NOT NULL,
  "senderId" TEXT,
  "senderAddress" TEXT,
  "bodyText" TEXT,
  "bodyRich" JSONB,
  "attachments" JSONB,
  "deliveryStatus" TEXT DEFAULT 'PENDING',
  "sentAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceAccount" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "accountType" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "externalId" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "capabilities" JSONB,
  "config" JSONB,
  "balance" DECIMAL(18,2),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LedgerEntry" (
  "id" TEXT NOT NULL,
  "financeAccountId" TEXT,
  "provider" TEXT NOT NULL,
  "externalRef" TEXT,
  "entryType" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "fee" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "net" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "sourceType" TEXT,
  "sourceId" TEXT,
  "providerEventId" TEXT,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderEvent_dedupeKey_key" ON "ProviderEvent"("dedupeKey");
CREATE INDEX "ProviderConnection_domain_provider_idx" ON "ProviderConnection"("domain", "provider");
CREATE INDEX "ProviderConnection_status_idx" ON "ProviderConnection"("status");
CREATE INDEX "ProviderConnection_createdById_idx" ON "ProviderConnection"("createdById");
CREATE INDEX "ProviderSecret_connectionId_kind_idx" ON "ProviderSecret"("connectionId", "kind");
CREATE INDEX "ProviderEvent_connectionId_createdAt_idx" ON "ProviderEvent"("connectionId", "createdAt");
CREATE INDEX "ProviderEvent_provider_eventType_idx" ON "ProviderEvent"("provider", "eventType");
CREATE INDEX "ProviderEvent_status_idx" ON "ProviderEvent"("status");
CREATE UNIQUE INDEX "ExternalSyncCursor_connectionId_resourceType_key" ON "ExternalSyncCursor"("connectionId", "resourceType");
CREATE INDEX "ExternalSyncCursor_connectionId_idx" ON "ExternalSyncCursor"("connectionId");
CREATE INDEX "CommunicationAccount_connectionId_idx" ON "CommunicationAccount"("connectionId");
CREATE INDEX "CommunicationAccount_channel_status_idx" ON "CommunicationAccount"("channel", "status");
CREATE INDEX "CommunicationAccount_address_idx" ON "CommunicationAccount"("address");
CREATE UNIQUE INDEX "CommunicationGrant_accountId_employeeId_key" ON "CommunicationGrant"("accountId", "employeeId");
CREATE INDEX "CommunicationGrant_employeeId_idx" ON "CommunicationGrant"("employeeId");
CREATE UNIQUE INDEX "ContactIdentity_channel_value_key" ON "ContactIdentity"("channel", "value");
CREATE INDEX "ContactIdentity_contactId_idx" ON "ContactIdentity"("contactId");
CREATE UNIQUE INDEX "Conversation_accountId_externalThreadId_key" ON "Conversation"("accountId", "externalThreadId");
CREATE INDEX "Conversation_accountId_lastMessageAt_idx" ON "Conversation"("accountId", "lastMessageAt");
CREATE INDEX "Conversation_assigneeId_status_idx" ON "Conversation"("assigneeId", "status");
CREATE INDEX "Conversation_status_idx" ON "Conversation"("status");
CREATE INDEX "ConversationMessage_conversationId_createdAt_idx" ON "ConversationMessage"("conversationId", "createdAt");
CREATE INDEX "ConversationMessage_providerMessageId_idx" ON "ConversationMessage"("providerMessageId");
CREATE INDEX "FinanceAccount_connectionId_idx" ON "FinanceAccount"("connectionId");
CREATE INDEX "FinanceAccount_provider_status_idx" ON "FinanceAccount"("provider", "status");
CREATE INDEX "LedgerEntry_financeAccountId_occurredAt_idx" ON "LedgerEntry"("financeAccountId", "occurredAt");
CREATE INDEX "LedgerEntry_provider_externalRef_idx" ON "LedgerEntry"("provider", "externalRef");
CREATE INDEX "LedgerEntry_sourceType_sourceId_idx" ON "LedgerEntry"("sourceType", "sourceId");
CREATE INDEX "LedgerEntry_status_idx" ON "LedgerEntry"("status");

ALTER TABLE "ProviderConnection" ADD CONSTRAINT "ProviderConnection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProviderSecret" ADD CONSTRAINT "ProviderSecret_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ProviderConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderEvent" ADD CONSTRAINT "ProviderEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ProviderConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalSyncCursor" ADD CONSTRAINT "ExternalSyncCursor_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ProviderConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunicationAccount" ADD CONSTRAINT "CommunicationAccount_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ProviderConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunicationAccount" ADD CONSTRAINT "CommunicationAccount_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommunicationGrant" ADD CONSTRAINT "CommunicationGrant_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CommunicationAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunicationGrant" ADD CONSTRAINT "CommunicationGrant_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactIdentity" ADD CONSTRAINT "ContactIdentity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CommunicationAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceAccount" ADD CONSTRAINT "FinanceAccount_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ProviderConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceAccount" ADD CONSTRAINT "FinanceAccount_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_financeAccountId_fkey" FOREIGN KEY ("financeAccountId") REFERENCES "FinanceAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "EmployeeEmail" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3),
  "source" TEXT NOT NULL DEFAULT 'manual',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmployeeEmail_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmployeeEmail_email_key" ON "EmployeeEmail"("email");
CREATE INDEX "EmployeeEmail_employeeId_idx" ON "EmployeeEmail"("employeeId");
CREATE INDEX "EmployeeEmail_employeeId_isPrimary_idx" ON "EmployeeEmail"("employeeId", "isPrimary");
ALTER TABLE "EmployeeEmail" ADD CONSTRAINT "EmployeeEmail_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
