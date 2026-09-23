-- Add the CompanyStat columns that exist in schema.prisma but were
-- never captured in a migration. In dev these were applied implicitly
-- (migrate dev synced the local DB), so production — which only runs
-- `migrate deploy` against committed migrations — was missing them,
-- causing P2022 "column does not exist" on GET /api/company-stats.
ALTER TABLE "CompanyStat" ADD COLUMN IF NOT EXISTS "valueType" TEXT NOT NULL DEFAULT 'plain';
ALTER TABLE "CompanyStat" ADD COLUMN IF NOT EXISTS "prefix" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanyStat" ADD COLUMN IF NOT EXISTS "use_grouping" BOOLEAN;
