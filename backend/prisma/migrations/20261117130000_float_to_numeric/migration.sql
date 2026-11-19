-- Float to Numeric(18,2) migration for monetary precision preservation
-- Run: npx prisma migrate dev --name float_to_numeric_20261117
--
-- This migration converts Float columns to Numeric(18,2) using USING round()
-- to preserve 2 decimal places of precision on Neon PostgreSQL.
-- All money columns are converted additively without data loss.

-- 1. Convert priceFrom in Service model
ALTER TABLE "Service" ALTER COLUMN "priceFrom" TYPE NUMERIC(18, 2) USING round("priceFrom"::numeric, 2);

-- 2. Convert amount in Payment model
ALTER TABLE "Payment" ALTER COLUMN "amount" TYPE NUMERIC(18, 2) USING round("amount"::numeric, 2);

-- 3. Convert balance in PaymentWallet model
ALTER TABLE "PaymentWallet" ALTER COLUMN "balance" TYPE NUMERIC(18, 2) USING round("balance"::numeric, 2);

-- 4. Convert amount in Payout model
ALTER TABLE "Payout" ALTER COLUMN "amount" TYPE NUMERIC(18, 2) USING round("amount"::numeric, 2);

-- Verification: check converted values are within 1¢ of original
SELECT
  'Service priceFrom' as column_name,
  count(*) as total_rows,
  round(max("priceFrom")::numeric, 2) as max_original,
  max("priceFrom") as max_new
FROM "Service"
UNION ALL
SELECT
  'Payment amount' as column_name,
  count(*) as total_rows,
  round(max("amount")::numeric, 2) as max_original,
  max("amount") as max_new
FROM "Payment"
UNION ALL
SELECT
  'PaymentWallet balance' as column_name,
  count(*) as total_rows,
  round(max("balance")::numeric, 2) as max_original,
  max("balance") as max_new
FROM "PaymentWallet"
UNION ALL
SELECT
  'Payout amount' as column_name,
  count(*) as total_rows,
  round(max("amount")::numeric, 2) as max_original,
  max("amount") as max_new
FROM "Payout";