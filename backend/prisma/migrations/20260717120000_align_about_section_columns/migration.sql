-- AlterTable: align AboutSection columns with the frontend's buildAboutFromSections contract.
-- The React hook (useAboutPage.js) reads `enabled` (replaces `published`) and
-- `sortOrder` (replaces `order`). Renaming preserves existing seeded rows.

ALTER TABLE "AboutSection" RENAME COLUMN "order" TO "sortOrder";
ALTER TABLE "AboutSection" RENAME COLUMN "published" TO "enabled";

-- Drop old indexes and recreate for the renamed columns.
DROP INDEX "AboutSection_order_idx";
DROP INDEX "AboutSection_published_idx";
CREATE INDEX "AboutSection_sortOrder_idx" ON "AboutSection"("sortOrder");
CREATE INDEX "AboutSection_enabled_idx" ON "AboutSection"("enabled");
