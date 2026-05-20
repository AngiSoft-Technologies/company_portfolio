-- Align existing public content tables with the current Prisma schema.
-- This fixes runtime 500s where Prisma Client selects columns that older databases never received.

-- Service fields used by public services and service details
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'KES';
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "seoTitle" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "seoDesc" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

-- Project fields used by public projects/category pages
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "industry" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "seoTitle" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "seoDesc" TEXT;

-- Blog enrichment fields used by public blog listing/detail
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "seoKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;

-- Employee public resume/profile additions used by staff/public profile features
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "cvUrl" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "portfolioUrl" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "experienceJson" JSONB;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "educationJson" JSONB;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "resumePublished" BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Service_categoryId_fkey') THEN
    ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
