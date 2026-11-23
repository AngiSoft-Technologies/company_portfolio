-- Phase 2 product slices: project delivery, finance, HR performance and
-- marketing/content operations. LOCAL EVIDENCE ONLY — additive
-- (CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS), no destructive SQL.
-- This migration has NOT been applied to any live Neon branch. Apply only
-- through the reviewed `prisma db migrate` flow against a disposable target.
-- Money/rate columns are DECIMAL(18,2); stage/status vocabularies are TEXT so
-- they can grow without another migration. Cross-entity ids are plain TEXT.

CREATE TABLE IF NOT EXISTS "ProjectTemplate" (
  "id" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "projectType" TEXT,
  "stage" TEXT NOT NULL DEFAULT 'draft',
  "milestones" JSONB,
  "deliverables" JSONB,
  "checklist" JSONB,
  "estimateHours" INTEGER NOT NULL DEFAULT 0,
  "rateAmount" DECIMAL(18,2),
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "published" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectTemplate_key_key" ON "ProjectTemplate"("key");
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectTemplate_publicReference_key" ON "ProjectTemplate"("publicReference");
CREATE INDEX IF NOT EXISTS "ProjectTemplate_stage_idx" ON "ProjectTemplate"("stage");
CREATE INDEX IF NOT EXISTS "ProjectTemplate_createdAt_idx" ON "ProjectTemplate"("createdAt");

CREATE TABLE IF NOT EXISTS "EmployeeCapacity" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "weeklyHours" INTEGER NOT NULL DEFAULT 40,
  "availableHours" INTEGER NOT NULL DEFAULT 0,
  "allocatedHours" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'open',
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmployeeCapacity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EmployeeCapacity_employeeId_periodStart_idx" ON "EmployeeCapacity"("employeeId", "periodStart");
CREATE INDEX IF NOT EXISTS "EmployeeCapacity_status_idx" ON "EmployeeCapacity"("status");
CREATE INDEX IF NOT EXISTS "EmployeeCapacity_period_idx" ON "EmployeeCapacity"("periodStart", "periodEnd");

CREATE TABLE IF NOT EXISTS "ProjectChangeRequest" (
  "id" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "clientProjectId" TEXT NOT NULL,
  "requestedById" TEXT,
  "title" TEXT NOT NULL,
  "reason" TEXT,
  "impact" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "costImpact" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "dayImpact" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "decisionNote" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectChangeRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectChangeRequest_publicReference_key" ON "ProjectChangeRequest"("publicReference");
CREATE INDEX IF NOT EXISTS "ProjectChangeRequest_clientProjectId_status_idx" ON "ProjectChangeRequest"("clientProjectId", "status");
CREATE INDEX IF NOT EXISTS "ProjectChangeRequest_status_idx" ON "ProjectChangeRequest"("status");
CREATE INDEX IF NOT EXISTS "ProjectChangeRequest_createdAt_idx" ON "ProjectChangeRequest"("createdAt");

CREATE TABLE IF NOT EXISTS "ProjectRisk" (
  "id" TEXT NOT NULL,
  "clientProjectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'delivery',
  "likelihood" INTEGER NOT NULL DEFAULT 1,
  "impact" INTEGER NOT NULL DEFAULT 1,
  "score" INTEGER NOT NULL DEFAULT 1,
  "severity" TEXT NOT NULL DEFAULT 'low',
  "status" TEXT NOT NULL DEFAULT 'open',
  "ownerId" TEXT,
  "mitigation" TEXT,
  "targetDate" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectRisk_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ProjectRisk_clientProjectId_status_idx" ON "ProjectRisk"("clientProjectId", "status");
CREATE INDEX IF NOT EXISTS "ProjectRisk_severity_idx" ON "ProjectRisk"("severity");
CREATE INDEX IF NOT EXISTS "ProjectRisk_status_idx" ON "ProjectRisk"("status");

CREATE TABLE IF NOT EXISTS "ProjectRetrospective" (
  "id" TEXT NOT NULL,
  "clientProjectId" TEXT NOT NULL,
  "facilitatorId" TEXT,
  "period" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "whatWentWell" TEXT,
  "whatCouldImprove" TEXT,
  "lessons" JSONB,
  "actionItems" JSONB,
  "sharedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectRetrospective_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ProjectRetrospective_clientProjectId_status_idx" ON "ProjectRetrospective"("clientProjectId", "status");
CREATE INDEX IF NOT EXISTS "ProjectRetrospective_status_idx" ON "ProjectRetrospective"("status");
CREATE INDEX IF NOT EXISTS "ProjectRetrospective_createdAt_idx" ON "ProjectRetrospective"("createdAt");

CREATE TABLE IF NOT EXISTS "ProjectSignOff" (
  "id" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "clientProjectId" TEXT NOT NULL,
  "clientId" TEXT,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "signedById" TEXT,
  "signedAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectSignOff_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectSignOff_publicReference_key" ON "ProjectSignOff"("publicReference");
CREATE INDEX IF NOT EXISTS "ProjectSignOff_clientProjectId_status_idx" ON "ProjectSignOff"("clientProjectId", "status");
CREATE INDEX IF NOT EXISTS "ProjectSignOff_status_idx" ON "ProjectSignOff"("status");

CREATE TABLE IF NOT EXISTS "CreditNote" (
  "id" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "invoiceId" TEXT,
  "clientId" TEXT,
  "reason" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "issuedAt" TIMESTAMP(3),
  "appliedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CreditNote_publicReference_key" ON "CreditNote"("publicReference");
CREATE UNIQUE INDEX IF NOT EXISTS "CreditNote_number_key" ON "CreditNote"("number");
CREATE INDEX IF NOT EXISTS "CreditNote_invoiceId_idx" ON "CreditNote"("invoiceId");
CREATE INDEX IF NOT EXISTS "CreditNote_clientId_idx" ON "CreditNote"("clientId");
CREATE INDEX IF NOT EXISTS "CreditNote_status_idx" ON "CreditNote"("status");

CREATE TABLE IF NOT EXISTS "TaxRate" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "rate" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "scope" TEXT NOT NULL DEFAULT 'all',
  "jurisdiction" TEXT,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TaxRate_key_key" ON "TaxRate"("key");
CREATE INDEX IF NOT EXISTS "TaxRate_scope_active_idx" ON "TaxRate"("scope", "active");
CREATE INDEX IF NOT EXISTS "TaxRate_createdAt_idx" ON "TaxRate"("createdAt");

CREATE TABLE IF NOT EXISTS "ArApEntry" (
  "id" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "clientId" TEXT,
  "vendor" TEXT,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "status" TEXT NOT NULL DEFAULT 'open',
  "dueAt" TIMESTAMP(3),
  "postedAt" TIMESTAMP(3),
  "settledAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArApEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ArApEntry_publicReference_key" ON "ArApEntry"("publicReference");
CREATE INDEX IF NOT EXISTS "ArApEntry_direction_status_idx" ON "ArApEntry"("direction", "status");
CREATE INDEX IF NOT EXISTS "ArApEntry_entity_idx" ON "ArApEntry"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "ArApEntry_clientId_idx" ON "ArApEntry"("clientId");
CREATE INDEX IF NOT EXISTS "ArApEntry_dueAt_idx" ON "ArApEntry"("dueAt");

CREATE TABLE IF NOT EXISTS "CommissionEntry" (
  "id" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "period" TEXT,
  "basisAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "rate" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "approvedById" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommissionEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CommissionEntry_publicReference_key" ON "CommissionEntry"("publicReference");
CREATE INDEX IF NOT EXISTS "CommissionEntry_employeeId_status_idx" ON "CommissionEntry"("employeeId", "status");
CREATE INDEX IF NOT EXISTS "CommissionEntry_period_idx" ON "CommissionEntry"("period");
CREATE INDEX IF NOT EXISTS "CommissionEntry_status_idx" ON "CommissionEntry"("status");

CREATE TABLE IF NOT EXISTS "PerformanceReview" (
  "id" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "reviewerId" TEXT,
  "period" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "rating" INTEGER,
  "strengths" TEXT,
  "improvements" TEXT,
  "summary" TEXT,
  "goals" JSONB,
  "submittedAt" TIMESTAMP(3),
  "acknowledgedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PerformanceReview_publicReference_key" ON "PerformanceReview"("publicReference");
CREATE INDEX IF NOT EXISTS "PerformanceReview_employeeId_period_idx" ON "PerformanceReview"("employeeId", "period");
CREATE INDEX IF NOT EXISTS "PerformanceReview_reviewerId_idx" ON "PerformanceReview"("reviewerId");
CREATE INDEX IF NOT EXISTS "PerformanceReview_status_idx" ON "PerformanceReview"("status");

CREATE TABLE IF NOT EXISTS "Goal" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "reviewId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "goalType" TEXT NOT NULL DEFAULT 'individual',
  "targetAmount" DECIMAL(18,2),
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "dueAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'draft',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "achievedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Goal_employeeId_status_idx" ON "Goal"("employeeId", "status");
CREATE INDEX IF NOT EXISTS "Goal_reviewId_idx" ON "Goal"("reviewId");
CREATE INDEX IF NOT EXISTS "Goal_status_idx" ON "Goal"("status");

CREATE TABLE IF NOT EXISTS "TrainingRecord" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "provider" TEXT,
  "category" TEXT,
  "completedAt" TIMESTAMP(3),
  "hours" INTEGER,
  "costAmount" DECIMAL(18,2),
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "status" TEXT NOT NULL DEFAULT 'completed',
  "certificateUrl" TEXT,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrainingRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TrainingRecord_employeeId_status_idx" ON "TrainingRecord"("employeeId", "status");
CREATE INDEX IF NOT EXISTS "TrainingRecord_completedAt_idx" ON "TrainingRecord"("completedAt");
CREATE INDEX IF NOT EXISTS "TrainingRecord_status_idx" ON "TrainingRecord"("status");

CREATE TABLE IF NOT EXISTS "DirectoryPrivacySetting" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "phoneVisible" BOOLEAN NOT NULL DEFAULT false,
  "emailVisible" BOOLEAN NOT NULL DEFAULT true,
  "locationVisible" BOOLEAN NOT NULL DEFAULT false,
  "profileVisible" BOOLEAN NOT NULL DEFAULT true,
  "searchable" BOOLEAN NOT NULL DEFAULT true,
  "updatedById" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DirectoryPrivacySetting_pkey" PRIMARY KEY ("id")
);


CREATE TABLE IF NOT EXISTS "Offboarding" (
  "id" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "requestedById" TEXT,
  "reason" TEXT,
  "lastWorkingDay" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'draft',
  "checklist" JSONB,
  "handoverNotes" TEXT,
  "accessRevokedAt" TIMESTAMP(3),
  "exitInterviewAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Offboarding_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Offboarding_publicReference_key" ON "Offboarding"("publicReference");
CREATE INDEX IF NOT EXISTS "Offboarding_employeeId_status_idx" ON "Offboarding"("employeeId", "status");
CREATE INDEX IF NOT EXISTS "Offboarding_status_idx" ON "Offboarding"("status");

CREATE TABLE IF NOT EXISTS "Campaign" (
  "id" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "channel" TEXT,
  "objective" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "budgetAmount" DECIMAL(18,2),
  "spendAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "ownerId" TEXT,
  "goals" JSONB,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Campaign_publicReference_key" ON "Campaign"("publicReference");
CREATE INDEX IF NOT EXISTS "Campaign_status_idx" ON "Campaign"("status");
CREATE INDEX IF NOT EXISTS "Campaign_ownerId_idx" ON "Campaign"("ownerId");
CREATE INDEX IF NOT EXISTS "Campaign_period_idx" ON "Campaign"("startDate", "endDate");

CREATE TABLE IF NOT EXISTS "ContentCalendarEntry" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT,
  "briefId" TEXT,
  "title" TEXT NOT NULL,
  "channel" TEXT,
  "contentType" TEXT NOT NULL DEFAULT 'post',
  "status" TEXT NOT NULL DEFAULT 'planned',
  "scheduledAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "ownerId" TEXT,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentCalendarEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ContentCalendarEntry_campaignId_scheduledAt_idx" ON "ContentCalendarEntry"("campaignId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "ContentCalendarEntry_status_scheduledAt_idx" ON "ContentCalendarEntry"("status", "scheduledAt");
CREATE INDEX IF NOT EXISTS "ContentCalendarEntry_ownerId_idx" ON "ContentCalendarEntry"("ownerId");

CREATE TABLE IF NOT EXISTS "ContentBrief" (
  "id" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "campaignId" TEXT,
  "title" TEXT NOT NULL,
  "objective" TEXT,
  "audience" TEXT,
  "tone" TEXT,
  "keyMessages" JSONB,
  "requiredAssets" JSONB,
  "wordCount" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentBrief_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ContentBrief_publicReference_key" ON "ContentBrief"("publicReference");
CREATE INDEX IF NOT EXISTS "ContentBrief_campaignId_status_idx" ON "ContentBrief"("campaignId", "status");
CREATE INDEX IF NOT EXISTS "ContentBrief_status_idx" ON "ContentBrief"("status");

CREATE TABLE IF NOT EXISTS "AssetLibraryItem" (
  "id" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "assetType" TEXT NOT NULL DEFAULT 'image',
  "url" TEXT NOT NULL,
  "mime" TEXT,
  "sizeBytes" INTEGER,
  "tags" TEXT[] NOT NULL DEFAULT '{}',
  "campaignId" TEXT,
  "ownerId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssetLibraryItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AssetLibraryItem_publicReference_key" ON "AssetLibraryItem"("publicReference");
CREATE INDEX IF NOT EXISTS "AssetLibraryItem_assetType_status_idx" ON "AssetLibraryItem"("assetType", "status");
CREATE INDEX IF NOT EXISTS "AssetLibraryItem_campaignId_idx" ON "AssetLibraryItem"("campaignId");
CREATE INDEX IF NOT EXISTS "AssetLibraryItem_ownerId_idx" ON "AssetLibraryItem"("ownerId");

CREATE TABLE IF NOT EXISTS "AttributionLink" (
  "id" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "destinationUrl" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "conversions" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'active',
  "expiresAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AttributionLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AttributionLink_publicReference_key" ON "AttributionLink"("publicReference");
CREATE UNIQUE INDEX IF NOT EXISTS "AttributionLink_token_key" ON "AttributionLink"("token");
CREATE INDEX IF NOT EXISTS "AttributionLink_campaignId_status_idx" ON "AttributionLink"("campaignId", "status");
CREATE INDEX IF NOT EXISTS "AttributionLink_status_idx" ON "AttributionLink"("status");
