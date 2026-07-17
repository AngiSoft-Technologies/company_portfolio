-- CreateTable
CREATE TABLE "AboutSection" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AboutSection_order_idx" ON "AboutSection"("order");

-- CreateIndex
CREATE INDEX "AboutSection_published_idx" ON "AboutSection"("published");

-- CreateIndex
CREATE UNIQUE INDEX "AboutSection_key_key" ON "AboutSection"("key");
