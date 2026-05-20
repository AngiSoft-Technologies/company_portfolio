-- Align Client table with current Prisma schema used by booking and client portal routes.
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
