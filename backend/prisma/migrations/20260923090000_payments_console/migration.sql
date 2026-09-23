-- Payments console: in-app PayHero/Paystack account management.
-- Hand-written to stay additive-only (schema/migrations drift exists from
-- earlier db pushes, so `migrate dev` reset was NOT an option on live Neon).

-- AlterTable: Payment gains our external reference (reconciliation key for
-- provider transaction ledgers) and the channel linkage for multi-account routing.
ALTER TABLE "Payment" ADD COLUMN     "reference" TEXT,
ADD COLUMN     "channelId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "Payment_clientId_idx" ON "Payment"("clientId");

-- CreateIndex
CREATE INDEX "Payment_provider_idx" ON "Payment"("provider");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_provider_status_createdAt_idx" ON "Payment"("provider", "status", "createdAt");

-- CreateTable
CREATE TABLE "PaymentChannel" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PAYHERO',
    "providerChannelId" TEXT,
    "channelType" TEXT NOT NULL,
    "shortCode" TEXT,
    "accountNumber" TEXT,
    "accountId" TEXT,
    "transactionType" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "idempotencyKey" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentChannel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentChannel_providerChannelId_key" ON "PaymentChannel"("providerChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentChannel_idempotencyKey_key" ON "PaymentChannel"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentChannel_provider_isActive_idx" ON "PaymentChannel"("provider", "isActive");

-- CreateIndex
CREATE INDEX "PaymentChannel_channelType_idx" ON "PaymentChannel"("channelType");

-- CreateTable
CREATE TABLE "PaymentWallet" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PAYHERO',
    "walletType" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "name" TEXT,
    "meta" JSONB,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentWallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWallet_provider_walletType_key" ON "PaymentWallet"("provider", "walletType");

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PAYHERO',
    "reference" TEXT NOT NULL,
    "providerReference" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "channel" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "accountNumber" TEXT,
    "networkCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payout_reference_key" ON "Payout"("reference");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE INDEX "Payout_provider_idx" ON "Payout"("provider");

-- CreateIndex
CREATE INDEX "Payout_createdAt_idx" ON "Payout"("createdAt");

-- CreateIndex
CREATE INDEX "Payout_provider_status_idx" ON "Payout"("provider", "status");

-- CreateIndex
CREATE INDEX "Payout_status_createdAt_idx" ON "Payout"("status", "createdAt");
