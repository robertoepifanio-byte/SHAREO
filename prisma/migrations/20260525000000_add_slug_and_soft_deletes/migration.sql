-- AlterTable: add slug to items (nullable unique)
ALTER TABLE "items" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "items_slug_key" ON "items"("slug");

-- AlterTable: soft delete on bookings
ALTER TABLE "bookings" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: soft delete on messages
ALTER TABLE "messages" ADD COLUMN "deletedAt" TIMESTAMP(3);
