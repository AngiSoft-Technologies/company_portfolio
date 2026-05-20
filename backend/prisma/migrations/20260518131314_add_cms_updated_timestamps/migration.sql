-- Add updatedAt fields used by admin-managed public content screens.
-- Defensive because some deployed databases may not yet have these newer public-content tables.
DO $$
BEGIN
  IF to_regclass('public."Announcement"') IS NOT NULL THEN
    ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
  IF to_regclass('public."Certification"') IS NOT NULL THEN
    ALTER TABLE "Certification" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
  IF to_regclass('public."CompanyStat"') IS NOT NULL THEN
    ALTER TABLE "CompanyStat" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
  IF to_regclass('public."ProductFaq"') IS NOT NULL THEN
    ALTER TABLE "ProductFaq" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
