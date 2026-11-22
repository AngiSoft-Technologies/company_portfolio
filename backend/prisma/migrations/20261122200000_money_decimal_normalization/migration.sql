ALTER TABLE "Booking" ALTER COLUMN "priceEstimate" TYPE DECIMAL(18,2) USING CASE WHEN "priceEstimate" IS NULL THEN NULL ELSE ROUND("priceEstimate"::numeric,2) END;
ALTER TABLE "ClientProject" ALTER COLUMN "budgetAmount" TYPE DECIMAL(18,2) USING CASE WHEN "budgetAmount" IS NULL THEN NULL ELSE ROUND("budgetAmount"::numeric,2) END;
ALTER TABLE "ClientProject" ALTER COLUMN "quotedAmount" TYPE DECIMAL(18,2) USING CASE WHEN "quotedAmount" IS NULL THEN NULL ELSE ROUND("quotedAmount"::numeric,2) END;
ALTER TABLE "Payment" ALTER COLUMN "amount" TYPE DECIMAL(18,2) USING ROUND("amount"::numeric,2);
ALTER TABLE "PaymentWallet" ALTER COLUMN "balance" TYPE DECIMAL(18,2) USING ROUND(COALESCE("balance",0)::numeric,2);
ALTER TABLE "PaymentWallet" ALTER COLUMN "balance" SET DEFAULT 0;
ALTER TABLE "Payout" ALTER COLUMN "amount" TYPE DECIMAL(18,2) USING ROUND("amount"::numeric,2);
ALTER TABLE "Service" ALTER COLUMN "priceFrom" TYPE DECIMAL(18,2) USING CASE WHEN "priceFrom" IS NULL THEN NULL ELSE ROUND("priceFrom"::numeric,2) END;
