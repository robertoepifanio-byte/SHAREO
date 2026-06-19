-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'COUPON_EARNED';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "discountCents" INTEGER;

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "percentOff" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'review_reward',
    "sourceBookingId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_bookingId_key" ON "coupons"("bookingId");

-- CreateIndex
CREATE INDEX "coupons_userId_usedAt_idx" ON "coupons"("userId", "usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_userId_sourceBookingId_key" ON "coupons"("userId", "sourceBookingId");

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
