-- Add new fields to Service model to support service categorization and details

ALTER TABLE "Service" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'General';
ALTER TABLE "Service" ADD COLUMN "targetAudience" TEXT;
ALTER TABLE "Service" ADD COLUMN "scope" TEXT;

-- Add index on category for faster filtering
CREATE INDEX "Service_category_idx" ON "Service"("category");
CREATE INDEX "Service_published_category_idx" ON "Service"("published", "category");
