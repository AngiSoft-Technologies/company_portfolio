-- Sync Prisma schema additions used by public content, staff profiles, client portal, and analytics.
-- This migration is intentionally defensive because production may already contain a subset of these objects.

-- Employee public profile fields
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "publicTitle" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "publicSummary" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "websiteUrl" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "linkedinUrl" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "twitterUrl" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "githubUrl" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "publicEmail" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "publicPhone" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "profilePublished" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "profileOrder" INTEGER NOT NULL DEFAULT 0;

-- Blog enrichment fields
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "coverImage" TEXT;
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "excerpt" TEXT;
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "readingTime" INTEGER;
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "seoTitle" TEXT;
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "seoDescription" TEXT;
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "views" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "likes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

-- Testimonial enrichment fields
ALTER TABLE "Testimonial" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
ALTER TABLE "Testimonial" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "Testimonial" ADD COLUMN IF NOT EXISTS "projectType" TEXT;
ALTER TABLE "Testimonial" ADD COLUMN IF NOT EXISTS "productId" TEXT;
ALTER TABLE "Testimonial" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Testimonial" ADD COLUMN IF NOT EXISTS "rejected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Testimonial" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "Testimonial" ADD COLUMN IF NOT EXISTS "adminReply" TEXT;
ALTER TABLE "Testimonial" ADD COLUMN IF NOT EXISTS "helpfulCount" INTEGER NOT NULL DEFAULT 0;

-- Blog category/comment/reaction support
CREATE TABLE IF NOT EXISTS "BlogCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "BlogCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BlogCategory_name_key" ON "BlogCategory"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "BlogCategory_slug_key" ON "BlogCategory"("slug");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BlogPost_categoryId_fkey'
  ) THEN
    ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "BlogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "BlogComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT,
    "parentId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "body" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlogComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BlogComment_postId_idx" ON "BlogComment"("postId");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BlogComment_postId_fkey'
  ) THEN
    ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_postId_fkey"
      FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "BlogReaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'like',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlogReaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BlogReaction_postId_visitorKey_key" ON "BlogReaction"("postId", "visitorKey");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BlogReaction_postId_fkey'
  ) THEN
    ALTER TABLE "BlogReaction" ADD CONSTRAINT "BlogReaction_postId_fkey"
      FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Testimonial reactions
CREATE TABLE IF NOT EXISTS "ReviewReaction" (
    "id" TEXT NOT NULL,
    "testimonialId" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'helpful',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewReaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ReviewReaction_testimonialId_visitorKey_key" ON "ReviewReaction"("testimonialId", "visitorKey");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ReviewReaction_testimonialId_fkey'
  ) THEN
    ALTER TABLE "ReviewReaction" ADD CONSTRAINT "ReviewReaction_testimonialId_fkey"
      FOREIGN KEY ("testimonialId") REFERENCES "Testimonial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Analytics
CREATE TABLE IF NOT EXISTS "PageView" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PageView_path_createdAt_idx" ON "PageView"("path", "createdAt");

CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");
