-- Additive assignment-scope models for services and the testimonial review queue.
-- Planned/on-disk only: this file has NOT been applied to any live Neon branch.
-- Apply through the normal reviewed `prisma db migrate` flow. No FK constraints
-- are added yet, mirroring the existing additive HR tables; ids are plain TEXT
-- so the contract stays compatible with the current ORM facade.

CREATE TABLE IF NOT EXISTS "ServiceTeamMember" (
  "id" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "roleInService" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceTeamMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceTeamMember_serviceId_employeeId_key" ON "ServiceTeamMember"("serviceId", "employeeId");
CREATE INDEX IF NOT EXISTS "ServiceTeamMember_employeeId_idx" ON "ServiceTeamMember"("employeeId");
CREATE INDEX IF NOT EXISTS "ServiceTeamMember_serviceId_idx" ON "ServiceTeamMember"("serviceId");

CREATE TABLE IF NOT EXISTS "TestimonialReviewAssignment" (
  "id" TEXT NOT NULL,
  "testimonialId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "assignedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TestimonialReviewAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TestimonialReviewAssignment_testimonialId_employeeId_key" ON "TestimonialReviewAssignment"("testimonialId", "employeeId");
CREATE INDEX IF NOT EXISTS "TestimonialReviewAssignment_employeeId_idx" ON "TestimonialReviewAssignment"("employeeId");
CREATE INDEX IF NOT EXISTS "TestimonialReviewAssignment_testimonialId_idx" ON "TestimonialReviewAssignment"("testimonialId");
