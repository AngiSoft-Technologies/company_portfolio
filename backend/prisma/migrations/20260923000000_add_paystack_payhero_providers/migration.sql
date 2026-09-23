-- Add Paystack and PayHero as supported payment providers.
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'PAYSTACK';
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'PAYHERO';