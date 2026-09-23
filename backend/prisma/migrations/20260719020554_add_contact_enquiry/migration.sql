-- CreateTable
CREATE TABLE "ContactEnquiry" (
    "id" TEXT NOT NULL,
    "publicReference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "preferredResponseMethod" TEXT NOT NULL DEFAULT 'email',
    "enquiryType" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "serviceId" TEXT,
    "productId" TEXT,
    "bookingId" TEXT,
    "bookingReference" TEXT,
    "organisation" TEXT,
    "source" TEXT,
    "sourcePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "assignedStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "ContactEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactEnquiry_publicReference_key" ON "ContactEnquiry"("publicReference");
CREATE INDEX "ContactEnquiry_enquiryType_idx" ON "ContactEnquiry"("enquiryType");
CREATE INDEX "ContactEnquiry_status_idx" ON "ContactEnquiry"("status");
CREATE INDEX "ContactEnquiry_bookingReference_idx" ON "ContactEnquiry"("bookingReference");

-- Foreign keys (optional relations, SET NULL on delete)
ALTER TABLE "ContactEnquiry" ADD CONSTRAINT "ContactEnquiry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContactEnquiry" ADD CONSTRAINT "ContactEnquiry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContactEnquiry" ADD CONSTRAINT "ContactEnquiry_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
