-- Full ERP/HR closeout: recruiting, employment/client contracts and sales orders.
-- Additive only (CREATE TABLE / CREATE INDEX). This file is committed as a
-- planned migration and has NOT been applied to the live Neon branch. Apply it
-- only through the normal `prisma db migrate` flow against a reviewed target.
-- Stages/statuses are TEXT (like Booking.currentStage) so the vocabulary can
-- grow without another migration. Cross-entity ids are plain TEXT, matching the
-- other additive HR tables (Expense, LeaveRequest, Payslip, ...).

CREATE TABLE IF NOT EXISTS "JobRequisition" (
  "id" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "department" TEXT,
  "location" TEXT,
  "employmentType" TEXT NOT NULL DEFAULT 'full-time',
  "openings" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "hiringManagerId" TEXT,
  "jobPostingId" TEXT,
  "budgetAmount" DECIMAL(18,2),
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "description" TEXT,
  "notes" TEXT,
  "createdById" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobRequisition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "JobRequisition_publicReference_key" ON "JobRequisition"("publicReference");
CREATE INDEX IF NOT EXISTS "JobRequisition_status_idx" ON "JobRequisition"("status");
CREATE INDEX IF NOT EXISTS "JobRequisition_hiringManagerId_idx" ON "JobRequisition"("hiringManagerId");
CREATE INDEX IF NOT EXISTS "JobRequisition_createdAt_idx" ON "JobRequisition"("createdAt");

CREATE TABLE IF NOT EXISTS "Candidate" (
  "id" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "source" TEXT,
  "requisitionId" TEXT,
  "jobPostingId" TEXT,
  "stage" TEXT NOT NULL DEFAULT 'new',
  "rating" INTEGER,
  "assignedToId" TEXT,
  "expectedSalary" DECIMAL(18,2),
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "notes" TEXT,
  "rejectionReason" TEXT,
  "appliedAt" TIMESTAMP(3),
  "hiredAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Candidate_publicReference_key" ON "Candidate"("publicReference");
CREATE INDEX IF NOT EXISTS "Candidate_email_idx" ON "Candidate"("email");
CREATE INDEX IF NOT EXISTS "Candidate_stage_idx" ON "Candidate"("stage");
CREATE INDEX IF NOT EXISTS "Candidate_requisitionId_idx" ON "Candidate"("requisitionId");
CREATE INDEX IF NOT EXISTS "Candidate_assignedToId_idx" ON "Candidate"("assignedToId");
CREATE INDEX IF NOT EXISTS "Candidate_createdAt_idx" ON "Candidate"("createdAt");

CREATE TABLE IF NOT EXISTS "Offer" (
  "id" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "requisitionId" TEXT,
  "contractId" TEXT,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "salaryAmount" DECIMAL(18,2),
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "startDate" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "decisionNote" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Offer_publicReference_key" ON "Offer"("publicReference");
CREATE INDEX IF NOT EXISTS "Offer_candidateId_idx" ON "Offer"("candidateId");
CREATE INDEX IF NOT EXISTS "Offer_requisitionId_idx" ON "Offer"("requisitionId");
CREATE INDEX IF NOT EXISTS "Offer_status_idx" ON "Offer"("status");
CREATE INDEX IF NOT EXISTS "Offer_createdAt_idx" ON "Offer"("createdAt");

CREATE TABLE IF NOT EXISTS "Contract" (
  "id" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'employment',
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "partyName" TEXT,
  "partyEmail" TEXT,
  "employeeId" TEXT,
  "clientId" TEXT,
  "candidateId" TEXT,
  "offerId" TEXT,
  "requisitionId" TEXT,
  "valueAmount" DECIMAL(18,2),
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "signedAt" TIMESTAMP(3),
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "terms" JSONB,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Contract_publicReference_key" ON "Contract"("publicReference");
CREATE UNIQUE INDEX IF NOT EXISTS "Contract_number_key" ON "Contract"("number");
CREATE INDEX IF NOT EXISTS "Contract_kind_idx" ON "Contract"("kind");
CREATE INDEX IF NOT EXISTS "Contract_status_idx" ON "Contract"("status");
CREATE INDEX IF NOT EXISTS "Contract_employeeId_idx" ON "Contract"("employeeId");
CREATE INDEX IF NOT EXISTS "Contract_clientId_idx" ON "Contract"("clientId");
CREATE INDEX IF NOT EXISTS "Contract_candidateId_idx" ON "Contract"("candidateId");
CREATE INDEX IF NOT EXISTS "Contract_offerId_idx" ON "Contract"("offerId");
CREATE INDEX IF NOT EXISTS "Contract_createdAt_idx" ON "Contract"("createdAt");

CREATE TABLE IF NOT EXISTS "SalesOrder" (
  "id" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "clientId" TEXT,
  "quoteId" TEXT,
  "bookingId" TEXT,
  "contractId" TEXT,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "orderedAt" TIMESTAMP(3),
  "fulfilledAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdById" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SalesOrder_publicReference_key" ON "SalesOrder"("publicReference");
CREATE UNIQUE INDEX IF NOT EXISTS "SalesOrder_number_key" ON "SalesOrder"("number");
CREATE INDEX IF NOT EXISTS "SalesOrder_clientId_idx" ON "SalesOrder"("clientId");
CREATE INDEX IF NOT EXISTS "SalesOrder_quoteId_idx" ON "SalesOrder"("quoteId");
CREATE INDEX IF NOT EXISTS "SalesOrder_bookingId_idx" ON "SalesOrder"("bookingId");
CREATE INDEX IF NOT EXISTS "SalesOrder_contractId_idx" ON "SalesOrder"("contractId");
CREATE INDEX IF NOT EXISTS "SalesOrder_status_idx" ON "SalesOrder"("status");
CREATE INDEX IF NOT EXISTS "SalesOrder_createdAt_idx" ON "SalesOrder"("createdAt");

CREATE TABLE IF NOT EXISTS "SalesOrderLineItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "lineTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "serviceId" TEXT,
  "productId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesOrderLineItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SalesOrderLineItem_orderId_idx" ON "SalesOrderLineItem"("orderId");
