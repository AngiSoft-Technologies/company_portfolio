-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "additionalEmails" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL;
