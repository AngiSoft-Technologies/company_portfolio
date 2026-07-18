-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PRIVATE', 'INTERNAL', 'PUBLIC');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'FILLED', 'ON_HOLD', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SalaryVisibility" AS ENUM ('HIDDEN', 'RANGE', 'EXACT');

-- AlterTable
ALTER TABLE "AboutSection" ALTER COLUMN "content" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Announcement" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Certification" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ChatConversation" ADD COLUMN     "deviceFingerprint" TEXT;

-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ClientProject" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CompanyStat" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "department" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "joinYear" INTEGER,
ADD COLUMN     "profileVisibility" "ProfileVisibility" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "seniorityLevel" TEXT;

-- AlterTable
ALTER TABLE "HomePageSection" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN     "applicationDeadline" TIMESTAMP(3),
ADD COLUMN     "employmentType" TEXT,
ADD COLUMN     "experienceLevel" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "openings" INTEGER DEFAULT 1,
ADD COLUMN     "preferredQualifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "salaryCurrency" TEXT NOT NULL DEFAULT 'KES',
ADD COLUMN     "salaryMax" INTEGER,
ADD COLUMN     "salaryMin" INTEGER,
ADD COLUMN     "salaryVisibility" "SalaryVisibility" NOT NULL DEFAULT 'RANGE',
ADD COLUMN     "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "workplaceType" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Lead" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProductFaq" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProductInquiry" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProjectComment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProjectDeliverable" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProjectMilestone" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StaffBlog" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SupportTicket" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "ChatConversation_deviceFingerprint_idx" ON "ChatConversation"("deviceFingerprint");

-- CreateIndex
CREATE INDEX "JobPosting_status_idx" ON "JobPosting"("status");

-- CreateIndex
CREATE INDEX "JobPosting_department_idx" ON "JobPosting"("department");

-- CreateIndex
CREATE INDEX "JobPosting_featured_idx" ON "JobPosting"("featured");
