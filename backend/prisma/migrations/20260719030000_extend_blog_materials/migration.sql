-- Extend Booking with required publicReference + trackingToken (backfill legacy row)
-- and add material-type / visibility fields to BlogPost.
-- Written to be re-runnable (guards on existence) because the first attempt
-- partially applied before failing on gen_random_bytes().

-- 1. Booking columns + backfill (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Booking' AND column_name = 'publicReference'
  ) THEN
    ALTER TABLE "Booking" ADD COLUMN "publicReference" TEXT NOT NULL DEFAULT 'ANG-2026-00001';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Booking' AND column_name = 'trackingToken'
  ) THEN
    ALTER TABLE "Booking" ADD COLUMN "trackingToken" TEXT NOT NULL DEFAULT 'pending-token';
  END IF;
END $$;

UPDATE "Booking"
SET
  "publicReference" = 'ANG-2026-00001',
  "trackingToken" = replace(text(gen_random_uuid()), '-', '')
WHERE "trackingToken" = 'pending-token' OR "trackingToken" IS NULL;

ALTER TABLE "Booking" ALTER COLUMN "publicReference" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "trackingToken" DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS "Booking_publicReference_key" ON "Booking"("publicReference");
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_trackingToken_key" ON "Booking"("trackingToken");

-- 2. BlogPost: material-type + visibility + related resource links (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'BlogPost' AND column_name = 'subtitle') THEN
    ALTER TABLE "BlogPost" ADD COLUMN "subtitle" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'BlogPost' AND column_name = 'contentType') THEN
    ALTER TABLE "BlogPost" ADD COLUMN "contentType" TEXT NOT NULL DEFAULT 'article';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'BlogPost' AND column_name = 'mediaUrl') THEN
    ALTER TABLE "BlogPost" ADD COLUMN "mediaUrl" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'BlogPost' AND column_name = 'transcript') THEN
    ALTER TABLE "BlogPost" ADD COLUMN "transcript" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'BlogPost' AND column_name = 'visibilityType') THEN
    ALTER TABLE "BlogPost" ADD COLUMN "visibilityType" TEXT NOT NULL DEFAULT 'permanent';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'BlogPost' AND column_name = 'visibleUntil') THEN
    ALTER TABLE "BlogPost" ADD COLUMN "visibleUntil" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'BlogPost' AND column_name = 'resourceLinks') THEN
    ALTER TABLE "BlogPost" ADD COLUMN "resourceLinks" JSONB;
  END IF;
END $$;
